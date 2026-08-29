# Design System — gestionale Tom

Estratto da **NexSuite / Telebi** (`C:\Users\Samar\Documents\Work\Telebi\telebi`), moduli
commerciale e magazzino. L'obiettivo è la **fedeltà**: dove Telebi ha già una risposta, quella
è la risposta.

Convenzione di lettura di questo file:

| Marca | Significato |
|---|---|
| **[TELEBI]** | esiste in Telebi, va replicato alla lettera. Sotto c'è il codice vero, con il file di provenienza |
| **[AGGIUNTA]** | Telebi non copre il caso: è una mia proposta, coerente ma da approvare |
| **[NON REPLICARE]** | esiste in Telebi ma è rotto o superato. Scritto qui perché tu sappia che l'ho visto e scartato |

Le fonti normative di Telebi, in ordine di autorità: `docs/ONBOARDING-GRAFICO.md` §8 →
`docs/UI-BADGE.md` → i commenti-contratto dentro `src/components/ui/*.tsx` → il codice delle pagine.

---

## 1. Fondamenta

### 1.1 Il tema è scuro e basta **[TELEBI]**

Non c'è un toggle, non c'è una variante chiara. `index.css` forza il dark su `<html>`:

```css
/* Telebi — src/index.css */
html {
  @apply dark;
  font-family: var(--core--font-family--primary-font);
}
html, body, #root { @apply dark; }
```

**Per Tom:** stesso approccio, ma senza il blocco `:root` chiaro di shadcn che in Telebi resta
appeso e non serve a nessuno. Un solo set di token, quelli scuri.

### 1.2 Font **[TELEBI]**

**Urbanist**, da Google Fonts, pesi `300;400;500;600;700`. In `index.html`:

```html
<!-- Telebi — index.html -->
<link href="https://fonts.googleapis.com/css2?family=Urbanist:wght@300;400;500;600;700&display=swap" rel="stylesheet">
```

Anche `font-mono` punta a Urbanist: i codici non cambiano famiglia, cambiano solo
`tabular-nums` dove serve allineare le cifre.

```ts
// Telebi — tailwind.config.ts
fontFamily: {
  sans: ['Urbanist', 'sans-serif'],
  mono: ['Urbanist', 'sans-serif'],
},
```

Nel `<head>` c'è anche uno sfondo scuro pre-mount, per non prendere il flash bianco al reload:

```html
<!-- Telebi — index.html -->
<style>
  html, body { margin: 0; background-color: #0a0a0a; }
  #root { min-height: 100vh; background-color: #0a0a0a; }
</style>
```

---

## 2. Palette

### 2.1 Superfici **[TELEBI]**

Telebi le scrive come **valori arbitrari Tailwind hardcoded** nelle pagine
(`bg-[#111111]`), non come token CSS. I token in `index.css` sono in gran parte residui che
nessuno legge.

| Ruolo | Valore | Dove |
|---|---|---|
| Canvas della pagina | `#000000` — `bg-black` | radice pagina, `<main>`, header |
| Superficie primaria (card, sezione, tabella) | `#111111` | `DarkSection`, `SectionCard`, contenitore tabella |
| Card della sidebar | `#121212` | `AppSidebar` |
| Header di tabella sticky | `#141414` | `<thead>` sticky |
| Header di tabella non sticky | `bg-white/[0.02]` | `<thead>` |
| Corpo del drawer | `#131417` | `EntityDrawerShell` |
| Header/footer del drawer | `#0d0f12` | `EntityDrawerShell` |
| Superficie interattiva a riposo | `bg-white/[0.04]` | pill, input, bottone secondario |
| Superficie interattiva hover | `bg-white/[0.08]` | idem |
| Riga zebra | `bg-white/[0.015]` | `DarkTableRow` |
| Riga hover | `bg-white/[0.04]` — `[0.05]` in modalità rounded | `DarkTableRow` |
| Riga selezionata | `bg-[#1E6FFF]/[0.10]` | `DarkTableRow` |

### 2.2 Bordi **[TELEBI]**

Solo due, e la distinzione è netta:

- `border-white/[0.06]` — le **superfici** (card, sezioni, separatori di header, righe di tabella con `[0.04]`)
- `border-white/[0.08]` — gli **elementi interattivi** (pill, input, bottoni secondari, drawer)
- `border-white/[0.18]` — hover di una card cliccabile (`DarkKpi` interattivo)

### 2.3 Testo **[TELEBI]**

Una scala di opacità sul bianco, mai un grigio con un suo valore:

| Classe | Uso |
|---|---|
| `text-white` | titoli, valori, dato principale di una riga |
| `text-white/85` | valore evidenziato dentro un testo grigio |
| `text-white/70` | corpo secondario, label di bottone secondario |
| `text-white/65` | descrizione di dialog |
| `text-white/55` | testo di empty state, valore muto |
| `text-white/45` | pill non selezionata, label KPI, conteggi |
| `text-white/40` | sottotitolo pagina, header di tabella, label di campo |
| `text-white/35` | hint, descrizione di empty state |
| `text-white/30` | placeholder, valore assente (`—` in corsivo) |
| `text-white/25` | placeholder di input |

### 2.4 Il blu delle azioni **[TELEBI]**

```
#1E6FFF   azione primaria, pill attiva, riga selezionata, focus di input
#1a5fe6   hover della action nei dialog (altrove: #1E6FFF/90)
#7eb0ff   testo/icona blu su fondo scuro (accent "info", spinner di ricerca)
```

> Da `ONBOARDING-GRAFICO.md` §8: *«Il colore delle azioni è il blu `#1E6FFF`, in pill
> `rounded-full`. Gli avvisi e le differenze in ambra. Gli stati "a posto" in bianco.»*

### 2.5 Gli 8 accent semantici **[TELEBI]**

La formula è fissa: **bordo `-500/30`, fondo `-500/15`, testo `-300`**.

