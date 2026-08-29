import { FotoGallery } from '@/components/shared/FotoGallery';
import { FotoUploader } from '@/components/shared/FotoUploader';
import { cn } from '@/lib/utils';
import type { Foto } from '@/types/comune';

interface FotoPrimaDopoProps {
  prima: Foto[];
  dopo: Foto[];
  onPrima: (foto: Foto[]) => void;
  onDopo: (foto: Foto[]) => void;
  /** Su una commessa chiusa o annullata le foto si guardano e basta. */
  readOnly?: boolean;
  className?: string;
}

/**
 * Le foto prima e dopo, affiancate.
 *
 * Due colonne e non due sezioni una sotto l'altra: il prima e il dopo si
 * giudicano confrontandoli, e se per vedere il dopo bisogna scorrere, il
 * confronto lo fa la memoria invece dell'occhio. Sotto `lg` tornano impilate,
 * perché due griglie di miniature in mezza colonna di telefono non si vedono
 * comunque.
 */
export function FotoPrimaDopo({
  prima,
  dopo,
  onPrima,
  onDopo,
  readOnly,
  className,
}: FotoPrimaDopoProps) {
  return (
    <div className={cn('grid gap-4 lg:grid-cols-2', className)}>
      <Colonna
        titolo="Prima"
        // Lo stato vuoto dice a chi apre la scheda cosa manca e quando serviva
        // farlo: "nessuna foto" da solo non distingue il non fatto dal non ancora.
        vuoto="Nessuna foto prima dell'intervento"
        foto={prima}
        onChange={onPrima}
        readOnly={readOnly}
      />
      <Colonna
        titolo="Dopo"
        vuoto="Nessuna foto a lavoro finito"
        foto={dopo}
        onChange={onDopo}
        readOnly={readOnly}
      />
    </div>
  );
}

function Colonna({
  titolo,
  vuoto,
  foto,
  onChange,
  readOnly,
}: {
  titolo: string;
  vuoto: string;
  foto: Foto[];
  onChange: (foto: Foto[]) => void;
  readOnly?: boolean;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-baseline justify-between">
        <h3 className="text-[11px] font-semibold uppercase tracking-wider text-white/45">
          {titolo}
        </h3>
        {foto.length > 0 && (
          <span className="text-[11px] tabular-nums text-white/30">{foto.length}</span>
        )}
      </div>

      <FotoGallery
        foto={foto}
        messaggioVuoto={vuoto}
        onRimuovi={
          readOnly ? undefined : (id) => onChange(foto.filter((f) => f.id !== id))
        }
      />

      {!readOnly && <FotoUploader foto={foto} onChange={onChange} />}
    </div>
  );
}
