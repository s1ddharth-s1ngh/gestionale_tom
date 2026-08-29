# Lavoro B — Preventivi

> Sei la **chat B**. Costruisci il modulo **Preventivi** del gestionale Tom.
> Le altre tre chat lavorano in parallelo sulla stessa cartella, su moduli diversi.
> Questo file è il tuo contratto: leggilo tutto prima di scrivere una riga.

**Cartella di lavoro:** `C:\Users\Samar\Documents\Work\MANUX\tom_gestionale`

---

## 1. Prima di iniziare — obbligatorio

Leggi, in quest'ordine:

1. `docs/DESIGN_SYSTEM.md` — palette, tipografia, spaziature, e i 17 pattern con il codice
   vero da cui copiare. **È normativo**: se stai per inventare un colore, una spaziatura o
   un pattern che lì non c'è, fermati e chiedi a Omar.
2. `docs/CONVENTIONS.md` — stack, cartelle, naming, e soprattutto §4, il layer dati.
3. `docs/PLAN.md` §Step 3 — il tuo step, con modello dati e note di costruzione.

Poi guarda il codice già scritto, che è il tuo riferimento di stile:

- `src/components/ui/` — il design system. **Non ne scrivi di nuovi**, li usi.
- `src/pages/clienti/ClientiList.tsx` e `ClienteDetail.tsx` — il modulo Clienti è la
  **implementazione di riferimento**. Lista, dettaglio, drawer e form lì sono già risolti:
  copiane la struttura invece di inventarne una seconda.

### Verifica che la fondazione ci sia

```bash
cd C:\Users\Samar\Documents\Work\MANUX\tom_gestionale
git log --oneline | grep -i "fondazione pronta"
```

Se non stampa niente, la chat A non ha ancora finito: **aspetta**. Senza fondazione
costruiresti su tipi e componenti che non esistono.

Controlla anche che l'app parta:

```bash
npm run dev
```

---

## 2. Cosa costruisci

Il ciclo di vita di un preventivo per lavori su alberi:

**bozza → inviato → accettato / rifiutato / scaduto**, con la scheda di sopralluogo
(foto, specie, altezza, diametro, accessibilità, criticità) e la conversione in commessa.

Sei **6 task, 6 commit**. Uno per volta, nell'ordine.

| # | Task | File principali |
|---|---|---|
| 3.1 | Tipi e mock | `types/preventivo.ts`, `mocks/preventivi.ts`, `mocks/specieAlberi.ts` |
| 3.2 | Service e hook | `services/preventiviService.ts`, `hooks/usePreventivi.ts` |
| 3.3 | Pagina elenco | `pages/preventivi/PreventiviList.tsx`, `components/preventivi/{PreventiviTable,PreventiviToolbar,StatoPreventivoBadge}.tsx` |
| 3.4 | Scheda sopralluogo | `pages/preventivi/PreventivoNuovo.tsx`, `components/preventivi/{SopralluogoForm,RilievoAlberiTable,CriticitaSelect}.tsx` |
| 3.5 | Righe e totali | `components/preventivi/RighePreventivoTable.tsx` |
| 3.6 | Dettaglio e conversione | `pages/preventivi/PreventivoDetail.tsx`, `components/preventivi/ConvertiInCommessaDialog.tsx` |

---

## 3. I file che possiedi

**Tuoi, nessun altro li tocca:**

```
src/types/preventivo.ts
src/mocks/preventivi.ts
src/mocks/specieAlberi.ts
src/services/preventiviService.ts
src/hooks/usePreventivi.ts
src/pages/preventivi/**
src/components/preventivi/**
```

**MAI toccare** (sono di altre chat o della fondazione — una modifica qui rompe il lavoro
di qualcun altro senza che se ne accorga):

