import { PageHeader } from '@/components/ui/page-header';
import { DarkSection } from '@/components/ui/dark-section';
import { TableEmptyState } from '@/components/ui/table-empty-state';
import type { LucideIcon } from '@/components/ui/icons';

/**
 * Segnaposto di una pagina non ancora scritta.
 *
 * Serve a due cose: tenere navigabile lo shell fin dal primo giorno, e dare a
 * ogni chat un file già al posto giusto da riempire. Chi prende in carico il
 * modulo sostituisce il contenuto del file — la rotta funziona già.
 *
 * Va via man mano che i moduli arrivano: quando non lo importa più nessuno,
 * questo file si cancella.
 */
export function InCostruzione({
  titolo,
  sottotitolo,
  icona,
  lavoro,
}: {
  titolo: string;
  sottotitolo: string;
  icona: LucideIcon;
  /** Quale chat la sta scrivendo, così si sa a chi chiedere. */
  lavoro: string;
}) {
  return (
    <div className="space-y-5 p-3">
      <PageHeader title={titolo} subtitle={sottotitolo} />
      <DarkSection>
        <TableEmptyState
          icon={icona}
          title="Schermata in costruzione"
          description={`Arriva con il lavoro ${lavoro}. Lo shell e le rotte funzionano già: quando la pagina è pronta compare qui, senza toccare altro.`}
        />
      </DarkSection>
    </div>
  );
}