```tsx
// Telebi — src/components/ui/status-pill.tsx
export const STATUS_PILL_ACCENT: Record<StatusPillAccent, string> = {
  neutral: 'border-white/[0.08] bg-white/[0.04] text-white/65',
  info:    'border-[#1E6FFF]/30 bg-[#1E6FFF]/15 text-[#7eb0ff]',
  emerald: 'border-emerald-500/30 bg-emerald-500/15 text-emerald-300',
  orange:  'border-orange-500/30 bg-orange-500/15 text-orange-300',
  danger:  'border-red-500/30 bg-red-500/15 text-red-300',
  amber:   'border-amber-500/30 bg-amber-500/15 text-amber-300',
  purple:  'border-purple-500/30 bg-purple-500/15 text-purple-300',
  teal:    'border-teal-500/30 bg-teal-500/15 text-teal-300',
};

export const STATUS_PILL_DOT: Record<StatusPillAccent, string> = {
  neutral: 'bg-white/40',   info:    'bg-[#1E6FFF]',
  emerald: 'bg-emerald-400', orange: 'bg-orange-400',
  danger:  'bg-red-400',     amber:  'bg-amber-400',
  purple:  'bg-purple-400',  teal:   'bg-teal-400',
};
```

Il significato è **globale**, non dipende dalla pagina (`UI-BADGE.md` §2):

| accent | Significato |
|---|---|
| `neutral` | nessuna enfasi, stato di partenza (bozza), riga chiusa |
| `info` | in corso, avviato |
| `emerald` | riuscito, completato, approvato |
| `amber` | attenzione, in attesa di qualcuno, oggi |
| `orange` | urgenza media, fra ambra e rosso |
| `danger` | fallito, rifiutato, annullato, in ritardo |
| `purple` / `teal` | categoria, **non** gravità |

> ⚠️ **Contraddizione trovata in Telebi.** `ONBOARDING-GRAFICO.md` §8 (2026-08-05) dice
> «Mai il verde (niente `emerald`) per gli stati di successo», ma `UI-BADGE.md` (2026-08-25)
> assegna a `emerald` esattamente «riuscito, completato, approvato», ed è così in 138 badge.
> **Seguo UI-BADGE**, che è più recente e descrive il codice reale. Se preferisci il contrario
> è una riga da cambiare in un file solo.

### 2.6 Mappa accent per il dominio di Tom **[AGGIUNTA]**

Telebi non ha preventivi né fatture. Applico i suoi significati al nostro dominio:

```ts
// Preventivi
bozza: 'neutral' · inviato: 'info' · accettato: 'emerald'
rifiutato: 'danger' · scaduto: 'amber'

// Commesse
da_pianificare: 'neutral' · pianificata: 'info' · in_corso: 'amber'
completata: 'emerald' · sospesa: 'orange' · annullata: 'danger'

// Fatture
bozza: 'neutral' · emessa: 'info' · pagata_parziale: 'amber'
pagata: 'emerald' · scaduta: 'danger'

// Criticità del sopralluogo (categoria, non gravità → purple/teal)
cavi_elettrici: 'danger' · vicinanza_edifici: 'orange'
accesso_difficile: 'amber' · nessuna: 'neutral'
```

Il fallback `?? 'neutral'` non è opzionale (`UI-BADGE.md` §3): uno stato non mappato si rende
grigio, non fa esplodere la cella.

---

## 3. Tipografia

Scala reale, misurata sulle pagine **[TELEBI]**:

| Elemento | Classi |
|---|---|
| Titolo pagina (h1) | `text-2xl font-bold tracking-tight text-white` |
| Sottotitolo pagina | `text-[12px] text-white/40` |
| Eyebrow sopra il titolo | `text-[10px] uppercase tracking-wider text-white/40 font-semibold` |
| Titolo di sezione (h2) | `text-base font-semibold text-white` |
| Hint accanto al titolo di sezione | `text-[11px] text-white/35 italic` |
| Titolo di side-card (h3) | `text-[10px] uppercase tracking-[0.06em] text-white/40 font-medium` |
| Header di tabella | `text-[10px] uppercase tracking-[0.04em] text-white/40 font-medium` (riga `h-9`) |
| Cella di tabella | `text-[12.5px]` — `font-mono text-[12px]` se codice |
| Label di campo (dettaglio) | `text-[10px] uppercase tracking-[0.04em] text-white/40 font-medium` |
| Valore di campo (dettaglio) | `text-[13px] text-white` |
| Label di campo (form) | `text-white/40 text-[10px] uppercase tracking-widest font-medium` |
| Badge / StatusPill | `text-[10.5px] font-semibold` |
| Pill di tab | `text-xs font-medium` |
| Valore KPI | `text-2xl font-bold tabular-nums leading-none` |
| Label KPI | `text-[11px] uppercase tracking-wider text-white/45` |
| Errore di validazione | `text-red-400 text-xs mt-1` |
| Voce di sidebar | `text-[13px] tracking-[-0.2px]` |

**Regola numerica [TELEBI]:** ogni numero incolonnato porta `tabular-nums`. Vale per importi,
quantità, ore, date in colonna.

---

## 4. Spaziature, raggi, ombre

### 4.1 Il padding di pagina è **uno solo** **[TELEBI]**

> Da `ONBOARDING-GRAFICO.md` §8: *«Il margine della pagina è UNO solo: `p-3` — il guscio
> (`PlatformLayout`) mette già `px-3 py-3`, quindi con `p-3` sulla radice della pagina il
> contenuto sta a 24px dalla sidebar e a 24px sotto l'header, uguale ovunque. Niente `p-6`,
> `p-4 sm:p-6`, `px-3.5`, `px-4 sm:px-6`.»*

Corollari citati nella stessa regola:
- le barre sticky a tutta larghezza annullano il padding con `-mx-3 px-3` (mai `-mx-4`/`-mx-6`)
- il contenuto **non si centra mai** con `mx-auto`: si sposterebbe al collasso della sidebar

### 4.2 Ritmo verticale **[TELEBI]**

