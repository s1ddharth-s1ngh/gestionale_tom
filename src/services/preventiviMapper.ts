import type {
  Preventivo,
  PreventivoInput,
  RigaPreventivo,
  RilievoAlbero,
  SchedaSopralluogo,
} from '@/types/preventivo';
import {
  ALIQUOTA_IVA_DEFAULT,
  SOPRALLUOGO_VUOTO,
  calcolaImporto,
  calcolaTotali,
} from '@/types/preventivo';

/**
 * Traduzione fra le righe del database e i tipi dell'app.
 *
 * Stesso schema di `clientiMapper`: il DB parla snake_case, l'app camelCase, e
 * la traduzione sta QUI e non dentro il service — quando una colonna cambia
 * nome si tocca un file solo, e si vede subito cosa non è mappato.
 *
 * La particolarità dei preventivi è che sopralluogo e righe stanno in JSONB
 * (vedi il commento in testa a `db/002_preventivi.sql`): non si leggono mai
 * senza il preventivo che li contiene e nessuno li referenzia da fuori, quindi
 * farne tabelle costerebbe quattro join per aprire una scheda in cambio di una
 * normalizzazione che a nessuno serve. Il prezzo è che la loro forma non è
 * garantita dallo schema, e va difesa qui.
 */

/**
 * La riga come arriva da `v_preventivi`.
 *
 * È la VISTA e non la tabella: `stato_effettivo` e `cliente_denominazione` non
 * esistono in `preventivi`. Le letture passano da qui, le scritture vanno sulla
 * tabella — una vista con una join non è aggiornabile.
 */
export interface RigaPreventivoDb {
  id: string;
  numero: string;
  cliente_id: string;
  luogo_intervento_id: string | null;
  stato: string;
  /** Solo dalla vista: `stato` con il tempo che passa applicato sopra. */
  stato_effettivo?: string | null;
  /** Solo dalla vista: risparmia la join che prima faceva la pagina. */
  cliente_denominazione?: string | null;
  data_emissione: string;
  valido_fino: string | null;
  data_invio: string | null;
  data_esito: string | null;
  sopralluogo: unknown;
  righe: unknown;
  imponibile: number | string | null;
  aliquota_iva: number | string | null;
  totale: number | string | null;
  note: string | null;
  commessa_id: string | null;
  created_at: string;
  updated_at: string;
}

/** `null` dal DB diventa `undefined`: i tipi dell'app usano campi opzionali. */
const opt = (v: string | null | undefined): string | undefined => v ?? undefined;

/**
 * `numeric` di Postgres può arrivare come stringa quando la precisione supera
 * quella di un double. Senza questa coercizione i totali si concatenerebbero
 * invece di sommarsi, e il bug si vedrebbe solo sugli importi grandi.
 */
const numero = (v: number | string | null | undefined): number => {
  const n = typeof v === 'string' ? Number(v) : (v ?? 0);
  return Number.isFinite(n) ? n : 0;
};

/**
 * Una data da mostrare, tagliata a `AAAA-MM-GG`.
 *
 * `data_invio` e `data_esito` sono `timestamptz` ma a schermo sono date: senza
 * il taglio si porterebbero dietro ora e fuso, che nessuno mostra. Attenzione a
 * NON applicarlo dove non serve: `valido_fino` è già un `date`, e
 * `giorniAllaScadenza` ci appende `T12:00:00` contando su quel formato.
 */
const soloData = (v: string | null | undefined): string | undefined =>
  v ? v.slice(0, 10) : undefined;

/**
 * Il sopralluogo dal JSONB.
 *
 * La colonna ha `default '{}'`, quindi un preventivo creato da SQL senza scheda
 * arriva con un oggetto vuoto: senza i fallback, `sopralluogo.alberi.length`
 * esplode alla prima apertura della scheda. Lo schema non può garantire la
 * forma di un JSONB — la garantisce questo punto.
 */
export function sopralluogoDaJson(v: unknown): SchedaSopralluogo {
  const j = (v ?? {}) as Partial<SchedaSopralluogo>;
  return {
    dataSopralluogo: soloData(j.dataSopralluogo),
    accessibilita: j.accessibilita ?? SOPRALLUOGO_VUOTO.accessibilita,
    criticita: Array.isArray(j.criticita) ? j.criticita : [],
    noteTecniche: j.noteTecniche || undefined,
    foto: Array.isArray(j.foto) ? j.foto : [],
    alberi: Array.isArray(j.alberi) ? (j.alberi as RilievoAlbero[]) : [],
  };
}

/**
 * Le righe dal JSONB, con l'importo RICALCOLATO.
 *
 * L'importo non si salva: è quantità per prezzo, e tenerne una copia su disco
 * vorrebbe dire un secondo posto in cui il totale può divergere dalle righe che
 * dovrebbe riassumere. Vale la stessa regola che vale nella UI.
 */
