import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Receipt } from '@/components/ui/icons';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/ui/page-header';
import { DarkSection } from '@/components/ui/dark-section';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ClienteSelect } from '@/components/shared/ClienteSelect';
import { EmettiDaCommessaDialog } from '@/components/fatture/EmettiDaCommessaDialog';
import { RigheFatturaTable, RIGA_VUOTA, type RigaBozza } from '@/components/fatture/RigheFatturaTable';
import { useCreaFattura } from '@/hooks/useFatture';
import type { TipoFattura } from '@/types/fattura';

const INPUT_CLS =
  'bg-white/[0.04] border-white/[0.08] text-white h-8 text-sm placeholder:text-white/25 focus-visible:ring-white/10 rounded-lg';

/** Trenta giorni data fattura è il termine di gran lunga più usato. */
const GIORNI_PAGAMENTO = 30;

function oggiIso(): string {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  return d.toISOString().slice(0, 10);
}

function fraGiorni(giorni: number): string {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() + giorni);
  return d.toISOString().slice(0, 10);
}

/**
 * Nuova fattura, a mano.
 *
 * Il percorso normale è «emetti da commessa», che compila tutto da solo: sta
 * qui come bottone in testata perché è da questa pagina che si arriva quando
 * si vuole fatturare, non da un menù nascosto altrove.
 *
 * Salvare come bozza NON mette la data di emissione: è quel campo, e non uno
 * `stato` scritto a mano, a distinguere una bozza da una fattura emessa.
 */
export default function FatturaNuova() {
  const navigate = useNavigate();
  const crea = useCreaFattura();

  const [clienteId, setClienteId] = useState('');
  const [tipo, setTipo] = useState<TipoFattura>('unica');
  const [dataScadenza, setDataScadenza] = useState(fraGiorni(GIORNI_PAGAMENTO));
  const [righe, setRighe] = useState<RigaBozza[]>([{ ...RIGA_VUOTA }]);
  const [note, setNote] = useState('');
  const [daCommessa, setDaCommessa] = useState(false);
  const [errori, setErrori] = useState<{ cliente?: string; righe?: string }>({});

  function valida(): boolean {
    const prossimi: typeof errori = {};
    if (!clienteId) prossimi.cliente = 'Scegli il cliente da fatturare.';
    if (righe.length === 0 || righe.every((r) => !r.descrizione.trim() || r.prezzoUnitario <= 0)) {
      prossimi.righe = 'Serve almeno una riga con descrizione e prezzo.';
    }
    setErrori(prossimi);
    return Object.keys(prossimi).length === 0;
  }

  function salva(emetti: boolean) {
    if (!valida()) return;

    crea.mutate(
      {
        tipo,
        clienteId,
        righe: righe.filter((r) => r.descrizione.trim() && r.prezzoUnitario > 0),
        dataEmissione: emetti ? oggiIso() : undefined,
        dataScadenza: emetti ? dataScadenza : undefined,
        note: note.trim() || undefined,
      },
      {
        onSuccess: (fattura) => {
          toast.success(emetti ? `Fattura ${fattura.numero} emessa` : 'Bozza salvata');
          navigate(`/fatture/${fattura.id}`);
        },
        onError: () => toast.error('Impossibile salvare la fattura'),
      },
    );
  }

  return (
    <div className="space-y-5 p-3">
      <PageHeader
        breadcrumb={{ to: '/fatture', label: 'Fatture' }}
        title="Nuova fattura"
        subtitle="Compila le righe, oppure parti da una commessa completata"
        actions={
          <>
            <Button variant="secondary" size="md" onClick={() => setDaCommessa(true)}>
              <Receipt className="h-3.5 w-3.5" />
              Emetti da commessa
            </Button>
            <Button variant="secondary" size="md" onClick={() => salva(false)} disabled={crea.isPending}>
              Salva come bozza
            </Button>
            <Button variant="primary" size="md" onClick={() => salva(true)} disabled={crea.isPending}>
              {crea.isPending ? 'Salvataggio…' : 'Emetti'}
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        <div className="space-y-5 lg:col-span-8">
          <DarkSection title="Righe">
            <RigheFatturaTable righe={righe} onChange={setRighe} errore={errori.righe} />
          </DarkSection>

          <DarkSection title="Note" hint="Compaiono in fattura">
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={4}
              placeholder="es. Split payment, CIG, riferimento alla determina…"
              className="rounded-lg border-white/[0.08] bg-white/[0.04] text-sm text-white placeholder:text-white/25"
            />
          </DarkSection>
        </div>

        <div className="space-y-5 lg:col-span-4">
          <DarkSection title="Intestazione">
            <div className="space-y-4">
              <FormField label="Cliente" obbligatorio error={errori.cliente}>
                <ClienteSelect value={clienteId} onChange={setClienteId} />
              </FormField>

              <FormField label="Tipo" obbligatorio>
                <Select value={tipo} onValueChange={(v) => setTipo(v as TipoFattura)}>
                  <SelectTrigger className={INPUT_CLS}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#15181B]">
                    <SelectItem value="unica">Fattura unica</SelectItem>
                    <SelectItem value="acconto">Acconto</SelectItem>
                    <SelectItem value="saldo">Saldo</SelectItem>
                  </SelectContent>
                </Select>
              </FormField>

              <FormField label="Scadenza" hint="Vale solo se emetti adesso: una bozza non scade.">
                <Input
                  type="date"
                  value={dataScadenza}
                  onChange={(e) => setDataScadenza(e.target.value)}
                  className={`${INPUT_CLS} tabular-nums`}
                />
              </FormField>
            </div>
          </DarkSection>
        </div>
      </div>

      <EmettiDaCommessaDialog
        open={daCommessa}
        onOpenChange={setDaCommessa}
        onEmessa={(id) => navigate(`/fatture/${id}`)}
      />
    </div>
  );
}