| Distanza | Classe |
|---|---|
| Fra sezioni di una pagina | `space-y-5` (20px) |
| Fra sottotitolo e fila di pill | **8px** — `gap-2`, o `!mt-2` dentro un flusso `space-y-*` |
| Fra fila di pill e contenuto | **12px** |
| Dentro una griglia di card | `gap-3` (liste) / `gap-5` (dettaglio) |
| Padding di sezione | `p-5` — `p-4` in modalità compact — `p-6` sulle SectionCard del dettaglio |

> ⚠️ Il dettaglio dell'`!mt-2` è un bug vero documentato in Telebi: dentro `space-y-*` il
> selettore ha specificità 0,3,0 e un `mt-2` normale viene ignorato — serve l'important.
> Dentro `flex gap-*` invece i margini si **sommano** al gap.

### 4.3 Raggi **[TELEBI]**

```
rounded-full     bottoni, pill, badge, avatar, contatori     ← il default per tutto ciò che si clicca
rounded-[20px]   card di sezione, tabelle, KPI, drawer (solo lato sinistro)
rounded-xl       card della sidebar, box di sezione dentro un form, chip icona
rounded-lg       input, celle arrotondate di tabella, bottone di chiusura
```

### 4.4 Ombre **[TELEBI]**

Quasi assenti: su fondo nero il bordo hairline fa il lavoro. L'unica in uso è quella della
sidebar, `shadow-[0_24px_60px_-30px_rgba(0,0,0,0.7)]`.

---

## 5. Lo shell

### 5.1 Struttura **[TELEBI]** — senza header **[AGGIUNTA]**

```tsx
// src/components/layout/AppLayout.tsx
<div className="h-screen w-full overflow-hidden bg-black">
  <div className="relative flex h-full w-full">
    <AppSidebar />
    <main ref={mainRef} className="flex-1 overflow-y-auto">
      <div className="w-full px-3 py-3 pb-4">
        <Suspense fallback={<PageLoader />}>
          <Outlet />
        </Suspense>
      </div>
    </main>
  </div>
</div>
```

Lo scroll è **dentro `<main>`**, non sul body, e si resetta a ogni cambio di `location.pathname`
con un `useLayoutEffect`.

Telebi ha un `<PlatformHeader />` sopra la riga sidebar+main. **Tom no**: la pagina parte da
sotto il bordo dello schermo. Vedi §5.2 per il perché.

### 5.2 Header — **non esiste** **[NON REPLICARE]**

**Decisione: l'header è stato eliminato.** Il file `AppHeader.tsx` non c'è più e non va
ricreato.

Telebi ha una barra alta 56px con selettore azienda multi-tenant, chat AI, notifiche e dropdown
del team. Tom aveva tenuto solo logo + data + avatar. Ma tre elementi decorativi non pagano
**56px di altezza sottratti a ogni singola schermata**: questo è un gestionale, le pagine sono
tabelle, e in una tabella l'altezza si misura in righe visibili. 56px sono due righe in meno,
sempre, ovunque.

I tre contenuti superstiti sono scesi nella card della sidebar, che c'era già e aveva spazio
(§5.3): **marchio** in testa, **data + avatar** in fondo.

Conseguenze operative, da tenere a mente scrivendo pagine:

- il canvas utile è `100dvh` meno il solo padding del guscio (`py-3` = 24px) — **niente più
  `calc(100dvh - 84px)`**, la formula di Telebi che scontava l'header
- una pagina non ha un posto "sopra" dove mettere azioni globali: le azioni stanno nella
  **testata di pagina** (§6.1), che è già il pattern giusto
- il logo/marchio **non si ripete** nelle pagine: sta solo nella sidebar

> Il bottone tondo `w-8 h-8 rounded-full bg-white/[0.06] hover:bg-white/[0.1]` che Telebi usava
> nell'header resta valido come pattern per le icon-button altrove.

### 5.3 Sidebar **[TELEBI]**

Due card impilate su canvas nero: **card 1** = le aree, **card 2** = le voci dell'area attiva.
Collassabile a `w-16` (solo il chip icona), stato in `localStorage`.

```tsx
// Telebi — src/components/Layout/AppSidebar.tsx
const CARD = 'rounded-xl bg-[#121212] border border-white/[0.06] shadow-[0_24px_60px_-30px_rgba(0,0,0,0.7)]';

function pillClass(active: boolean, collapsed: boolean): string {
  return cn(
    'group flex h-10 w-full items-center rounded-full font-medium transition-colors',
    collapsed ? 'justify-center px-1' : 'gap-2.5 pl-1.5 pr-3',
    active
      ? 'bg-neutral-200 text-neutral-900'          // ← attiva: pill CHIARA, non blu
      : 'text-white/70 hover:bg-white/[0.05] hover:text-white',
  );
}

function pillChipClass(active: boolean): string {
  return cn(
    'flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full transition-colors',
    active ? 'bg-neutral-900/10 text-neutral-900' : 'bg-white/[0.07] text-white',
  );
}
```

Larghezze: `w-60` espansa, `w-16` collassata, contenitore `pl-3 py-3`, `hidden md:block`.

> Nota: la voce **attiva della sidebar è chiara** (`bg-neutral-200`), non blu. Il blu è delle
> pill di tab. Sono due cose diverse e in Telebi non si confondono mai.

**[AGGIUNTA]** Tom ha una sola "area": la card 1 delle divisioni non serve. Tengo **una sola
card** con le voci di menu, stessa geometria e stesse `pillClass`. Il collasso resta.

**[AGGIUNTA]** Senza header, la card è l'intera cornice dell'app ed è divisa in **tre fasce**
separate da un filo `border-white/[0.06]`, così si leggono come tre cose diverse e non come una
lista sola:

| Fascia | Contenuto | Classi |
|---|---|---|
| 1 — marchio | `Gestionale` in `text-white/50` + `Tom` in `font-semibold text-white`, link a `/` | `border-b border-white/[0.06] py-3.5 px-4` |
| 2 — nav | etichetta `MENU` + le pill di `NAV_ITEMS` | `flex-1 overflow-y-auto p-3` |
| 3 — utente | avatar `T` + data estesa di oggi | `border-t border-white/[0.06] py-3 px-4` |

