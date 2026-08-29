# Convenzioni — gestionale Tom

Stack, struttura e regole di organizzazione, derivate da **NexSuite / Telebi**.
Stesse marche di `DESIGN_SYSTEM.md`: **[TELEBI]** = replicato, **[AGGIUNTA]** = mia proposta,
**[NON REPLICARE]** = visto e scartato.

---

## 1. Stack

### 1.1 Base **[TELEBI]**

| | Scelta | Nota |
|---|---|---|
| Runtime | React **18.3** | non 19: Telebi è su 18 e i componenti che porto sono scritti per 18 |
| Linguaggio | TypeScript 5.5 | |
| Build | **Vite 5** + `@vitejs/plugin-react-swc` | |
| Package manager | **npm** | |
| Routing | **react-router-dom 6** | `createBrowserRouter(createRoutesFromElements(…))` |
| Stato server | **@tanstack/react-query 5** | |
| UI | **shadcn/ui** + Radix + CVA | `style: default`, `baseColor: slate`, `cssVariables: true` |
| Stile | **Tailwind 3.4** + `tailwindcss-animate` | `darkMode: ['class']`, dark forzato |
| Classi | `clsx` + `tailwind-merge` via `cn()` | |
| Icone | **@phosphor-icons/react** dietro lo shim `@/components/ui/icons` | deciso |
| Form | **react-hook-form** + **zod** + `@hookform/resolvers` | deciso |
| Toast | **sonner** | |
| Date | **date-fns** + locale `it` | |

### 1.2 TypeScript **[AGGIUNTA]**

Telebi ha `strict: false`, `strictNullChecks: false`, `noImplicitAny: false` — e **174 errori
`tsc` preesistenti** dichiarati nel suo onboarding, perché per mesi il gate non controllava
niente (`tsconfig.json` alla root ha `"files": []`, quindi `npx tsc --noEmit` esce sempre 0).

Per un progetto nuovo parto **strict**. Non è una divergenza estetica: è l'unica differenza che
si ripaga da sola, e a progetto vuoto costa zero. Il typecheck vero, da usare fin dal primo
giorno:

```bash
npx tsc -p tsconfig.app.json --noEmit
```

Se preferisci allinearti a Telebi anche qui, è una riga in `tsconfig.app.json`.

### 1.3 Dipendenze del primo rilascio

Solo queste. Ogni aggiunta successiva passa da te.

```
react  react-dom  react-router-dom
@tanstack/react-query
react-hook-form  zod  @hookform/resolvers
@phosphor-icons/react
tailwindcss  tailwindcss-animate  postcss  autoprefixer
class-variance-authority  clsx  tailwind-merge
sonner  date-fns
@radix-ui/react-{dialog,alert-dialog,select,label,slot,popover,tooltip,checkbox,separator,tabs,scroll-area}
```

Fuori dal primo rilascio, li nomino perché serviranno e voglio che tu sappia quando:
`react-dropzone` (foto del sopralluogo, step 3), `recharts` (report di marginalità, non nel
primo rilascio), `@react-pdf/renderer` o `jspdf` (stampa preventivo/fattura, quando arriva).

**[NON REPLICARE]** Telebi ha 90 dipendenze runtime, fra cui three.js, @xyflow/react, pdfjs,
xlsx, firecrawl, dnd-kit, framer-motion. Sono di moduli che Tom non ha.

---

## 2. Struttura delle cartelle

### 2.1 In Telebi **[TELEBI]**

```
src/
├── assets/                 immagini, loghi
├── components/
│   ├── ui/                 shadcn + i componenti del design system  (95 file)
│   ├── Layout/             shell: header, sidebar, layout d'area
│   ├── shared/             componenti trasversali a più moduli
│   ├── Commercial/         componenti del modulo commerciale        (PascalCase)
│   ├── Magazzino/          componenti del modulo magazzino
│   └── …                   una cartella per modulo
├── contexts/               React context (auth, page data, …)
├── hooks/                  useXxx — wrapper di react-query + logica di UI   (248 file)
├── integrations/           client del backend
├── lib/                    utilità pure e configurazione (navigation/, utils.ts, formatters)
├── pages/
│   ├── commerciali/        una cartella per area, pagine PascalCase
│   └── magazzino/
├── services/               accesso ai dati                          (98 file)
├── types/                  tipi di dominio, uno per modulo
└── utils/                  formatter e helper
```

