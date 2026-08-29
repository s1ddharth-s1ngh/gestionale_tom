import { AlertTriangle } from '@/components/ui/icons';
import type { DatiFatturazioneElettronica as DatiFE } from '@/types/fattura';

interface DatiFatturazioneElettronicaProps {
  dati?: DatiFE;
}

/**
 * I campi della fattura elettronica, in sola lettura.
 *
 * L'avviso in testa non è decorativo ed è la ragione per cui questa sezione
 * esiste in questa forma: i dati ci sono, ma **niente viene trasmesso a
 * nessuno**. Senza scriverlo in pagina, chi la guarda dà per scontato che la
 * fattura sia partita allo SdI — e se ne accorge a fine trimestre.
 */
export function DatiFatturazioneElettronica({ dati }: DatiFatturazioneElettronicaProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-start gap-2.5 rounded-xl border border-amber-500/30 bg-amber-500/15 p-3">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
        <p className="text-[12.5px] leading-relaxed text-amber-200/90">
          Questi campi sono <strong className="font-semibold">solo predisposti</strong>. Il gestionale
          non genera l'XML e non trasmette niente allo SdI: la fattura va inviata dal canale che
          usi oggi.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <Campo label="Codice destinatario" valore={dati?.codiceDestinatario} mono />
        <Campo label="PEC destinatario" valore={dati?.pecDestinatario} />
        <Campo label="Tipo documento" valore={dati?.tipoDocumento} mono />
        <Campo label="Regime fiscale" valore={dati?.regimeFiscale} mono />
        <Campo label="Riferimento amministrazione" valore={dati?.riferimentoAmministrazione} />
        <Campo
          label="Scissione dei pagamenti"
          valore={dati?.scissionePagamenti ? 'Sì — split payment' : undefined}
        />
      </div>
    </div>
  );
}

function Campo({ label, valore, mono }: { label: string; valore?: string; mono?: boolean }) {
  return (
    <div className="space-y-1">
      <div className="text-[10px] font-medium uppercase tracking-[0.04em] text-white/40">{label}</div>
      <div className={`text-[13px] text-white ${mono ? 'font-mono' : ''}`}>
        {valore || <span className="font-sans italic text-white/30">—</span>}
      </div>
    </div>
  );
}
