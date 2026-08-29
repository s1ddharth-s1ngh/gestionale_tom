import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DarkTable,
  DarkTableBody,
  DarkTableCell,
  DarkTableHead,
  DarkTableHeader,
  DarkTableRow,
} from '@/components/ui/dark-table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, TreeEvergreen, Trash2 } from '@/components/ui/icons';
import { nomiSpecie } from '@/mocks/specieAlberi';
import { nuovoId } from '@/lib/utils';
import type { Lavorazione, RilievoAlbero } from '@/types/preventivo';
import { LAVORAZIONI, lavorazioneLabel } from '@/types/preventivo';

/** Id del `<datalist>`: uno solo per pagina, non uno per riga. */
const DATALIST_SPECIE = 'specie-alberi';

interface RilievoAlberiTableProps {
  value: RilievoAlbero[];
  onChange: (alberi: RilievoAlbero[]) => void;
  disabled?: boolean;
}

/**
 * Il rilievo del sopralluogo: un albero per riga, con quello che determina il
 * prezzo. Altezza e diametro non sono decorazione — sono ciò che decide se
 * serve la piattaforma aerea o il tree climbing, e quindi mezza giornata di
 * differenza.
 *
 * È una tabella EDITABILE dentro un form, non una lista di sola lettura: si
 * compila in cantiere col telefono in mano, e ogni campo in più da aprire è un
 * campo che non verrà compilato.
 */
export function RilievoAlberiTable({ value, onChange, disabled }: RilievoAlberiTableProps) {
  const aggiungi = () => {
    onChange([
      ...value,
      {
        id: nuovoId(),
        specie: '',
        altezzaM: 0,
        diametroCm: 0,
        // Uno: si rileva un albero alla volta, e zero costringerebbe a
        // correggere ogni riga appena creata.
        quantita: 1,
        lavorazione: 'potatura',
      },
    ]);
  };

  const modifica = (id: string, patch: Partial<RilievoAlbero>) => {
    onChange(value.map((a) => (a.id === id ? { ...a, ...patch } : a)));
  };

  const rimuovi = (id: string) => onChange(value.filter((a) => a.id !== id));

  return (
    <div className="space-y-3">
      {/* Un solo datalist per tutte le righe: replicarlo per riga moltiplica
          trenta option per il numero di alberi rilevati. */}
      <datalist id={DATALIST_SPECIE}>
        {nomiSpecie.map((n) => (
          <option key={n} value={n} />
        ))}
      </datalist>

      <DarkTable
        empty={value.length === 0}
        emptyIcon={TreeEvergreen}
        emptyMessage="Nessun albero rilevato"
        emptyDescription="Aggiungi gli alberi visti in sopralluogo: specie, altezza e diametro decidono la squadra e i mezzi."
        tableClassName="min-w-[860px]"
      >
        <DarkTableHeader>
          <DarkTableHead>Specie</DarkTableHead>
          <DarkTableHead align="right">Altezza (m)</DarkTableHead>
          <DarkTableHead align="right">Ø fusto (cm)</DarkTableHead>
          <DarkTableHead align="right">Q.tà</DarkTableHead>
          <DarkTableHead>Lavorazione</DarkTableHead>
          <DarkTableHead>Note</DarkTableHead>
          <DarkTableHead />
        </DarkTableHeader>

        <DarkTableBody>
          {value.map((a, i) => (
            <DarkTableRow key={a.id} zebraIndex={i}>
              <DarkTableCell className="min-w-[200px]">
                <Input
                  list={DATALIST_SPECIE}
                  value={a.specie}
                  disabled={disabled}
                  onChange={(e) => modifica(a.id, { specie: e.target.value })}
                  placeholder="es. Cedro dell'Atlante"
                  aria-label={`Specie dell'albero ${i + 1}`}
                />
              </DarkTableCell>

              <DarkTableCell align="right">
                <Input
                  type="number"
                  min={0}
                  step={0.5}
                  value={a.altezzaM || ''}
                  disabled={disabled}
                  onChange={(e) => modifica(a.id, { altezzaM: Number(e.target.value) })}
                  className="w-[90px] text-right tabular-nums"
                  aria-label={`Altezza dell'albero ${i + 1}`}
                />
              </DarkTableCell>

              <DarkTableCell align="right">
                <Input
                  type="number"
                  min={0}
                  value={a.diametroCm || ''}
                  disabled={disabled}
                  onChange={(e) => modifica(a.id, { diametroCm: Number(e.target.value) })}
                  className="w-[90px] text-right tabular-nums"
                  aria-label={`Diametro dell'albero ${i + 1}`}
                />
              </DarkTableCell>

              <DarkTableCell align="right">
                <Input
                  type="number"
                  min={1}
                  value={a.quantita || ''}
                  disabled={disabled}
                  onChange={(e) => modifica(a.id, { quantita: Number(e.target.value) })}
                  className="w-[72px] text-right tabular-nums"
                  aria-label={`Quantità della riga ${i + 1}`}
                />
              </DarkTableCell>

              <DarkTableCell className="min-w-[170px]">
                <Select
                  value={a.lavorazione}
                  disabled={disabled}
                  onValueChange={(v) => modifica(a.id, { lavorazione: v as Lavorazione })}
                >
                  <SelectTrigger aria-label={`Lavorazione della riga ${i + 1}`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LAVORAZIONI.map((l) => (
                      <SelectItem key={l} value={l}>
                        {lavorazioneLabel(l)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </DarkTableCell>

              <DarkTableCell className="min-w-[220px]">
                <Input
                  value={a.note ?? ''}
                  disabled={disabled}
                  onChange={(e) => modifica(a.id, { note: e.target.value || undefined })}
                  placeholder="Carie, inclinazione, cavità…"
                  aria-label={`Note dell'albero ${i + 1}`}
                />
              </DarkTableCell>

              <DarkTableCell align="right">
                <Button
                  variant="ghost"
                  size="icon"
                  disabled={disabled}
                  onClick={() => rimuovi(a.id)}
                  aria-label={`Rimuovi l'albero ${i + 1}`}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </DarkTableCell>
            </DarkTableRow>
          ))}
        </DarkTableBody>
      </DarkTable>

      {/* `type="button"` è il default del nostro Button, ed è quello che evita
          il classico «il form si è salvato da solo cliccando Aggiungi». */}
      <Button variant="secondary" size="sm" onClick={aggiungi} disabled={disabled}>
        <Plus className="h-3.5 w-3.5" />
        Aggiungi albero
      </Button>
    </div>
  );
}