### 2.2 Per Tom **[TELEBI + AGGIUNTA]**

Stessa struttura, più `mocks/` (che in Telebi non serve perché ha un backend vero):

```
src/
├── components/
│   ├── ui/                 design system — kebab-case
│   ├── layout/             shell — [AGGIUNTA] minuscolo, vedi §3.1
│   ├── shared/             componenti usati da più moduli
│   ├── clienti/            componenti del modulo Clienti
│   ├── preventivi/
│   ├── commesse/
│   ├── fatture/
│   └── costi/
├── hooks/                  useClienti.ts, usePreventivi.ts, …
├── lib/
│   ├── utils.ts            cn(), pluralize(), fmtDateShort()
│   ├── formatters.ts       formatCurrency, formatNumber, formatOre
│   └── navigation.ts       le voci del menu — fonte unica
├── mocks/                  [AGGIUNTA] i dati finti, uno per entità
├── pages/
│   ├── clienti/            ClientiList.tsx, ClienteDetail.tsx
│   ├── preventivi/
│   ├── commesse/
│   ├── fatture/
│   ├── costi/
│   └── Dashboard.tsx
├── services/               [TELEBI] l'unico punto che tocca i dati
└── types/                  cliente.ts, preventivo.ts, commessa.ts, fattura.ts, costo.ts
```

**Perché niente `contexts/` e `integrations/` all'inizio:** non c'è auth e non c'è backend.
Si creano quando servono.

**Moduli futuri** (mezzi, registro rifiuti, scadenze sicurezza, autorizzazioni, contratti
ricorrenti, marginalità): la struttura è già quella giusta — ognuno è una cartella in
`components/`, una in `pages/`, un file in `types/`, uno in `services/`, uno in `mocks/`, e una
voce in `lib/navigation.ts`. Nessuna riorganizzazione richiesta per aggiungerli.

---

## 3. Naming

### 3.1 File e cartelle

| Cosa | Convenzione | Esempio |
|---|---|---|
| Componenti del design system (`ui/`) | **kebab-case** **[TELEBI]** | `dark-table.tsx`, `status-pill.tsx`, `page-header.tsx` |
| Componenti di modulo | **PascalCase** **[TELEBI]** | `ClienteCard.tsx`, `PreventivoRigheTable.tsx` |
| Pagine | **PascalCase** **[TELEBI]** | `ClientiList.tsx`, `ClienteDetail.tsx` |
| Cartelle di `pages/` | **minuscolo, italiano** **[TELEBI]** | `pages/clienti/` |
| Cartelle di `components/` | Telebi usa PascalCase inglese (`Commercial/`) | |
| Hook | `useNomeCosa.ts` **[TELEBI]** | `useClienti.ts`, `usePreventivo.ts` |
| Service | `nomeService.ts` **[TELEBI]** | `clientiService.ts` |
| Tipi | `nome.ts` minuscolo **[TELEBI]** | `types/preventivo.ts` |
| Mock | `nome.ts` minuscolo **[AGGIUNTA]** | `mocks/clienti.ts` |

> **Divergenza che segnalo [AGGIUNTA]:** in Telebi le cartelle di `components/` sono PascalCase
> e in inglese (`Commercial/`, `Magazzino/` — già lì non è coerente), mentre quelle di `pages/`
> sono minuscole e in italiano (`commerciali/`). **Per Tom uso minuscolo italiano in entrambe**
> (`components/clienti/`, `pages/clienti/`): stesso nome per lo stesso modulo nei due posti, e
> si smette di ricordare quale delle due maiuscole toccava. Il caso di `components/layout/`
> segue la stessa regola. Se preferisci la fedeltà anche qui, si rinominano cinque cartelle.

### 3.2 Export **[TELEBI]**

- **Pagine**: `export default function ClientiList()` — servono al `lazy()` delle rotte
- **Tutto il resto**: named export — `export function ClienteCard()`, `export const clientiService`

### 3.3 Lingua **[TELEBI]**

Questa è la regola che rende il codice di Telebi riconoscibile, e la tengo:

- **UI: italiano.** Ogni etichetta, messaggio, titolo, placeholder, stato.
- **Termini di dominio: italiano anche nel codice.** `Cliente`, `Preventivo`, `Commessa`,
  `useClienti`, `preventiviService`. In Telebi è così: `AnagraficaClienti`, `MovimentiStock`,
  `useArticoliMagazzino`.
- **Termini tecnici: inglese.** `loading`, `error`, `onChange`, `isOpen`, `items`, `value`.
- **Stati in DB/mock: chiavi inglesi minuscole, etichetta italiana in UI.** `draft` → «Bozza».
  In Telebi la regola è esplicita (`UI-BADGE.md` §3): *«l'etichetta è in italiano e si legge,
  non è la chiave del DB»*. Ogni set di stati ha la sua funzione `xxxLabel()`, sul modello di
  `jobStatusLabel` in `lib/utils.ts`.
- **Commenti: italiano**, e — questa è la parte che conta — **spiegano il perché, non il cosa**.
  Telebi ne è pieno e sono la sua cosa migliore: *«8px dal sottotitolo come in machine-data:
  `!mt-2` batte lo `space-y-5` del flusso»*, *«Anche in errore il caricamento è FINITO:
  lasciare il flag a true terrebbe lo shimmer per sempre»*. Un commento che ripete il codice
  non si scrive.

---

## 4. Il layer dati

È il vincolo esplicito del progetto: **oggi mock, domani API, e la sostituzione tocca un solo
file per entità.**

### 4.1 Le tre regole

1. **Nessun componente importa mai da `mocks/`.** L'unico che ci arriva è il service.
2. **Nessun componente chiama mai un service direttamente.** Ci passa attraverso un hook.
3. **Il service ritorna sempre una `Promise` e simula la latenza.** Se oggi risponde
   sincrono, domani il passaggio a `fetch` cambia il comportamento di ogni schermata.

```
componente  →  hook (react-query)  →  service (Promise + latenza)  →  mocks
                                            ↑
                              domani qui: fetch / supabase / axios
```

### 4.2 Il service **[AGGIUNTA — Telebi non ha mock]**

Firme già nella forma che avranno con un backend vero: filtri e paginazione come parametri,
mai come lavoro fatto dal componente.

```ts
// src/services/clientiService.ts
import { clientiMock } from '@/mocks/clienti';
import type { Cliente, ClienteFiltri, Paginato } from '@/types/cliente';

/** Latenza finta: senza, gli stati di caricamento non si vedono mai e restano non testati. */
const delay = (ms = 300) => new Promise<void>((r) => setTimeout(r, ms));

/**
 * Sostituzione futura: il corpo diventa una fetch, la firma NON cambia.
 * È il motivo per cui i filtri sono un parametro e non un `.filter()` nel componente.
 */
export const clientiService = {
  async list(filtri?: ClienteFiltri): Promise<Paginato<Cliente>> {
    await delay();
    // …filtro + ordinamento + slice sui mock
  },

  async getById(id: string): Promise<Cliente | null> {
    await delay(200);
  },

  async create(input: ClienteInput): Promise<Cliente> {
    await delay(400);
  },

  async update(id: string, patch: Partial<ClienteInput>): Promise<Cliente> {
    await delay(400);
  },

  async remove(id: string): Promise<void> {
    await delay(300);
  },
};
```

**Persistenza nella sessione [AGGIUNTA]:** i mock stanno in un array in modulo, mutato dalle
`create`/`update`/`remove`. Un ricaricamento della pagina riporta ai dati iniziali. È il
comportamento giusto per una demo — vedere le proprie modifiche mentre si naviga, ripartire
puliti al reload — e va detto, perché altrimenti sembra un bug.

> **[NON REPLICARE]** Telebi ha due stili di service: oggetti/funzioni camelCase
> (`customerDirectoryService.ts`) e classi con metodi statici (`InventoryService.getStockSummary()`).
> Uso **solo il primo**.

### 4.3 L'hook **[TELEBI]**

```ts
// src/hooks/useClienti.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { clientiService } from '@/services/clientiService';

/** Chiavi di cache in un posto solo: un typo qui è una cache che non si invalida mai. */
export const clientiKeys = {
  all: ['clienti'] as const,
  list: (f?: ClienteFiltri) => [...clientiKeys.all, 'list', f] as const,
  detail: (id: string) => [...clientiKeys.all, 'detail', id] as const,
};

export function useClienti(filtri?: ClienteFiltri) {
  return useQuery({
    queryKey: clientiKeys.list(filtri),
    queryFn: () => clientiService.list(filtri),
  });
}

export function useCreaCliente() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: clientiService.create,
    onSuccess: () => qc.invalidateQueries({ queryKey: clientiKeys.all }),
  });
}
```