Il marchio è **allineato a sinistra**, sulla stessa colonna delle voci sotto: in un gestionale
la colonna di sinistra è una sola. Niente logo, niente icona: solo la parola.

Da collassata (`w-16`) restano il bottone di collasso, le icone e l'avatar — la data passa nel
`title` dell'avatar, l'etichetta `MENU` e il marchio spariscono.

### 5.4 Responsive **[TELEBI]**

- `md` (768px) è la soglia: sotto, Telebi monta uno **shell mobile separato** (`MobileShell`:
  topbar + bottom nav + FAB), non una sidebar che si nasconde
- Pagine full-height: Telebi usa `md:h-[calc(100dvh-84px)] flex flex-col` — 84px = header 56 +
  padding 12+16. **In Tom l'header non c'è (§5.2): sono `calc(100dvh-28px)`**, solo il padding
- Griglie: `grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 min-[1920px]:grid-cols-6`

**[AGGIUNTA]** Per Tom, primo rilascio desktop-first: sotto `md` le pagine scorrono
normalmente e le tabelle scrollano in orizzontale. Niente `MobileShell` finché non serve —
è un secondo shell da mantenere.

---

## 6. I pattern, con il codice vero

### 6.1 Testata di pagina **[TELEBI]**

**Un solo componente per tutte le pagine.** Il commento nel file è esplicito: prima
convivevano una ventina di `<h1>` diversi.

```tsx
// Telebi — src/components/ui/page-header.tsx (usato in 120 file)
<div className={cn('space-y-4', className)}>
  {breadcrumb && (
    <Link to={breadcrumb.to}
      className="inline-flex items-center gap-1.5 text-sm text-white/45 hover:text-white transition-colors">
      <ChevronLeft className="h-4 w-4" />
      {breadcrumb.label}
    </Link>
  )}
  <div className="flex items-end justify-between gap-4 flex-wrap">
    <div className="min-w-0">
      {eyebrow && <p className="text-[10px] uppercase tracking-wider text-white/40 font-semibold">{eyebrow}</p>}
      <h1 className={cn('text-2xl font-bold tracking-tight text-white', eyebrow && 'mt-1', titleClassName)}>
        {title}
      </h1>
      {subtitle && <p className="text-[12px] text-white/40 mt-0.5">{subtitle}</p>}
      {meta && <div className="mt-3">{meta}</div>}
    </div>
    {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
  </div>
</div>
```

Uso: `title` = il dato (nome cliente, numero preventivo), `subtitle` = cosa si fa in quella pagina.

> ⚠️ **Due strade in Telebi per il breadcrumb**: `PageHeader breadcrumb={{to, label}}`
> (ChevronLeft + label) **oppure** una riga scritta a mano con `ArrowLeft` + `/` + codice
> (`AnagraficaClienteDetail`). **Uso solo la prima**, che è quella del componente condiviso.

### 6.2 Fila di tab / filtri **[TELEBI]**

> Da `ONBOARDING-GRAFICO.md` §8: *«La fila di bottoni sotto il sottotitolo ha UNO stile solo…
> Non si riscrive a mano: si usa `TabPills`. Lo stile si cambia lì e cambia ovunque.»*

```tsx
// Telebi — src/components/ui/tab-pills.tsx
export const TAB_PILLS_CONTAINER =
  'flex items-center gap-0.5 p-0.5 rounded-full bg-white/[0.04] border border-white/[0.08]';
export const TAB_PILL_ITEM =
  'shrink-0 h-7 px-3 rounded-full inline-flex items-center gap-1.5 text-xs font-medium transition-colors whitespace-nowrap';
export const TAB_PILL_ACTIVE_BRAND = 'bg-[#1E6FFF] text-white';   // ← il default dal 2026-08-05
export const TAB_PILL_ACTIVE       = 'bg-white/[0.15] text-white'; // tone="neutral", raro
export const TAB_PILL_INACTIVE     = 'text-white/45 hover:text-white/80';
export const TAB_PILL_ICON         = 'w-3.5 h-3.5';
```

Il contenitore scrolla in orizzontale sotto `sm`:
`'max-w-full overflow-x-auto scrollbar-hide flex-nowrap sm:inline-flex sm:max-w-none sm:overflow-visible'`

Badge di conteggio dentro la pill:

```tsx
<span className={cn(
  'inline-flex items-center justify-center min-w-[18px] h-[16px] px-1 rounded-full text-[10px] font-semibold tabular-nums',
  active ? 'bg-white/20 text-white' : 'bg-white/[0.06] text-white/50',
)}>{count}</span>
```

`TabPills` serve **tre** ruoli diversi in Telebi, e vanno tutti bene: filtri di lista, switch di
vista, e jump-nav sticky fra le sezioni di una pagina di dettaglio.

### 6.3 Bottoni **[TELEBI + AGGIUNTA]**

**Il fatto:** in Telebi il `Button` di shadcn è rimasto quello di default (`h-10 rounded-md
bg-primary`), e le pagine lo scavalcano scrivendo `<button>` con le classi pill a mano. Le
classi però sono sempre le stesse. **Decisione presa: le codifico nelle varianti di `Button`.**
Stesso aspetto, scritto una volta.

Le classi reali da cui parto, prese dalla toolbar dell'anagrafica clienti:

```tsx
// Telebi — src/pages/commerciali/AnagraficaClienti.tsx (markup a mano, da consolidare)

// primaria
className="flex items-center gap-1.5 h-8 px-3 rounded-full text-xs font-medium transition-all
           bg-[#1E6FFF] hover:bg-[#1E6FFF]/90 text-white"

// secondaria
className="flex items-center gap-1.5 h-8 px-3 rounded-full text-xs font-medium transition-all
           bg-white/[0.04] border border-white/[0.08] text-white/70 hover:text-white hover:bg-white/[0.08]"

// solo icona
className="h-8 w-8 flex items-center justify-center rounded-full
           bg-white/[0.04] border border-white/[0.08] text-white/50 hover:text-white hover:bg-white/[0.08] transition-colors"

// ghost dentro una riga di tabella
className="h-8 w-8 p-0 text-white/50 hover:text-white hover:bg-white/[0.06]"

// dentro un dialog (più alto)
className="bg-[#1E6FFF] hover:bg-[#1a5fe6] text-white rounded-full h-10 px-5 text-[13px] font-semibold"
```

