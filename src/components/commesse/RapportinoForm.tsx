import React from 'react';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { StatusPill } from '@/components/ui/status-pill';
import { Textarea } from '@/components/ui/textarea';
import { X } from '@/components/ui/icons';
import { formatData, formatOre } from '@/lib/formatters';
import type { Commessa, Rapportino } from '@/types/commessa';
import { FirmaCliente } from './FirmaCliente';

interface RapportinoFormProps {
  commessa: Commessa;
  onSalva: (rapportino: Rapportino) => void;
  salvataggioInCorso?: boolean;
  /** Su una commessa annullata il rapportino si legge e basta. */
  readOnly?: boolean;
}

/** Oggi in ISO `AAAA-MM-GG`, come tutte le date del progetto. */
function oggi(): string {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  return d.toISOString().slice(0, 10);
}

/**
 * Il rapportino di fine lavoro, quello che si firma sul posto.
 *
 * La firma non è un campo come gli altri: salvare con la firma CHIUDE la
 * commessa e spunta tutte le lavorazioni (lo fa il service). Per questo il
 * bottone dice cosa sta per succedere invece di dire «Salva» — chi firma deve
 * sapere che sta chiudendo, non scoprirlo dopo guardando lo stato.
 *
 * Le ore lavorate qui NON diventano le ore reali della commessa: quelle
 * arrivano dalle lavorazioni. È il totale che il cliente vede e controfirma, e
 * tenerlo separato è l'unico modo perché firmare un numero sbagliato non
 * sporchi il consuntivo.
 */
export function RapportinoForm({
  commessa,
  onSalva,
  salvataggioInCorso,
  readOnly,
}: RapportinoFormProps) {
  const esistente = commessa.rapportino;
  const firmato = !!esistente?.firmaCliente;

  const [dataCompilazione, setDataCompilazione] = React.useState(
    esistente?.dataCompilazione ?? oggi(),
  );
  const [oreLavorate, setOreLavorate] = React.useState(
    // Proposte dalle lavorazioni: sono già state consuntivate riga per riga, e
    // farle riscrivere a mano invita a un totale che non torna con le righe.
    String(esistente?.oreLavorate ?? commessa.oreReali ?? 0),
  );
  const [operatori, setOperatori] = React.useState<string[]>(esistente?.operatori ?? []);
  const [nuovoOperatore, setNuovoOperatore] = React.useState('');
  const [materialiUsati, setMaterialiUsati] = React.useState(esistente?.materialiUsati ?? '');
  const [noteCliente, setNoteCliente] = React.useState(esistente?.noteCliente ?? '');
  const [firma, setFirma] = React.useState<string | undefined>(esistente?.firmaCliente);

  // Una volta firmato il rapportino non si modifica più: è un documento
  // controfirmato, e cambiarlo dopo significa che la firma non valeva niente.
  const bloccato = readOnly || firmato;

  const aggiungiOperatore = () => {
    const nome = nuovoOperatore.trim();
    if (!nome || operatori.includes(nome)) {
      setNuovoOperatore('');
      return;
    }
    setOperatori((o) => [...o, nome]);
    setNuovoOperatore('');
  };

  const salva = () => {
    onSalva({
      dataCompilazione,
      oreLavorate: Number(oreLavorate) || 0,
      operatori,
      materialiUsati: materialiUsati.trim() || undefined,
      noteCliente: noteCliente.trim() || undefined,
      firmaCliente: firma,
      firmatoIl: firma ? new Date().toISOString() : undefined,
    });
  };

  return (
    <div className="space-y-5">
      {firmato && esistente?.firmatoIl && (
        <StatusPill accent="emerald">
          Firmato il {formatData(esistente.firmatoIl)}
        </StatusPill>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Data di compilazione">
          <Input
            type="date"
            value={dataCompilazione}
            disabled={bloccato}
            onChange={(e) => setDataCompilazione(e.target.value)}
          />
        </FormField>

        <FormField
          label="Ore lavorate"
          hint={`Consuntivate sulle lavorazioni: ${formatOre(commessa.oreReali)}`}
        >
          <Input
            type="number"
            min={0}
            step="0.5"
            className="tabular-nums"
            value={oreLavorate}
            disabled={bloccato}
            onChange={(e) => setOreLavorate(e.target.value)}
          />
        </FormField>
      </div>

      <FormField
        label="Operatori"
        hint={bloccato ? undefined : 'Invio per aggiungere'}
      >
        <div className="space-y-2">
          {operatori.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {operatori.map((nome) => (
                <span
                  key={nome}
                  className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.08] bg-white/[0.04] px-2.5 py-1 text-[11.5px] text-white/70"
                >
                  {nome}
                  {!bloccato && (
                    <button
                      type="button"
                      onClick={() => setOperatori((o) => o.filter((n) => n !== nome))}
                      className="text-white/35 transition-colors hover:text-white"
                      title={`Togli ${nome}`}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </span>
              ))}
            </div>
          )}
          {!bloccato && (
            <Input
              value={nuovoOperatore}
              placeholder="Nome dell'operatore…"
              onChange={(e) => setNuovoOperatore(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  aggiungiOperatore();
                }
              }}
              onBlur={aggiungiOperatore}
            />
          )}
          {bloccato && operatori.length === 0 && (
            <p className="text-[12px] text-white/30">Nessun operatore indicato</p>
          )}
        </div>
      </FormField>

      <FormField label="Materiali e mezzi usati">
        <Textarea
          rows={2}
          value={materialiUsati}
          disabled={bloccato}
          placeholder="Piattaforma aerea, cippatrice, sacchi ramaglia…"
          onChange={(e) => setMaterialiUsati(e.target.value)}
        />
      </FormField>

      <FormField label="Note del cliente">
        <Textarea
          rows={2}
          value={noteCliente}
          disabled={bloccato}
          placeholder="Quello che il cliente ha chiesto o segnalato sul posto"
          onChange={(e) => setNoteCliente(e.target.value)}
        />
      </FormField>

      <FormField
        label="Firma del cliente"
        hint={
          bloccato
            ? undefined
            : 'Firmando, la commessa si chiude e tutte le lavorazioni risultano fatte.'
        }
      >
        <FirmaCliente valore={firma} onChange={setFirma} disabled={bloccato} />
      </FormField>

      {!bloccato && (
        <div className="flex justify-end">
          <Button
            type="button"
            variant="primary"
            size="md"
            disabled={salvataggioInCorso}
            onClick={salva}
          >
            {salvataggioInCorso
              ? 'Salvataggio…'
              : firma
                ? 'Salva e chiudi la commessa'
                : 'Salva il rapportino'}
          </Button>
        </div>
      )}
    </div>
  );
}