```
src/App.tsx                    ← le tue rotte ci sono GIÀ
src/lib/**                     ← fondazione
src/index.css                  ← fondazione
src/components/ui/**           ← design system, chiuso
src/components/layout/**       ← shell
src/components/shared/**       ← condivisi (chat A)
src/types/{comune,cliente}.ts  ← contratti (chat A)
src/{services,hooks,mocks}/*clienti*   ← chat A
src/{types,services,hooks,mocks,pages,components}/**commesse**  ← chat C
src/**/**fatture**  src/**/**costi**   ← chat D
tailwind.config.ts  package.json       ← nessuno, senza chiedere
```

Se ti serve una modifica fuori dal tuo perimetro: **non farla, scrivi a Omar.**

---

## 4. I contratti su cui costruisci

Esistono già. Non riscriverli, importali.

```ts
// src/types/comune.ts
export interface Indirizzo { via: string; civico: string; cap: string; comune: string; provincia: string }
export interface Foto { id: string; dataUrl: string; didascalia?: string; caricataIl: string }
export interface Paginato<T> { righe: T[]; totale: number; pagina: number; perPagina: number }

// src/types/cliente.ts
export interface Cliente { id: string; tipo: TipoCliente; denominazione: string; /* … */ luoghiIntervento: LuogoIntervento[] }
export interface LuogoIntervento { id: string; etichetta: string; indirizzo: Indirizzo; accessoMezzi?: 'facile'|'medio'|'difficile' }

// src/services/clientiService.ts   — per popolare le select
clientiService.list(filtri?): Promise<Paginato<Cliente>>
clientiService.getById(id): Promise<Cliente | null>

// src/hooks/useClienti.ts
useClienti(filtri?)   useCliente(id)

// src/components/shared/
<ClienteSelect value onChange />              // combobox con ricerca
<LuogoInterventoSelect clienteId value onChange />
<FotoUploader foto onChange />                // input file + drop, nessuna dipendenza
<FotoGallery foto onRimuovi? />
<IndirizzoCard indirizzo />
```

### Le rotte esistono già

In `src/App.tsx` sono dichiarate e puntano a file segnaposto che **tu sostituisci**:

```
/preventivi          → pages/preventivi/PreventiviList.tsx
/preventivi/nuovo    → pages/preventivi/PreventivoNuovo.tsx
/preventivi/:id      → pages/preventivi/PreventivoDetail.tsx
```

Non serve registrare niente: scrivi il contenuto dei file, la rotta funziona.

---

## 5. Decisioni già prese — non richiederle

- **Niente dipendenze nuove.** Il caricamento foto è un `<input type="file">` con i drag
  handler scritti a mano: `FotoUploader` esiste già, lo usi e basta.
- **Le foto dei mock sono `data:` URI** o file in `public/mocks/`. Mai URL esterni: offline
  diventano riquadri rotti e le schermate sembrano sbagliate quando non lo sono.
- **`scaduto` è derivato, non salvato.** Un preventivo `inviato` con `validoFino` passata si
  legge scaduto. Salvarlo come stato richiederebbe un job che nessuno fa girare.
- **Il totale si calcola dalle righe**, non è un campo modificabile. Uno sconto a totale, se
  servirà, è una riga negativa.
- **Numerazione `PR-AAAA-NNNN`**, progressivo annuale generato dal service.
- **Accent degli stati** (da `DESIGN_SYSTEM.md` §2.6, non inventarne altri):
  `bozza: neutral · inviato: info · accettato: emerald · rifiutato: danger · scaduto: amber`
  Il fallback `?? 'neutral'` non è opzionale.

---

## 6. Il task 3.6 si ferma a metà, ed è voluto

La **conversione in commessa** crea una commessa: quel modulo lo sta scrivendo la chat C, in
parallelo, e il suo service potrebbe non esistere ancora quando ci arrivi.

Fai così:

```ts
// src/services/preventiviService.ts
export async function convertiInCommessa(preventivoId: string): Promise<{ commessaId: string }> {
  // TODO(chat C): chiamare commesseService.creaDaPreventivo(preventivo).
  // Per ora segna solo il preventivo come accettato e restituisce un id finto,
  // così il dialog e la navigazione si possono provare.
  throw new Error('Conversione non ancora collegata — la aggancia la chat C al task 4.2');
}
```