Sintesi in varianti CVA **[AGGIUNTA]** — nessun colore nuovo, solo riorganizzati:

| variant | Classi |
|---|---|
| `primary` | `bg-[#1E6FFF] hover:bg-[#1E6FFF]/90 text-white` |
| `secondary` | `bg-white/[0.04] border border-white/[0.08] text-white/70 hover:text-white hover:bg-white/[0.08]` |
| `ghost` | `text-white/50 hover:text-white hover:bg-white/[0.06]` |
| `danger` | `bg-red-500/15 border border-red-500/30 text-red-300 hover:bg-red-500/25` |

| size | Classi |
|---|---|
| `sm` | `h-8 px-3 text-xs gap-1.5` — toolbar, il default |
| `md` | `h-9 px-4 text-[13px] gap-1.5` — header di dettaglio |
| `lg` | `h-10 px-5 text-[13px] font-semibold` — dialog |
| `icon` | `h-8 w-8` |

Base comune: `inline-flex items-center justify-center rounded-full font-medium transition-colors
whitespace-nowrap disabled:opacity-50 disabled:pointer-events-none`.
Icona dentro un bottone `sm`: `w-3.5 h-3.5`.

### 6.4 Tabella **[TELEBI]**

Due implementazioni convivono in Telebi: `DarkTable` (42 file, componente) e `<table>` a mano
dentro una card (`CustomerList`). **Uso `DarkTable`**, che è il componente condiviso.

```tsx
// Telebi — src/components/ui/dark-table.tsx — struttura d'uso
<DarkTable
  loading={isLoading}
  empty={rows.length === 0}
  emptyMessage="Nessun cliente"
  emptyDescription="Prova a modificare i filtri di ricerca"
  emptyIcon={Users}
>
  <DarkTableHeader sticky>
    <DarkTableHead>Cliente</DarkTableHead>
    <DarkTableHead align="right">Importo</DarkTableHead>
  </DarkTableHeader>
  <DarkTableBody>
    {rows.map((r, i) => (
      <DarkTableRow key={r.id} zebraIndex={i} onRowClick={() => open(r)}>
        <DarkTableCell>{r.nome}</DarkTableCell>
        <DarkTableCell align="right" tabular>{fmtEuro(r.importo)}</DarkTableCell>
      </DarkTableRow>
    ))}
  </DarkTableBody>
</DarkTable>
```

Le classi interne, che sono il contratto visivo:

```tsx
// wrapper
'overflow-x-auto -mx-2'                    // + 'flex-1 min-h-0 overflow-y-auto' se fillContainer
// <table>
'w-full text-[12.5px]'
// <thead>
sticky ? 'sticky top-0 z-10 bg-[#141414]' : 'bg-white/[0.02]'
// <tr> di header
'text-left text-[10px] uppercase tracking-[0.04em] text-white/40 h-9 font-medium border-b border-white/[0.06]'
// <th>
'px-3 font-medium whitespace-nowrap'
// <tr> di corpo
'border-b border-white/[0.04] transition-colors'
  + selected ? 'bg-[#1E6FFF]/[0.10]'
  : zebra    ? 'bg-white/[0.015] hover:bg-white/[0.04]'
             : 'hover:bg-white/[0.04]'
// <td>
'px-3 py-2.5'   // + 'font-mono text-[12px]' se mono, 'tabular-nums' se numerico
```

Lo skeleton di caricamento è dentro il componente:

```tsx
{Array.from({ length: loadingRows }).map((_, i) => (
  <div key={i} className="h-12 rounded bg-white/[0.03] border border-white/[0.06] animate-pulse" />
))}
```

La tabella vive **dentro** un contenitore card:

```tsx
<div className="bg-[#111111] border border-white/[0.06] rounded-[20px] overflow-hidden">
```

### 6.5 Sezione / card **[TELEBI]**

```tsx
// Telebi — src/components/ui/dark-section.tsx
<section className={cn(
  'bg-[#111111] rounded-[20px]',
  !borderless && 'border border-white/[0.06]',
  compact ? 'p-4' : 'p-5',
  fillHeight && 'flex-1 min-h-0 flex flex-col overflow-hidden',
)}>
  <div className="flex items-center justify-between gap-3 mb-4">
    <div className="flex items-baseline gap-2 min-w-0">
      <h2 className="text-base font-semibold text-white truncate">{title}</h2>
      {hint && <span className="text-[11px] text-white/35 italic">{hint}</span>}
    </div>
    {action && <div className="shrink-0">{action}</div>}
  </div>
  {children}
</section>
```

La variante del **dettaglio** ha `p-6`, `mb-5` e `scroll-mt-20` per il jump-nav:

```tsx
// Telebi — src/pages/commerciali/AnagraficaClienteDetail.tsx
<section id={id} className="bg-[#111111] border border-white/[0.06] rounded-[20px] p-6 scroll-mt-20">
  <div className="flex items-center justify-between mb-5 gap-3">
    <h2 className="text-base font-semibold text-white">{title}</h2>
    {action}
  </div>
  {children}
</section>
```

### 6.6 Stato vuoto **[TELEBI]**