Config globale, la stessa di Telebi:

```ts
// Telebi — src/App.tsx
const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 60_000, retry: 1 } },
});
```

### 4.4 Dove sta lo stato **[TELEBI]**

- **Dati remoti** → react-query. Mai copiati in `useState`.
- **Stato di UI** (filtro attivo, tab, drawer aperto) → `useState` nella pagina.
- **Preferenze che devono sopravvivere al reload** (sidebar collassata, vista card/lista) →
  `localStorage`, letto nell'initializer di `useState` e scritto in un `useEffect`. È
  esattamente il pattern di `AnagraficaClienti` e `AppSidebar`.
- **Niente store globale.** Telebi usa zustand in 4 file su 1530, per casi speciali.

---

## 5. Routing

### 5.1 Struttura **[TELEBI]**

```tsx
const router = createBrowserRouter(createRoutesFromElements(
  <Route element={<AppLayout />}>
    <Route index element={<Dashboard />} />

    <Route path="/clienti">
      <Route index element={<ClientiList />} />
      <Route path=":id" element={<ClienteDetail />} />
    </Route>

    <Route path="/preventivi">
      <Route index element={<PreventiviList />} />
      <Route path="nuovo" element={<PreventivoNuovo />} />
      <Route path=":id" element={<PreventivoDetail />} />
    </Route>
    …
    <Route path="*" element={<NotFound />} />
  </Route>
));
```

**Regole [TELEBI]:**
- ogni pagina è caricata in `lazy()`, con un `<Suspense fallback={<PageLoader />}>` nel layout
- path in **italiano e minuscolo**: `/clienti`, `/preventivi/nuovo`, `/commesse/:id`
- un path che cambia lascia un `<Route path="vecchio" element={<Navigate to="…" replace />} />`
- **una rotta nuova va aggiunta anche a `lib/navigation.ts`**, o non compare nel menu

> In Telebi il gate d'area è *fail-closed*: una rotta non registrata rende 404, ed è voluto —
> «è la prima cosa da controllare se una pagina nuova non esiste». Tom non ha permessi, quindi
> niente gate; resta la regola di tenere `navigation.ts` allineato.

### 5.2 Un solo posto per il menu **[AGGIUNTA, sul modello di Telebi]**

Telebi tiene le voci in `lib/navigation/divisionSections.ts`, una riga per voce. Stessa cosa,
in un file solo:

```ts
// src/lib/navigation.ts
export const NAV_ITEMS = [
  { id: 'dashboard',  label: 'Home',       href: '/',           icon: House,       isHome: true },
  { id: 'clienti',    label: 'Clienti',    href: '/clienti',    icon: Users },
  { id: 'preventivi', label: 'Preventivi', href: '/preventivi', icon: FileText },
  { id: 'commesse',   label: 'Commesse',   href: '/commesse',   icon: Tree },
  { id: 'fatture',    label: 'Fatture',    href: '/fatture',    icon: Receipt },
  { id: 'costi',      label: 'Costi',      href: '/costi',      icon: Wallet },
] as const;
```

Attivo = match esatto per la home, per prefisso per le altre — copiato da `isItemActive`:

```ts
// Telebi — src/components/Layout/AppSidebar.tsx
function isItemActive(pathname: string, item: NavSection): boolean {
  if (item.isHome) return pathname === item.href || pathname === item.href + '/';
  return pathname === item.href || pathname.startsWith(item.href + '/');
}
```

---

## 6. Componenti: dove va cosa

| Se il componente… | va in | esempio |
|---|---|---|
| non sa niente del dominio, è pura forma | `components/ui/` | `DarkTable`, `StatusPill`, `PageHeader` |
| è lo shell dell'app | `components/layout/` | `AppLayout`, `AppSidebar`, `AppHeader` |
| conosce il dominio ed è usato da **più** moduli | `components/shared/` | `ClienteSelect`, `IndirizzoCard` |
| conosce **un** modulo | `components/<modulo>/` | `PreventivoRigheTable` |
| è una schermata con una rotta | `pages/<modulo>/` | `PreventiviList` |

