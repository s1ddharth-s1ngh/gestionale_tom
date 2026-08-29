import * as React from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';

/**
 * ConfirmDialog — la conferma prima di un'azione che non si annulla.
 * docs/DESIGN_SYSTEM.md §6.13.
 *
 * In Telebi questo blocco è ricopiato in ogni pagina che serve, con le stesse
 * classi ogni volta: qui è un componente. È l'unica AGGIUNTA strutturale al
 * design system, e non inventa niente — sono le sue classi.
 *
 *   <ConfirmDialog
 *     open={!!daEliminare}
 *     onOpenChange={(o) => !o && setDaEliminare(null)}
 *     title="Eliminare il cliente?"
 *     description={<>Il cliente <b>{nome}</b> verrà rimosso dall'archivio.</>}
 *     avviso="Ha 3 commesse collegate: resteranno senza cliente."
 *     confermaLabel="Elimina"
 *     variante="pericolo"
 *     inCorso={mut.isPending}
 *     onConferma={() => mut.mutate(id)}
 *   />
 */
interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: React.ReactNode;
  /**
   * La riga in ambra: la conseguenza che chi conferma potrebbe non aspettarsi.
   * Se non c'è una conseguenza sorprendente, si lascia vuota — un avviso
   * sempre presente smette di essere letto.
   */
  avviso?: React.ReactNode;
  confermaLabel?: string;
  annullaLabel?: string;
  /** 'pericolo' colora di rosso l'azione: cancellazioni e cose irreversibili. */
  variante?: 'normale' | 'pericolo';
  /** Salvataggio in corso: blocca dialog, annulla e conferma insieme. */
  inCorso?: boolean;
  onConferma: () => void;
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  avviso,
  confermaLabel = 'Conferma',
  annullaLabel = 'Annulla',
  variante = 'normale',
  inCorso = false,
  onConferma,
}: ConfirmDialogProps) {
  return (
    <AlertDialog
      open={open}
      // Mentre l'operazione è in volo il dialog non si chiude: sparire a metà
      // lascia chi guarda senza sapere se è andata a buon fine.
      onOpenChange={(o) => {
        if (!o && inCorso) return;
        onOpenChange(o);
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-2 text-[12.5px] text-white/65">
              {description && <div>{description}</div>}
              {avviso && <div className="text-amber-200/90">{avviso}</div>}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={inCorso}>{annullaLabel}</AlertDialogCancel>
          <AlertDialogAction
            disabled={inCorso}
            onClick={(e) => {
              // Senza preventDefault il dialog si chiude prima che la mutation
              // finisca, e lo stato "in corso" non si vede mai.
              e.preventDefault();
              onConferma();
            }}
            className={cn(
              variante === 'pericolo' && 'bg-red-600 hover:bg-red-700',
            )}
          >
            {inCorso ? 'Attendere…' : confermaLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