```tsx
// Telebi — src/components/ui/table-empty-state.tsx
<div className={`flex flex-col items-center justify-center text-center px-6 ${
  compact ? 'min-h-[160px] py-10' : 'min-h-[260px] py-16'}`}>
  {Icon && (
    <div className="w-12 h-12 rounded-full bg-white/[0.04] border border-white/[0.06] flex items-center justify-center mb-3">
      <Icon className="w-5 h-5 text-white/30" />
    </div>
  )}
  <p className="text-[13px] font-medium text-white/55">{title}</p>
  {description && <p className="text-[12px] text-white/35 mt-1.5 max-w-sm leading-relaxed">{description}</p>}
  {action && <div className="mt-4">{action}</div>}
</div>
```

Regola d'uso vista nelle pagine: se ci sono filtri attivi l'icona è `Search` e il testo dice
«Nessun risultato per i filtri», se la lista è proprio vuota l'icona è quella dell'entità e
l'azione è «Aggiungi il primo…».

### 6.7 Loading / errore / vuoto in un colpo solo **[TELEBI]**

```tsx
// Telebi — src/components/ui/data-state.tsx
export function DataState({ loading, error, isEmpty, skeleton, emptyState, errorState, onRetry, children }) {
  if (loading) return <>{skeleton ?? <ListSkeleton />}</>;
  if (error)   return <>{errorState ?? <DefaultErrorState onRetry={onRetry} />}</>;
  if (isEmpty) return <>{emptyState ?? <TableEmptyState title="Nessun dato." />}</>;
  return <>{children}</>;
}
```

Skeleton di lista: `<Skeleton className="h-16 rounded-2xl bg-white/[0.04]" />` ripetuto,
contenitore `space-y-2`.

Errore:

```tsx
<div className="rounded-2xl bg-[#111111] border border-red-500/20 p-6 flex flex-col items-center text-center gap-2">
  <AlertTriangle className="w-6 h-6 text-red-300/80" />
  <p className="text-[13px] text-white/70">Si è verificato un errore nel caricamento.</p>
  <button className="mt-1 h-8 px-3 rounded-full bg-white/[0.04] border border-white/[0.08] text-[12px] text-white/80 hover:bg-white/[0.08] transition-colors">
    Riprova
  </button>
</div>
```

### 6.8 KPI **[TELEBI]**

```tsx
// Telebi — src/components/ui/dark-kpi.tsx
<div className="bg-[#111111] border border-white/[0.06] rounded-[20px] p-4 flex items-center gap-3
                cursor-pointer hover:border-white/[0.18] transition-colors">
  <div className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0 border
                  bg-emerald-500/15 border-emerald-500/30">
    <Icon className="w-5 h-5 text-emerald-400" />
  </div>
  <div className="min-w-0">
    <p className="text-2xl font-bold text-white tabular-nums leading-none">
      {value}<span className="text-[11px] text-white/40 font-normal ml-0.5">{suffix}</span>
    </p>
    <p className="text-[11px] uppercase tracking-wider text-white/45 mt-1">{label}</p>
  </div>
</div>
```

Con `valueFormatted` (es. `"€ 12.480"`) il valore scende a `text-lg truncate`.

### 6.9 Badge di stato **[TELEBI]**

```tsx
// Telebi — src/components/ui/status-pill.tsx
// variant="dot" — per la COLONNA STATO di una tabella
<span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[10.5px] font-semibold whitespace-nowrap
                 border-white/[0.08] bg-white/[0.04] text-white/70">
  <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', STATUS_PILL_DOT[accent])} />
  {children}
</span>

// variant="solid" (default) — per ETICHETTE e CONTATORI
<span className={cn(
  'inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10.5px] font-semibold whitespace-nowrap',
  STATUS_PILL_ACCENT[accent],
)}>
  {Icon && <Icon className="w-3 h-3" />}
  {children}
</span>
```

> Da `UI-BADGE.md`: *«non si scrive mai a mano `inline-flex … rounded-full … px-2 py-0.5
> text-[10.5px]`. Se `StatusPill` non basta, si estende `StatusPill` — non si apre una seconda
> strada.»* Il perché del `dot`: in una colonna con dieci righe, dieci pillole piene diventano
> una bandiera e il testo smette di leggersi.

### 6.10 Drawer di creazione **[TELEBI]**

```tsx
// Telebi — src/components/Commercial/EntityDrawerShell.tsx
const sizeMap = { sm: 'sm:max-w-[460px]', md: 'sm:max-w-[640px]', lg: 'sm:max-w-[800px]', xl: 'sm:max-w-[1120px]' };

<SheetOverlay className="bg-black/60" />
<SheetPrimitive.Content className={cn(
  'fixed top-3 bottom-3 right-0 z-[120] flex h-auto w-3/4 flex-col border border-white/[0.08] bg-[#131417] overflow-hidden',
  'transition ease-in-out data-[state=open]:animate-in data-[state=closed]:animate-out',
  'data-[state=closed]:duration-200 data-[state=open]:duration-300',
  'data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right',
  'rounded-tl-[20px] rounded-bl-[20px]', sizeMap[size])}>

  {/* header sticky */}
  <div className="sticky top-0 z-10 flex items-center justify-between border-b border-white/[0.06] bg-[#0d0f12] px-6 py-4">
    <div className="flex items-center gap-3">
      <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/[0.06]">
        <Icon className="h-4 w-4 text-white/60" />
      </div>
      <div>
        <h2 className="text-base font-semibold text-white">{title}</h2>
        <p className="text-xs text-white/40">{subtitle}</p>
      </div>
    </div>
    <SheetPrimitive.Close className="rounded-lg p-2 text-white/40 transition-colors hover:bg-white/[0.06] hover:text-white">
      <X className="h-4 w-4" />
    </SheetPrimitive.Close>
  </div>

  {/* corpo scrollabile */}
  <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>

  {/* footer sticky */}
  <div className="sticky bottom-0 flex items-center justify-end gap-3 border-t border-white/[0.06] bg-[#0d0f12] px-6 py-4">
    {footer}
  </div>
</SheetPrimitive.Content>
```

### 6.11 Form **[TELEBI]** — con RHF + zod **[AGGIUNTA]**

Le classi sono di Telebi, l'orchestrazione è react-hook-form + zod (deciso).

