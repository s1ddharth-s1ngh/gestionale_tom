# Lavoro A — Fondazione, Clienti, Dashboard

> Questa è la **chat A**, quella che sta già lavorando. Fa la fondazione condivisa,
> il modulo Clienti (che è l'implementazione di riferimento per tutti), la Dashboard
> finale e l'integrazione.
>
> È anche il file di **coordinamento**: la ripartizione fra le quattro chat sta qui.

**Cartella di lavoro:** `C:\Users\Samar\Documents\Work\MANUX\tom_gestionale`

---

## 1. Come è diviso il lavoro

39 task in fila sono troppi per una sessione sola. Si dividono in quattro, ma **non si può
partire tutti insieme**: le altre tre chat costruiscono sopra lo shell, le rotte, il tipo
`Cliente` e i componenti condivisi. Quella è la fondazione, e la fa questa chat per prima.

```
        ┌─────────────────────────────────────────┐
  A →   │  FONDAZIONE  (shell, rotte, contratti)  │   ← nessuno può partire prima
        └──────────────────┬──────────────────────┘
                           │  commit "fondazione pronta"
        ┌──────────┬───────┴────────┬──────────────┐
        ▼          ▼                ▼              ▼
  A: Clienti   B: Preventivi   C: Commesse   D: Fatture + Costi
        │          │                │              │
        └──────────┴───────┬────────┴──────────────┘
                           ▼
                 A: Dashboard + integrazione
```

| Chat | File di istruzioni | Lavoro | Task |
|---|---|---|---|
| **A** | questo | Fondazione → Clienti → Dashboard | 11 |
| **B** | `docs/lavori/B-preventivi.md` | Preventivi | 6 |
| **C** | `docs/lavori/C-commesse.md` | Commesse | 6 |
| **D** | `docs/lavori/D-fatture-costi.md` | Fatture + Costi | 10 |

Ogni chat legge **solo il proprio file**. Sono scritti per essere autosufficienti.

### Perché Clienti sta con la fondazione

Preventivi, commesse e fatture puntano tutti a un cliente: senza il tipo `Cliente` e senza
`ClienteSelect` le altre tre chat non possono nemmeno fare una select. E il modulo Clienti è
dove nascono i pattern di lista, dettaglio e form che gli altri copiano — se parte in
parallelo agli altri, ognuno se ne inventa uno diverso e poi vanno riunificati a mano. È
esattamente il debito che Telebi si porta dietro e che i tre documenti servono a non ripetere.

---

## 2. Lo stato al momento della divisione

Fatto e committato:

| | |
|---|---|
| ✅ 0.1 | git init, remote GitHub, `.gitignore`, `.gitattributes` |
| ✅ 1.1 | scaffold Vite + React + TS + Tailwind, `npm install` a posto |
| ✅ 1.2 | token CSS puliti, `lib/utils.ts`, `lib/formatters.ts` |
| ✅ 1.3 | primitive shadcn vestite scure + shim icone Phosphor |
| ✅ 1.4 | i componenti del design system portati da Telebi |

Da fare in questa chat, **prima che le altre partano**:

| | |
|---|---|
| 1.5 | shell: `AppLayout`, `AppHeader`, `AppSidebar`, `PageLoader`, `lib/navigation.ts` |
| 1.6 | routing con **tutte** le rotte dei quattro moduli + pagine segnaposto |
| — | `types/comune.ts`: `Indirizzo`, `Foto`, `Paginato` |
| 2.1 | `types/cliente.ts` + `mocks/clienti.ts` |
| 2.2 | `services/clientiService.ts` + `hooks/useClienti.ts` |
| — | `components/shared/`: `ClienteSelect`, `LuogoInterventoSelect`, `IndirizzoFields`, `IndirizzoCard`, `FotoUploader`, `FotoGallery` |

Poi il commit che sblocca tutti:

```
chore: fondazione pronta — le chat B, C, D possono partire
```

Le altre tre lo cercano con `git log --oneline | grep -i "fondazione pronta"`. **Non usare
quella frase in nessun altro messaggio di commit.**

Dopo, in questa chat: Clienti UI (2.3–2.6), poi Dashboard (7.1–7.3) e integrazione.

---

## 3. Cosa deve contenere la fondazione, e perché

Le altre chat non possono chiedere: ogni cosa lasciata indefinita diventa tre invenzioni
diverse. Quindi la fondazione decide, e i loro file lo scrivono già come deciso.

### Rotte — tutte, subito

`src/App.tsx` dichiara le rotte di **tutti e quattro i moduli** puntando a file segnaposto.
Così nessun altro tocca `App.tsx`: ognuno riscrive il contenuto dei propri file e la rotta
funziona già. È la mossa che elimina il conflitto più probabile.

```
/                     Dashboard
/clienti  /clienti/:id
/preventivi  /preventivi/nuovo  /preventivi/:id
/commesse  /commesse/nuova  /commesse/:id
/fatture  /fatture/nuova  /fatture/scadenzario  /fatture/:id
/costi  /costi/:id  /costi/fornitori  /costi/fornitori/:id
*                     NotFound
```

Stessa cosa per `src/lib/navigation.ts`: le sei voci di menu ci sono già tutte.

### Le tre decisioni che tolgono altrettante domande bloccanti

Erano segnate in `PLAN.md` come «da chiedere». Si decidono qui, uguali per tutti:

1. **Foto → nessuna dipendenza.** `FotoUploader` è un `<input type="file">` con i drag
   handler scritti a mano, salva `data:` URI. Niente `react-dropzone`.
2. **Firma del cliente → nessuna dipendenza.** Un `<canvas>` con i pointer event, ~60 righe,
   salvata come `dataUrl`. Niente `react-signature-canvas`.
3. **Calendario commesse → nessuna dipendenza.** Griglia mensile coi token del design system.

Motivo comune: ogni libreria pronta va poi combattuta per toglierle il suo stile, e qui lo
stile è il vincolo principale. Tre componenti da poche decine di righe costano meno.

### I contratti

`src/types/comune.ts` è il file che tutti importano:

```ts
export interface Indirizzo { via: string; civico: string; cap: string; comune: string; provincia: string }
export interface Foto { id: string; dataUrl: string; didascalia?: string; caricataIl: string }
export interface Paginato<T> { righe: T[]; totale: number; pagina: number; perPagina: number }
```

`Paginato<T>` è la forma di ritorno di **ogni** `list()`: fissarla adesso evita che quattro
service tornino quattro forme diverse e che le liste si scrivano in quattro modi.

### I due agganci lasciati aperti apposta

Sono le uniche dipendenze fra moduli in parallelo. Ognuno lascia un `TODO` nominale e chi ha
il pezzo lo chiude:

| Chi lascia | Cosa | Chi chiude |
|---|---|---|
| B (task 3.6) | `preventiviService.convertiInCommessa` → `throw` + `TODO(chat C)` | C, task 4.2 |
| C (task 4.2) | `commesseService.generaFattura` → `TODO(chat D)` | D, task 5.2 |

È l'unica volta in cui una chat scrive fuori dal proprio perimetro, e va in un commit suo.

---

## 4. I miei task

### Fondazione — prima di tutto

- **1.5 shell.** `AppLayout` (header 56px + sidebar + main con scroll interno e reset su
  cambio rotta), `AppHeader` senza la roba multi-tenant di NexSuite, `AppSidebar` a una sola
  card con le `pillClass` di Telebi e il collasso in `localStorage`, `PageLoader`.
- **1.6 routing.** Tutte le rotte sopra, in `lazy()`, più i segnaposto con `PageHeader` +
  `TableEmptyState`.
- **contratti + condivisi.** `types/comune.ts`, `types/cliente.ts`, `mocks/clienti.ts`,
  `clientiService`, `useClienti`, e i sei componenti di `components/shared/`.
- **commit `chore: fondazione pronta`** → le altre tre partono.

### Clienti UI

- **2.3** elenco: `DarkTable`, toolbar con `TabPills` per tipo, ricerca, paginazione, e i
  **due** stati vuoti distinti (nessun risultato per i filtri ≠ archivio vuoto).
- **2.4** drawer di creazione: `EntityDrawer` + react-hook-form + zod. Lo schema è un
  discriminated union su `tipo`: al condominio serve il referente amministratore, all'ente il
  codice destinatario, al privato il codice fiscale.
- **2.5** dettaglio: breadcrumb, `TabPills` sticky come jump-nav, griglia 8/4 di `SectionCard`,
  modifica **inline al clic** sul campo. Le sezioni «Preventivi», «Commesse» e «Fatture» del
  cliente esistono da subito con lo stato vuoto giusto: si popolano da sole quando i service
  delle altre chat rispondono.
- **2.6** luoghi di intervento (CRUD) ed eliminazione con `ConfirmDialog`.

### Alla fine

- **7.1–7.3 Dashboard.** Va per ultima perché aggrega tutto: prima delle entità sarebbe una
  schermata di numeri finti da rifare.
- **Integrazione.** Rileggo il tutto: che i pattern non siano divergiti fra i quattro moduli,
  che i `TODO` incrociati siano chiusi, che il typecheck sia pulito su tutto il progetto.

---

## 5. Regole di lavoro (valgono per tutte e quattro le chat)

### Git

Quattro chat scrivono nella **stessa cartella, sullo stesso branch**. La regola che evita i
disastri: **mai `git add -A`, mai `git add .`** — metteresti in stage il lavoro a metà di
un'altra chat e lo committeresti a suo nome.

**Non usare `git add`.** Committa direttamente i percorsi:

```bash
# File GIÀ tracciati da git — basta committarli:
git commit -F <file-messaggio> -- src/types/miofile.ts src/mocks/miofile.ts

# File NUOVI — `git commit -- <percorsi>` non li vede, vanno aggiunti prima:
git add src/types/miofile.ts src/mocks/miofile.ts
git commit -F <file-messaggio> -- src/types/miofile.ts src/mocks/miofile.ts
```

Il `-- <percorsi>` sul commit resta anche dopo l'`add`, e non è ridondante: è
quello che impedisce di portarsi via i file che un'altra chat ha appena messo
in stage.

`git commit -- <percorsi>` committa il contenuto di QUEI file e ignora l'indice.
È l'unica forma sicura qui: l'indice git (`.git/index`) è **uno solo** per tutte e
quattro le sessioni, quindi fra il tuo `git add` e il tuo `git commit` un'altra chat
può committare — e si porta via i tuoi file staged dentro il suo commit. È già
successo: la fondazione Clienti è finita dentro `d3a110b`, un commit della chat D.
Niente si perde, ma l'attribuzione salta.

Un commit per task. Messaggio in italiano, minuscolo dopo il prefisso di area, che dice cosa
cambia per chi usa l'app. Nel corpo il perché, coi numeri se ci sono.

### Perimetri

Ognuno possiede i propri `types/`, `mocks/`, `services/`, `hooks/`, `pages/<modulo>/`,
`components/<modulo>/`. Tutto il resto — `App.tsx`, `lib/`, `index.css`, `components/ui/`,
`components/layout/`, `components/shared/`, `tailwind.config.ts`, `package.json` — **è
chiuso**: appartiene alla fondazione e non si tocca. Se serve una modifica lì, si chiede.

### Verifica

`npm run typecheck` prima di ogni commit. Se un errore punta fuori dal proprio perimetro, è
un'altra chat a metà lavoro: non si aggiusta.

### Stile

`DESIGN_SYSTEM.md` è normativo. Niente colori, spaziature o pattern inventati. Niente markup
a mano per pill, badge e testate: esistono i componenti. UI in italiano. Commenti in italiano
che spiegano il perché.

### Nessuna dipendenza nuova

Per nessuno, per nessun motivo, senza chiedere a Omar. Le tre che sembravano servire sono già
state evitate (§3).

---

## 6. Rischi noti di questa divisione

Li scrivo perché si vedano arrivare, non perché siano bloccanti.

- **I pattern possono divergere.** Tre chat scrivono tre liste senza vedersi. Mitigazione: il
  modulo Clienti è finito prima e i loro file lo indicano come riferimento obbligatorio. La
  passata di integrazione finale serve a questo.
- **Il typecheck è condiviso.** Con quattro chat che scrivono insieme, `npm run typecheck`
  può fallire per colpa d'altri. Da qui la regola di guardare *dove* punta l'errore.
- **I mock incrociati possono non risolvere.** Una fattura che cita una commessa non ancora
  scritta mostra un id che non risolve. È accettabile e temporaneo — succede anche col backend
  vero — e si sistema alla passata finale.
- **Il push su GitHub non è ancora passato.** I commit ci sono tutti in locale. Finché non si
  pubblica, la cartella condivisa è l'unico punto di sincronizzazione: va benissimo, perché
  le quattro chat girano sulla stessa macchina.

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


---

## FASE 2 — I dati veri: da mock a Supabase

> Aggiunta del 2026-08-29. **Sostituisce** la regola «solo mock» del confine col backend:
> adesso il database c'è e i service ci vanno sopra. Il resto di quel paragrafo — niente
> client Supabase fuori dai service — vale più di prima.

### Cosa è già fatto

- **Lo schema è scritto**, in `db/`. File numerati da eseguire in ordine dal SQL Editor, più
  `db/README.md` che spiega le tre decisioni che lo governano. Non modificarli: se ti serve
  una colonna, chiedi a Omar.
- **Il client c'è**: `src/lib/supabase.ts`. Lo importano **solo i service**, mai un componente
  e mai un hook — è la regola 1 di `CONVENTIONS.md` §4, la stessa che valeva per `mocks/`.
- **`clientiService` è già migrato**, ed è il tuo modello. Leggi
  `src/services/clientiService.ts` e `src/services/clientiMapper.ts` prima di scrivere una riga.

### Le firme non cambiano

È il punto. `list()`, `getById()`, `create()`, `update()`, `remove()` restano identiche:
cambia solo il corpo. Nessuna pagina, nessun hook, nessun componente va toccato — è lo scopo
per cui il layer è separato. Se ti accorgi che per migrare devi cambiare un componente,
fermati: quel componente stava facendo lavoro che spettava al service.

### Le sei cose da copiare da `clientiService`

1. **Un mapper a parte**, `<entita>Mapper.ts`. Il database parla snake_case, l'app camelCase.
   Con la traduzione in un file solo, quando una colonna cambia nome si tocca un posto solo.
2. **Ogni errore viene lanciato.** PostgREST non solleva eccezioni: torna `{ data, error }`, e
   un `error` ignorato diventa una lista vuota — cioè un bug che si presenta come «non ci sono
   dati». C'è un helper `esplodi(contesto, error)` da ricopiare.
3. **Filtro, ordinamento e paginazione li fa il database** (`.eq()`, `.or()`, `.range()`). Se
   restassero in un `useMemo` dentro la pagina, adesso scaricherebbero la tabella intera per
   mostrarne venti righe.
4. **Il conteggio dalla stessa query**, con `select(..., { count: 'exact' })`. Due query
   separate possono vedere stati diversi del database e dare una paginazione che non torna.
5. **Soft-delete, mai `DELETE`**: si scrive `deleted_at` e si filtra `.is('deleted_at', null)`.
   Le foreign key sono `on delete restrict` proprio per questo.
6. **`maybeSingle()` e non `single()`** sul getById: su zero righe `single` è un errore, e un
   id inesistente non è un guasto — è un 404 da mostrare.

### La regola nuova: leggere dalle viste, scrivere sulle tabelle

Gli stati derivati **non sono salvati**. Un preventivo scaduto, una fattura pagata, le ore
reali di una commessa si calcolano — in tabella resta solo la decisione umana. Le viste
(`v_preventivi`, `v_commesse`, `v_fatture`, `v_costi`) aggiungono il resto e portano già
dentro la denominazione del cliente, così non serve un secondo giro per mostrarla in lista.

Quindi: **`select` dalla vista, `insert` e `update` sulla tabella.** Una lista che legge la
tabella mostrerebbe «emessa» una fattura che è già stata pagata.

### I mock non si cancellano

Restano in `src/mocks/` e diventano la sorgente del **seed**. Scrivi il tuo
`db/0NN_seed_<entita>.sql` sul modello di `db/010_seed_clienti.sql`: id fissi e
`on conflict (id) do nothing`, così rilanciarlo non duplica niente. Senza seed il database è
vuoto e non si vede se le schermate reggono.

I `cliente_id` del tuo seed devono essere quelli di `010_seed_clienti.sql`
(`00000000-0000-4000-8000-0000000000NN`), o le join non risolvono.

### Come verifichi

`npm run typecheck` non basta più: passa anche con una query sbagliata. Serve guardare l'app
col database collegato — elenco, dettaglio, creazione, modifica, eliminazione — tenendo
d'occhio la console, dove arrivano gli errori PostgREST.

### Le mie tabelle, e cosa resta

| | |
|---|---|
| Tabelle | `clienti`, `luoghi_intervento` |
| File di schema | `db/001_clienti.sql` |
| Seed | `db/010_seed_clienti.sql` — **già scritto** |
| Service | `clientiService` + `clientiMapper` — **già migrati** |

Restano: dettaglio cliente (2.5), luoghi di intervento ed eliminazione (2.6), poi la Dashboard
(7.1–7.3) e la passata di integrazione.

La Dashboard, col database sotto, cambia natura: i conteggi non si fanno più caricando le
liste e contandole in memoria, si fanno con `{ count: 'exact', head: true }` — una query che
torna un numero e non le righe.