**La regola di promozione [TELEBI]:** alla **seconda** volta che serve, il componente sale di
un livello. È la logica dei documenti di Telebi — «lo stile si cambia QUI e cambia ovunque, non
aggiungerne un secondo». Il costo di non farlo si vede in Telebi stesso: la stessa badge scritta
in tre forme diverse in tre pagine, poi riunificata a mano in `StatusPill`.

**Il corollario, ancora più importante:** se una pagina sta per scrivere a mano il markup di una
pill, di una badge o di una testata, si ferma. O il componente esiste, o si estende quello che
c'è. Non si apre una seconda strada.

---

## 7. Come si scrive un componente **[TELEBI]**

Ordine dentro il file, osservato ovunque in Telebi:

```tsx
// 1. import — React, poi librerie, poi @/ interni
import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Users } from '@/components/ui/icons';
import { Button } from '@/components/ui/button';
import type { Cliente } from '@/types/cliente';
import { cn } from '@/lib/utils';

// 2. costanti di modulo, in MAIUSCOLO, con il perché accanto
/** Sotto questa soglia la paginazione diventa inutilizzabile. */
const MIN_PAGE_SIZE = 4;

// 3. mappe stato → etichetta / accent
const STATO_ACCENT: Record<StatoPreventivo, StatusPillAccent> = { … };

// 4. sotto-componenti privati del file
function SectionCard({ … }) { … }

// 5. il componente esportato
export function ClienteCard({ cliente, onApri }: ClienteCardProps) { … }
```

Altre regole viste ovunque:

- **props tipizzate con una `interface` dichiarata sopra**, mai inline nella firma
- **JSDoc sul componente**: cosa fa, e la decisione che spiega perché è fatto così
- `cn()` per comporre le classi, mai template string quando ci sono condizioni
- import assoluti con `@/`, mai `../../`

---

## 8. Mock: come devono essere fatti **[AGGIUNTA]**

I mock servono anche a te per capire se le schermate reggono. Quindi:

- **Nomi veri e italiani.** «Condominio Via Battisti 14, Amm. Studio Moretti», «Comune di
  Casalecchio di Reno», «Az. Agricola Ferrari Luca». Non «Cliente 1».
- **Specie realistiche** per il taglio alberi: cedro dell'Atlante, pino domestico, platano,
  tiglio, cipresso, quercia, robinia, salice piangente.
- **Importi credibili**: abbattimento di un cedro 18m con piattaforma € 1.850; potatura di
  quattro tigli € 620; cippatura e smaltimento € 340.
- **Quantità che sforzano il layout**: almeno una ragione sociale lunghissima, un indirizzo
  su due righe, un preventivo con 12 righe, un cliente con 0 interventi e uno con 15.
- **Ogni stato rappresentato almeno due volte**, o non si vede se le badge funzionano.
- **Date coerenti tra loro**: un preventivo accettato il 12/03 non genera una commessa
  pianificata l'8/03. Le date sono relative a oggi (`oggi - 40 giorni`), così i mock non
  invecchiano.
- Un file per entità, `export const clientiMock: Cliente[] = [...]`.

---

## 9. Comandi

```bash
npm run dev        # dev server
npm run build      # build di produzione
npm run preview    # anteprima della build
npm run lint       # eslint
npx tsc -p tsconfig.app.json --noEmit   # typecheck vero (vedi §1.2)
```

**[AGGIUNTA]** Vite sceglie la prima porta libera da 5173, come in Telebi (che non fissa la
porta di proposito).

---

## 10. Regole di lavoro per gli step successivi

Dal tuo prompt, messe qui perché non si perdano:

1. **Uno step alla volta.** A fine step: cosa ho creato, cosa puoi verificare a schermo, e
   aspetto il tuo ok.
2. **Ogni scelta di stile deriva da `DESIGN_SYSTEM.md`.** Se sto per inventare un colore, una
   spaziatura o un pattern che lì non c'è, mi fermo e te lo chiedo.
3. **Nessuna dipendenza nuova senza chiedertelo prima.**
4. **Tutti i dati passano da `services/`.** Nessun import da `mocks/` fuori da lì.
5. **UI in italiano.** Sempre.