```tsx
// Telebi — src/components/Commercial/NewCustomerDrawer.tsx
const inputCls = 'bg-white/[0.04] border-white/[0.08] text-white h-8 text-sm placeholder:text-white/25 focus-visible:ring-white/10 rounded-lg';
const labelCls = 'text-white/40 text-[10px] uppercase tracking-widest font-medium block mb-1.5';

function SectionBox({ title, children }) {
  return (
    <div className="rounded-xl border border-white/[0.07] bg-white/[0.03] p-5">
      <h3 className="text-[11px] font-semibold text-white/50 uppercase tracking-widest mb-4">{title}</h3>
      {children}
    </div>
  );
}
```

Campo completo, con l'errore sotto:

```tsx
<div>
  <Label className={labelCls}>Partita IVA *</Label>
  <Input {...register('partitaIva')} placeholder="es. IT01234567890" className={`${inputCls} font-mono`} />
  {errors.partitaIva && <p className="text-red-400 text-xs mt-1">{errors.partitaIva.message}</p>}
</div>
```

Layout dei campi: `grid grid-cols-2 gap-3` per le coppie, campo pieno per gli indirizzi e le note.
L'asterisco `*` nella label marca l'obbligatorio. I codici (P.IVA, C.F., targhe) portano
`font-mono`; il C.F. anche `uppercase`.

Il toggle custom di Telebi, se serve un booleano in evidenza:

```tsx
<span className={`relative h-[20px] w-[36px] rounded-full transition-colors shrink-0 ${
  checked ? 'bg-[#1E6FFF]' : 'bg-white/15'}`}>
  <span className={`absolute top-1/2 -translate-y-1/2 h-[15px] w-[15px] rounded-full bg-white transition-all ${
    checked ? 'left-[18px]' : 'left-[3px]'}`} />
</span>
```

### 6.12 Pagina di dettaglio **[TELEBI]**

Struttura: breadcrumb → header con azioni → `TabPills` sticky come jump-nav → griglia 8/4.

```tsx
// Telebi — src/pages/commerciali/AnagraficaClienteDetail.tsx
<div className="p-3 space-y-5">
  <PageHeader breadcrumb={{ to: '/clienti', label: 'Clienti' }} title={cliente.nome}
              subtitle="Scheda cliente · anagrafica, luoghi, interventi" actions={…} />

  <TabPills className="sticky top-2 z-10 backdrop-blur !mt-2"
    value={activeSection}
    onChange={(id) => { document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' }); setActiveSection(id); }}
    items={JUMP_SECTIONS} />

  <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
    <div className="lg:col-span-8 space-y-5">{/* SectionCard */}</div>
    <div className="lg:col-span-4 space-y-5">{/* SideCard */}</div>
  </div>
</div>
```

Campo in sola lettura / modificabile inline:

```tsx
// Telebi — VField
<div className="space-y-1">
  <div className="text-[10px] uppercase tracking-[0.04em] text-white/40 font-medium inline-flex items-center gap-1.5">
    {Icon && <Icon className="w-3 h-3" />}
    {label}
  </div>
  <div className="text-[13px] text-white">
    {value || <span className="text-white/30 italic">—</span>}
  </div>
</div>
```

Griglia dei campi dentro una SectionCard: `grid grid-cols-1 md:grid-cols-2 gap-5`.

SideCard (colonna 4/12):

```tsx
<div className="bg-[#111111] border border-white/[0.06] rounded-[20px] p-5">
  <h3 className="text-[10px] uppercase tracking-[0.06em] text-white/40 font-medium mb-3">{title}</h3>
  {children}
</div>
```

**La modifica è inline, al clic sul campo** — non c'è un drawer "modifica". Telebi lo dice
all'utente con una pill informativa nell'header: *«Clicca un campo per modificarlo»*.

### 6.13 Conferme distruttive **[TELEBI]**

```tsx
// Telebi — src/pages/commerciali/StagingOrderDetail.tsx
<AlertDialog open={!!pending} onOpenChange={(o) => { if (!o && !saving) setPending(null); }}>
  <AlertDialogContent className="bg-[#111111] border border-white/[0.08] text-white">
    <AlertDialogHeader>
      <AlertDialogTitle className="text-white">Eliminare il preventivo?</AlertDialogTitle>
      <AlertDialogDescription className="text-white/65 text-[12.5px] space-y-2">
        <span className="block">…</span>
        <span className="block text-amber-200/90">Questa azione non si può annullare.</span>
      </AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel disabled={saving}
        className="bg-white/[0.04] border border-white/[0.08] text-white/70 hover:text-white hover:bg-white/[0.08] rounded-full h-10 px-5 text-[13px]">
        Annulla
      </AlertDialogCancel>
      <AlertDialogAction onClick={(e) => { e.preventDefault(); confirm(); }} disabled={saving}
        className="bg-[#1E6FFF] hover:bg-[#1a5fe6] text-white rounded-full h-10 px-5 text-[13px] font-semibold">
        {saving ? 'Eliminazione…' : 'Elimina'}
      </AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

L'avviso importante va in `text-amber-200/90` dentro la descrizione. Il `disabled` durante il
salvataggio è su tutti e tre gli elementi (dialog, cancel, action).

**[AGGIUNTA]** In Telebi questo blocco è ricopiato in ogni pagina che serve. Per Tom ne faccio
**un componente** `ConfirmDialog` con le stesse identiche classi.

**[NON REPLICARE]** — `src/components/ui/bulk-delete-dialog.tsx` esiste ma usa
`bg-orange-50 border-orange-200 text-orange-800`: colori da tema chiaro su un'app scura. È un
residuo, non un pattern.

### 6.14 Toolbar di lista **[TELEBI]**

Riga sola, filtri a sinistra e azioni a destra, tutto alla **stessa altezza `h-8`**.

```tsx
// Telebi — src/pages/commerciali/AnagraficaClienti.tsx
<div className="flex flex-wrap items-center justify-between gap-2">
  <TabPills items={FILTRI} value={filtro} onChange={setFiltro} />

  <div className="flex items-center gap-2">
    <span className="text-xs text-white/45 tabular-nums whitespace-nowrap shrink-0">
      <span className="text-white/70 font-medium">{filtrati}</span> di {totale} clienti
    </span>
    <Button variant="primary" size="sm"><Plus className="w-3.5 h-3.5" />Nuovo cliente</Button>
  </div>