export function righeDaJson(v: unknown): RigaPreventivo[] {
  if (!Array.isArray(v)) return [];
  return v.map((r, i) => {
    const riga = r as Partial<RigaPreventivo>;
    const base = {
      id: riga.id ?? `riga-${i + 1}`,
      descrizione: riga.descrizione ?? '',
      quantita: numero(riga.quantita),
      unita: riga.unita ?? 'nr',
      prezzoUnitario: numero(riga.prezzoUnitario),
    };
    return { ...base, importo: calcolaImporto(base) };
  });
}

export function preventivoDaRiga(r: RigaPreventivoDb): Preventivo {
  const righe = righeDaJson(r.righe);
  const aliquotaIva = numero(r.aliquota_iva);

  return {
    id: r.id,
    numero: r.numero,
    clienteId: r.cliente_id,
    // Lo schema ammette NULL (un preventivo può nascere prima che il luogo
    // esista), l'app no: stringa vuota, che le select leggono come "non scelto".
    luogoInterventoId: r.luogo_intervento_id ?? '',
    // `stato` e non `stato_effettivo`: il campo dell'app è quello DECISO da una
    // persona. Lo scaduto lo ricalcola `statoEffettivo()` a schermo, così la
    // regola resta una sola e vale anche sui record appena creati in memoria.
    stato: r.stato as Preventivo['stato'],
    dataEmissione: r.data_emissione,
    // `valido_fino` NON si taglia: è già un `date`, e tagliare una stringa
    // vuota darebbe undefined dove il tipo vuole una data.
    validoFino: r.valido_fino ?? r.data_emissione,
    dataInvio: soloData(r.data_invio),
    dataEsito: soloData(r.data_esito),
    sopralluogo: sopralluogoDaJson(r.sopralluogo),
    righe,
    // I totali si RICALCOLANO dalle righe invece di leggere le colonne
    // denormalizzate: quelle servono al database per ordinare senza sommare un
    // JSONB per riga, ma la verità sono le righe. Se le due cose divergono,
    // vince quello che il cliente legge sul documento.
    ...calcolaTotali(righe, aliquotaIva),
    aliquotaIva,
    note: opt(r.note),
    commessaId: opt(r.commessa_id),
    creatoIl: r.created_at,
    aggiornatoIl: r.updated_at,
  };
}

/** La denominazione del cliente, quando la riga arriva dalla vista. */
export function clienteDaRigaPreventivo(r: RigaPreventivoDb): string | undefined {
  return opt(r.cliente_denominazione);
}

/** Stringa vuota → NULL: un `luogo_intervento_id` a `''` non è un UUID valido. */
const vuotoANull = (v: string | undefined | null): string | null => {
  const t = (v ?? '').trim();
  return t.length > 0 ? t : null;
};

/**
 * Dall'app al database.
 *
 * Solo i campi presenti finiscono nell'oggetto: passare `undefined` significa
 * «non toccare questa colonna», e mandarla comunque a `null` cancellerebbe dati
 * che nessuno ha chiesto di cancellare. È lo stesso patto di `rigaDaCliente`.
 */
export function rigaDaPreventivo(
  p: Partial<PreventivoInput>,
  /**
   * L'aliquota già sul record, per il caso in cui si aggiornino le righe senza
   * toccarla. Senza, un aggiornamento di sole righe su un preventivo al 10%
   * riscriverebbe i totali al 22% — e il documento smetterebbe di tornare.
   */
  aliquotaEsistente?: number,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};

  if (p.clienteId !== undefined) out.cliente_id = p.clienteId;
  if (p.luogoInterventoId !== undefined) out.luogo_intervento_id = vuotoANull(p.luogoInterventoId);
  if (p.dataEmissione !== undefined) out.data_emissione = p.dataEmissione;
  if (p.validoFino !== undefined) out.valido_fino = p.validoFino;
  if (p.note !== undefined) out.note = vuotoANull(p.note);
  if (p.aliquotaIva !== undefined) out.aliquota_iva = p.aliquotaIva;

  if (p.sopralluogo !== undefined) out.sopralluogo = p.sopralluogo;

  if (p.righe !== undefined) {
    // L'importo non si scrive: si ricalcola in lettura. Salvarlo creerebbe il
    // secondo posto in cui il totale può sbagliare.
    const righe = p.righe.map((r, i) => ({
      id: (r as Partial<RigaPreventivo>).id ?? `riga-${i + 1}`,
      descrizione: r.descrizione,
      quantita: r.quantita,
      unita: r.unita,
      prezzoUnitario: r.prezzoUnitario,
    }));
    out.righe = righe;

    // Le colonne denormalizzate si riscrivono a ogni scrittura delle righe,
    // o l'ordinamento per importo dell'elenco lavora su numeri vecchi.
    const { imponibile, totale } = calcolaTotali(
      righe,
      p.aliquotaIva ?? aliquotaEsistente ?? ALIQUOTA_IVA_DEFAULT,
    );
    out.imponibile = imponibile;
    out.totale = totale;
  }

  return out;
}
