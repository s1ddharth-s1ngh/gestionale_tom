import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { FormField } from '@/components/ui/form-field';
import { SectionBox } from '@/components/ui/entity-drawer';
import { Spinner } from '@/components/ui/spinner';
import { AlertTriangle } from '@/components/ui/icons';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { RigheFatturaFornitoreTable } from '@/components/costi/RigheFatturaFornitoreTable';
import { useTuttiFornitori } from '@/hooks/useFornitori';
import { useCreaFatturaFornitore } from '@/hooks/useFattureFornitore';
import type { RigaFatturaFornitore } from '@/types/fatturaFornitore';
import { GIORNI_PAGAMENTO_DEFAULT } from '@/types/fatturaFornitore';

function iso(piuGiorni = 0): string {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() + piuGiorni);
  return d.toISOString().slice(0, 10);
}

/**
 * Registrazione manuale di una fattura fornitore.
 *
 * È una pagina e non un drawer: le righe sono la parte grossa del documento, e
 * in un pannello da 640px la tabella scorrerebbe in orizzontale mentre si
 * ricopia dalla carta. La via veloce resta l'import dell'XML — questa è per
 * quello che arriva via email o in busta.
 *
 * La fattura nasce sempre in **bozza**: registrarla significa dire «questa
 * spesa è nostra», ed è un gesto separato dal salvataggio, perché è quello che
 * la fa entrare nello scadenzario e in contabilità.
 */
export default function FatturaFornitoreNuova() {
  const navigate = useNavigate();
  const fornitori = useTuttiFornitori();
  const crea = useCreaFatturaFornitore();

  const [fornitoreId, setFornitoreId] = useState('');
  const [numero, setNumero] = useState('');
  const [dataDocumento, setDataDocumento] = useState(iso());
  const [dataRicezione, setDataRicezione] = useState(iso());
  const [dataScadenza, setDataScadenza] = useState(iso(GIORNI_PAGAMENTO_DEFAULT));
  const [righe, setRighe] = useState<RigaFatturaFornitore[]>([]);
  const [note, setNote] = useState('');
  const [errore, setErrore] = useState<string | null>(null);

  // Il DB lo impone con `chk_date_coerenti`, ma dirlo mentre si digita evita di
  // scoprirlo al salvataggio: quasi sempre è un errore di battitura sull'anno.
  const dateIncoerenti = dataRicezione < dataDocumento;

  const salva = async () => {
    setErrore(null);
    if (!fornitoreId) return setErrore('Scegli il fornitore.');
    if (!numero.trim()) return setErrore('Indica il numero che il fornitore ha messo sul documento.');
    if (dateIncoerenti) {
      return setErrore('La data di ricezione non può precedere quella del documento.');
    }

    try {
      const creata = await crea.mutateAsync({
        fornitoreId,
        numero: numero.trim(),
        dataDocumento,
        dataRicezione,
        dataScadenza,
        righe,
        note: note.trim() || undefined,
      });
      toast.success(`Fattura ${creata.numero} salvata in bozza`);
      navigate(`/costi/fatture/${creata.id}`);
    } catch (e) {
      setErrore(e instanceof Error ? e.message : 'Salvataggio non riuscito.');
    }
  };

  return (
    <div className="space-y-5 p-3">
      <PageHeader
        breadcrumb={{ to: '/costi/fatture', label: 'Fatture fornitore' }}
        eyebrow="Nuova fattura ricevuta"
        title="Registra una fattura fornitore"
        subtitle="Nasce in bozza. Registrarla è il gesto che la fa entrare nello scadenzario."
        actions={
          <>
            <Button variant="secondary" size="md" onClick={() => navigate('/costi/fatture')}>
              Annulla
            </Button>
            <Button variant="primary" size="md" disabled={crea.isPending} onClick={salva}>
              {crea.isPending && <Spinner size="sm" />}
              {crea.isPending ? 'Salvataggio…' : 'Salva bozza'}
            </Button>
          </>
        }
      />

      {errore && (
        <div className="flex items-start gap-2 rounded-xl border border-red-500/20 bg-red-500/[0.06] p-3">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-300/80" />
          <p className="whitespace-pre-line text-[12.5px] leading-relaxed text-red-200/90">
            {errore}
          </p>
        </div>
      )}

      <SectionBox title="Il documento">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <FormField label="Fornitore" obbligatorio>
            <Select value={fornitoreId} onValueChange={setFornitoreId}>
              <SelectTrigger aria-label="Fornitore">
                <SelectValue placeholder="Scegli il fornitore" />
              </SelectTrigger>
              <SelectContent>
                {(fornitori.data ?? []).map((f) => (
                  <SelectItem key={f.id} value={f.id}>
                    {f.denominazione}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>

          <FormField
            label="Numero"
            obbligatorio
            htmlFor="ff-numero"
            hint="Quello che c’è sul documento del fornitore: nessun formato imposto."
          >
            <Input
              id="ff-numero"
              value={numero}
              onChange={(e) => setNumero(e.target.value)}
              className="font-mono"
              placeholder="es. 2026/318"
            />
          </FormField>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
          <FormField label="Data documento" obbligatorio htmlFor="ff-doc">
            <Input
              id="ff-doc"
              type="date"
              value={dataDocumento}
              onChange={(e) => setDataDocumento(e.target.value)}
            />
          </FormField>

          <FormField
            label="Data di ricezione"
            obbligatorio
            htmlFor="ff-ric"
            error={dateIncoerenti ? 'Non può precedere il documento.' : undefined}
            hint={
              !dateIncoerenti
                ? 'Quando è arrivata a noi: la differenza è il ritardo con cui ce ne siamo accorti.'
                : undefined
            }
          >
            <Input
              id="ff-ric"
              type="date"
              value={dataRicezione}
              onChange={(e) => setDataRicezione(e.target.value)}
            />
          </FormField>

          <FormField
            label="Scadenza"
            htmlFor="ff-scad"
            hint={`Proposta: ${GIORNI_PAGAMENTO_DEFAULT} giorni. Serve per registrarla.`}
          >
            <Input
              id="ff-scad"
              type="date"
              value={dataScadenza}
              onChange={(e) => setDataScadenza(e.target.value)}
            />
          </FormField>
        </div>
      </SectionBox>

      <SectionBox title="Righe">
        <RigheFatturaFornitoreTable value={righe} onChange={setRighe} />
      </SectionBox>

      <SectionBox title="Note">
        <Textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Quello che serve ricordare su questo documento: contestazioni, note di credito attese, accordi sul pagamento."
        />
      </SectionBox>
    </div>
  );
}