</div>
```

Il Select nella toolbar è ri-vestito a pill:

```tsx
<SelectTrigger className="h-8 w-auto min-w-[200px] gap-2 rounded-full border-0 bg-white/[0.04]
  ring-1 ring-inset ring-white/[0.08] text-xs font-medium text-white/85 hover:bg-white/[0.07]
  data-[state=open]:ring-[#1E6FFF]/40 transition-colors shrink-0" />
<SelectContent className="min-w-[var(--radix-select-trigger-width)] bg-[#15181B]" />
```

Il conteggio dei risultati è **testo semplice**, non un badge: accanto a una fila di pill un
badge leggerebbe come una pill in più.

### 6.15 Campo di ricerca **[TELEBI]**

La lente diventa spinner **nello stesso posto** mentre la ricerca lavora, con antisfarfallio
(compare dopo 120ms, resta almeno 400ms):

```tsx
// Telebi — src/components/ui/search-adornment.tsx
<div className="relative">
  <SearchAdornment busy={isFetching}
    className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40 w-4 h-4" />
  <Input value={q} onChange={…} placeholder="Cerca cliente, comune, P.IVA…"
    className={`${inputCls} pl-9 w-[260px]`} />
</div>
```

### 6.16 Paginazione **[TELEBI]**

```tsx
// Telebi — src/components/Commercial/ListiniPagination.tsx
<div className="flex flex-wrap items-center justify-end gap-3 px-4 py-3 border-t border-white/[0.06]">
  <div className="text-[11px] text-white/45 tabular-nums">
    Mostrando <span className="text-white/70 font-semibold">{da}–{a}</span> di{' '}
    <span className="text-white/70 font-semibold">{totale}</span> {itemType}
  </div>
  <Pagination className="w-auto">…</Pagination>
</div>
```

Numeri di pagina nascosti sotto `sm`, sostituiti da `{pagina} / {totali}`.

### 6.17 Toast **[TELEBI]**

`sonner`, in 172 file. Un solo `<Toaster />` montato in `App`.

```tsx
import { toast } from 'sonner';
toast.success('Preventivo salvato');
toast.error('Impossibile salvare: controlla i campi obbligatori');
```

---

## 7. Formattazione dei dati **[TELEBI]**

```ts
// Telebi — src/utils/formatters.ts
export const formatCurrency = (value: number): string =>
  new Intl.NumberFormat('it-IT', {
    style: 'currency', currency: 'EUR',
    minimumFractionDigits: 0, maximumFractionDigits: 0,
  }).format(value);

export const formatNumber = (value: number): string => new Intl.NumberFormat('it-IT').format(value);

// Telebi — src/lib/utils.ts
export function pluralize(n: number, singular: string, plural: string): string {
  return Math.abs(n) === 1 ? singular : plural;
}

/** "08 mag '26" */
export function fmtDateShort(d: Date | string | null | undefined): string {
  if (!d) return '—';
  const dt = typeof d === 'string' ? new Date(d) : d;
  if (isNaN(dt.getTime())) return '—';
  return dt.toLocaleDateString('it-IT', { day: '2-digit', month: 'short' })
    + " '" + String(dt.getFullYear()).slice(-2);
}
```

**[AGGIUNTA]** Per Tom gli importi hanno bisogno dei centesimi (un preventivo di € 1.240,50 non
si arrotonda): aggiungo `formatCurrency(value, { decimali: true })` con
`minimumFractionDigits: 2`. Telebi usa 0 decimali perché mostra volumi, non listini al cliente.

Valore assente: `—` in `text-white/30 italic` (mai una stringa vuota, mai `N/D`).

---

## 8. Animazioni **[TELEBI]**

Sobrie. `transition-colors` sugli hover, `transition-all` sui bottoni della toolbar. Il drawer
usa `tailwindcss-animate` con `slide-in-from-right` (300ms in, 200ms out).
`--transition-smooth: all 0.3s cubic-bezier(0.4, 0, 0.2, 1)`.

Utility da riportare, serve alle file di pill che scrollano:

```ts
// Telebi — tailwind.config.ts (plugin)
addUtilities({
  '.scrollbar-hide': {
    '-ms-overflow-style': 'none',
    'scrollbar-width': 'none',
    '&::-webkit-scrollbar': { display: 'none' },
  },
});
```

E la scrollbar globale sottile:

```css
* { scrollbar-width: thin; scrollbar-color: hsl(var(--card-border)) transparent; }
::-webkit-scrollbar { width: 6px; height: 6px; }
::-webkit-scrollbar-thumb { background: hsl(var(--card-border)); border-radius: 999px; }
```

---

## 9. Cosa lascio indietro, e perché

| Cosa | Perché |
|---|---|
| I ~200 token CSS di `index.css` (`--core--sizes--size-4`, `--globals--paddings--*`, `--telebi-navy`, `--cost-*`) | Tre generazioni sovrapposte, le pagine mature non ne leggono quasi nessuno. Scrivo un file di token che dichiara solo ciò che si usa davvero |
| `bulk-delete-dialog.tsx` | Colori da tema chiaro su app scura |
| Il `Button` shadcn di default | Non è mai stato adattato: le pagine lo scavalcano. Lo adatto una volta sola |
| `MobileShell` (topbar + bottom nav + FAB) | Secondo shell da mantenere, per due utenti desktop non serve al primo rilascio |
| Selettore azienda, chat AI, notifiche, dropdown team nell'header | Roba multi-tenant di NexSuite |
| Lo switcher varianti card A/B/C | L'autore stesso lo marca «TEMPORANEO» |
| `@tanstack/react-table` | 1 solo file su 1530. Non è un pattern |