Il dialog, il cambio stato e la navigazione li scrivi tu e devono funzionare. Il collegamento
vero lo fa la chat C. **Non scrivere tu `commesseService`**.

---

## 7. Regole di lavoro

### Git — la regola che evita i disastri

Quattro chat scrivono nella stessa cartella. **Mai `git add -A` e mai `git add .`**:
metteresti in stage il lavoro a metà di qualcun altro e lo committeresti a suo nome.

Metti in stage **solo i tuoi file, per percorso esplicito**:

```bash
git add src/types/preventivo.ts src/mocks/preventivi.ts src/mocks/specieAlberi.ts
git commit -F <file-messaggio>
```

Prima di ogni commit, controlla di non aver preso roba d'altri:

```bash
git status --short
git diff --cached --name-only
```

**Un commit per task**, sette in tutto (uno per ogni riga della tabella §2). Messaggio in
italiano, minuscolo dopo il prefisso `preventivi:`, che dice **cosa cambia per chi usa
l'app** — non quale funzione hai toccato. Nel corpo il perché.

```
preventivi: elenco con filtro per stato e contatori

Il filtro è TabPills con i contatori per stato, come l'elenco clienti. Gli
scaduti si calcolano al volo da validoFino: salvarli come stato richiederebbe
un job che nessuno fa girare.
```

### Verifica prima di committare

```bash
npm run typecheck
```

Deve uscire pulito **sui tuoi file**. Se un errore punta a un file fuori dal tuo perimetro,
è di un'altra chat a metà lavoro: **non aggiustarlo**, aspetta o segnalalo a Omar.

### Stile

- **UI in italiano.** Etichette, messaggi, placeholder, stati vuoti.
- **Termini di dominio in italiano anche nel codice** (`Preventivo`, `usePreventivi`), termini
  tecnici in inglese (`loading`, `onChange`).
- **Chiavi di stato in inglese minuscolo, etichetta italiana in UI**: `draft` non esiste, qui è
  `bozza` → «Bozza». Una funzione `statoPreventivoLabel()` fa la traduzione.
- **Commenti in italiano che spiegano il perché**, non il cosa. È la cosa migliore del codice
  di Telebi, ed è la ragione per cui questo progetto si legge.
- **Niente markup a mano** per pill, badge e testate: esistono `StatusPill`, `TabPills`,
  `PageHeader`. Se non bastano, si estendono — non si apre una seconda strada.

---

## 8. Quando hai finito

Il modulo è chiuso quando a schermo puoi:

- [ ] filtrare per stato con i contatori giusti nelle pill, e cercare per numero o cliente
- [ ] creare un preventivo: scegli cliente e luogo, compili il sopralluogo, carichi due foto,
      aggiungi tre alberi e quattro righe, **e il totale torna**
- [ ] portarlo da bozza a inviato ad accettato
- [ ] vedere reso come scaduto un preventivo con `validoFino` nel passato
- [ ] aprire il dettaglio e trovarci tutto quello che hai inserito
- [ ] vedere i preventivi di un cliente dalla sua scheda (la sezione esiste già, si popola da sola
      quando il tuo service risponde)

Poi scrivi a Omar: cosa hai fatto, cosa può verificare, e cosa è rimasto aperto
(la conversione in commessa lo è per progetto).

---

## Il confine col backend

**Solo frontend, con i mock. Nessun Supabase collegato, per nessun motivo.**

Non si installa `@supabase/supabase-js`, non si crea `integrations/supabase/`, non si mette
una `VITE_SUPABASE_URL`, e i mock non si sostituiscono con chiamate vere nemmeno per prova.

Si può invece **scrivere l'SQL** delle tabelle che serviranno, come preparazione: va in
`db/` alla radice, file numerati (`db/003_preventivi.sql`), con le tre colonne di audit di
Telebi (`created_at`, `updated_at`, `deleted_at`). È documentazione eseguibile: non la lancia
nessuno e non la importa nessun modulo. La cartella `supabase/migrations/` **non si crea**.

Dettagli in `docs/CONVENTIONS.md` §11.
