# Piano di costruzione — gestionale Tom

Sette step. Ognuno finisce con **qualcosa che si guarda a schermo**, e alla fine di ognuno mi
fermo e aspetto il tuo ok.

L'ordine è quello che hai indicato: la **dashboard è l'ultima**. Fatta per prima sarebbe una
schermata di numeri finti da rifare appena esistono le entità sotto.

Solo frontend, dati mock. Ogni accesso ai dati passa da `src/services/` (vedi
`CONVENTIONS.md` §4).

---

## Riepilogo

| Step | Cosa | Cosa vedi a schermo |
|---|---|---|
| 1 | Setup, design system, shell | L'app parte, sidebar e header navigabili, sei rotte vuote |
| 2 | Clienti | Elenco, dettaglio, creazione, modifica inline — il modulo completo |
| 3 | Preventivi | Elenco con stati, sopralluogo con foto, conversione in commessa |
| 4 | Commesse | Calendario, pianificazione, ore, foto prima/dopo, rapportino |
| 5 | Fatture | Emissione da commessa, acconti/saldi, scadenzario, solleciti |
| 6 | Costi | Carburante per mezzo, materiali, noleggi, smaltimento, fornitori |
| 7 | Dashboard | Aggrega tutto il resto |

Gli step 2→6 costruiscono l'uno sui pattern dell'altro: lo step 2 è quello che costa di più
perché è lì che nascono i pattern di lista, dettaglio e form. Dal 3 in poi si riusa.

---

## Step 1 — Setup, design system, shell

**Obiettivo:** `npm run dev` apre un'app con l'aspetto di Telebi e sei rotte navigabili, ancora
vuote.

### Configurazione

```
package.json                      dipendenze del §1.3 di CONVENTIONS.md
vite.config.ts                    plugin react-swc, alias @ → ./src
tsconfig.json                     strict: true, paths @/*
tsconfig.app.json  tsconfig.node.json
tailwind.config.ts                Urbanist, darkMode class, plugin animate + .scrollbar-hide
postcss.config.js
eslint.config.js
components.json                   shadcn: style default, cssVariables, alias @/components
index.html                        Urbanist da Google Fonts, sfondo pre-mount #0a0a0a, lang it-IT
.gitignore
```

### Fondamenta

```
src/main.tsx                      createRoot + IconContext Phosphor (weight regular)
src/index.css                     @tailwind + i token del design system, ripuliti
src/App.tsx                       QueryClientProvider, RouterProvider, Toaster sonner
src/lib/utils.ts                  cn(), pluralize(), fmtDateShort()
src/lib/formatters.ts             formatCurrency, formatNumber, formatOre, formatData
src/lib/navigation.ts             NAV_ITEMS — fonte unica del menu
src/vite-env.d.ts
```

### Design system (`src/components/ui/`)

I componenti riportati da Telebi, in quest'ordine perché il secondo gruppo usa il primo:

```
icons.ts                          shim Phosphor con i nomi Lucide, solo le icone che servono
button.tsx                        varianti primary/secondary/ghost/danger — DESIGN_SYSTEM §6.3
input.tsx  label.tsx  textarea.tsx  select.tsx  checkbox.tsx
skeleton.tsx  separator.tsx  spinner.tsx
sheet.tsx  dialog.tsx  alert-dialog.tsx  popover.tsx  tooltip.tsx
page-header.tsx                   DESIGN_SYSTEM §6.1
tab-pills.tsx                     DESIGN_SYSTEM §6.2 — + le costanti esportate
status-pill.tsx                   DESIGN_SYSTEM §6.9
dark-section.tsx                  DESIGN_SYSTEM §6.5
dark-table.tsx                    DESIGN_SYSTEM §6.4
dark-kpi.tsx                      DESIGN_SYSTEM §6.8
table-empty-state.tsx             DESIGN_SYSTEM §6.6
data-state.tsx                    DESIGN_SYSTEM §6.7
search-adornment.tsx              DESIGN_SYSTEM §6.15
pagination.tsx                    DESIGN_SYSTEM §6.16
entity-drawer.tsx                 DESIGN_SYSTEM §6.10
confirm-dialog.tsx                DESIGN_SYSTEM §6.13 — [AGGIUNTA] il componente che Telebi non ha
form-field.tsx                    [AGGIUNTA] label + input + errore, le classi di §6.11
```

### Shell (`src/components/layout/`)

```
AppLayout.tsx                     header + sidebar + main, scroll reset — DESIGN_SYSTEM §5.1
AppHeader.tsx                     h-14, logo, data, avatar — senza la roba NexSuite
AppSidebar.tsx                    una card, pillClass di Telebi, collasso in localStorage
PageLoader.tsx                    fallback del Suspense
```

### Pagine segnaposto (`src/pages/`)

```
Dashboard.tsx
clienti/ClientiList.tsx           PageHeader + TableEmptyState "Arriva allo step 2"
preventivi/PreventiviList.tsx
commesse/CommesseList.tsx
fatture/FattureList.tsx
costi/CostiList.tsx
NotFound.tsx
```

### Verifica

- `npm run dev` e l'app apre senza errori in console
- la sidebar elenca le sei voci, la voce attiva è la pill chiara, il collasso funziona e
  sopravvive al reload
- ogni rotta apre la sua pagina con la testata giusta
- una `<StatusPill>` e un `<DarkKpi>` di prova hanno esattamente l'aspetto di Telebi
- `npx tsc -p tsconfig.app.json --noEmit` esce pulito

---

## Step 2 — Clienti

**Obiettivo:** il modulo completo. È lo step che definisce i pattern per tutti gli altri.

### Modello

Quattro tipi di cliente — privato, condominio, azienda, ente pubblico — con i campi che
cambiano per tipo, e **indirizzo di fatturazione separato dai luoghi di intervento**.

```ts
// src/types/cliente.ts
type TipoCliente = 'privato' | 'condominio' | 'azienda' | 'ente_pubblico';

interface Cliente {
  id, tipo, denominazione,
  codiceFiscale?, partitaIva?, codiceDestinatario?, pec?,   // fatturazione elettronica futura
  referente?: { nome, ruolo, telefono, email },             // l'amministratore, per i condomini
  telefono?, email?,
  indirizzoFatturazione: Indirizzo,
  luoghiIntervento: LuogoIntervento[],                      // 0..n, uno marcato principale
  note?, creatoIl, aggiornatoIl,
}
interface LuogoIntervento { id, etichetta, indirizzo: Indirizzo, note?, accessoMezzi?: 'facile'|'medio'|'difficile' }
interface Indirizzo { via, civico, cap, comune, provincia }
```

Lo **storico interventi** non è un campo: è una query su commesse e preventivi del cliente. Allo
step 2 la sezione esiste con lo stato vuoto giusto e si popola agli step 3 e 4.

### File

```
src/types/cliente.ts
src/mocks/clienti.ts              ~24 clienti dei quattro tipi, vedi CONVENTIONS §8
src/services/clientiService.ts    list(filtri) getById create update remove
src/hooks/useClienti.ts           useClienti, useCliente, useCreaCliente, useAggiornaCliente, useEliminaCliente

src/pages/clienti/ClientiList.tsx
src/pages/clienti/ClienteDetail.tsx

src/components/clienti/ClientiTable.tsx        DarkTable
src/components/clienti/ClientiToolbar.tsx      TabPills per tipo + ricerca + Nuovo
src/components/clienti/ClienteDrawer.tsx       creazione, EntityDrawer + RHF/zod
src/components/clienti/ClienteAnagrafica.tsx   SectionCard, campi inline
src/components/clienti/LuoghiIntervento.tsx    lista + aggiungi/modifica/elimina
src/components/clienti/TipoClienteBadge.tsx    StatusPill accent per tipo

src/components/shared/IndirizzoFields.tsx      via/civico/cap/comune/provincia — riusato ovunque
src/components/shared/IndirizzoCard.tsx        indirizzo in sola lettura
```

### Note di costruzione

- I campi **cambiano per tipo**: al condominio serve il referente amministratore, all'ente il
  codice destinatario, al privato il codice fiscale. Lo schema zod è un discriminated union
  su `tipo` — così la validazione dice la verità e i campi non richiesti non compaiono.
- La lista ha **due viste**, tabella e card, con lo switch di `CustomerFilters` (Telebi). Se
  preferisci solo la tabella, si taglia: dimmelo allo step.
- Elimina un cliente che ha commesse → il `ConfirmDialog` lo dice invece di lasciar fare.

### Verifica

- filtro per tipo, ricerca per nome/comune/P.IVA, ordinamento, paginazione, stati vuoti giusti
  (nessun risultato ≠ nessun cliente)
- creo un cliente dal drawer: la validazione parla italiano, il record compare in lista
- apro il dettaglio, modifico un campo inline, il valore resta
- aggiungo due luoghi di intervento a un condominio
- elimino con conferma

---

## Step 3 — Preventivi

**Obiettivo:** il ciclo bozza → inviato → accettato/rifiutato/scaduto, con la scheda
sopralluogo, e la conversione in commessa.

### Modello

```ts
type StatoPreventivo = 'bozza' | 'inviato' | 'accettato' | 'rifiutato' | 'scaduto';

interface Preventivo {
  id, numero,                                  // PR-2026-0042
  clienteId, luogoInterventoId,
  stato: StatoPreventivo,
  dataEmissione, validoFino, dataInvio?, dataEsito?,
  sopralluogo: SchedaSopralluogo,
  righe: RigaPreventivo[],
  imponibile, aliquotaIva, totale,             // calcolati dalle righe
  note?, commessaId?,                          // valorizzato alla conversione
}

interface SchedaSopralluogo {
  dataSopralluogo?, foto: Foto[],
  alberi: RilievoAlbero[],
  accessibilita: 'facile' | 'media' | 'difficile',
  criticita: Criticita[],                      // cavi_elettrici, vicinanza_edifici, traffico, pendenza…
  noteTecniche?,
}
interface RilievoAlbero { id, specie, altezzaM, diametroCm, quantita, lavorazione, note? }
interface RigaPreventivo { id, descrizione, quantita, unita, prezzoUnitario, importo }
```

### File

```
src/types/preventivo.ts
src/mocks/preventivi.ts           ~30, tutti gli stati rappresentati, agganciati ai clienti dello step 2
src/mocks/specieAlberi.ts         [AGGIUNTA] elenco specie per l'autocomplete
src/services/preventiviService.ts + convertiInCommessa(id)
src/hooks/usePreventivi.ts

src/pages/preventivi/PreventiviList.tsx
src/pages/preventivi/PreventivoNuovo.tsx       pagina, non drawer — il form è lungo
src/pages/preventivi/PreventivoDetail.tsx

src/components/preventivi/PreventiviTable.tsx
src/components/preventivi/PreventiviToolbar.tsx     TabPills per stato con contatori
src/components/preventivi/StatoPreventivoBadge.tsx
src/components/preventivi/SopralluogoForm.tsx       specie, altezza, diametro, accessibilità, criticità
src/components/preventivi/RilievoAlberiTable.tsx    righe di rilievo, aggiungi/rimuovi
src/components/preventivi/RighePreventivoTable.tsx  righe economiche con totali in coda
src/components/preventivi/CriticitaSelect.tsx       multi-select a pill
src/components/preventivi/ConvertiInCommessaDialog.tsx

src/components/shared/FotoUploader.tsx         [AGGIUNTA] richiede react-dropzone — te lo chiedo prima
src/components/shared/FotoGallery.tsx          griglia + lightbox
src/components/shared/ClienteSelect.tsx        combobox con ricerca
```

### Note di costruzione

- **`scaduto` è derivato, non salvato**: un preventivo `inviato` con `validoFino` passata si
  legge scaduto. Salvarlo richiederebbe un job che nessuno fa girare.
- Il **totale non si salva in un campo modificabile**: si calcola dalle righe. Se un giorno
  serve uno sconto a totale, è una riga negativa.
- Le foto nei mock sono `data:` URI o file in `public/mocks/` — mai URL esterni, che offline
  danno riquadri rotti.
- **Conversione in commessa**: dialog di conferma, crea la commessa, imposta `commessaId`, porta
  il preventivo ad `accettato`, e naviga alla commessa nuova. Allo step 3 la commessa non esiste
  ancora: lascio la funzione nel service con un TODO esplicito e la collego allo step 4.

### Verifica

- filtro per stato con i contatori nelle pill, ricerca per numero/cliente
- creo un preventivo: scelgo cliente e luogo, compilo il sopralluogo, carico due foto,
  aggiungo tre alberi e quattro righe, il totale torna
- cambio stato: bozza → inviato → accettato
- un preventivo con `validoFino` nel passato si mostra scaduto
- dal dettaglio cliente (step 2) vedo i suoi preventivi

---

## Step 4 — Commesse

**Obiettivo:** pianificazione a calendario, ore previste contro reali, foto prima/dopo,
rapportino firmato.

### Modello

```ts
type StatoCommessa = 'da_pianificare' | 'pianificata' | 'in_corso' | 'completata' | 'sospesa' | 'annullata';

interface Commessa {
  id, numero,                                  // CM-2026-0031
  preventivoId?, clienteId, luogoInterventoId,
  stato: StatoCommessa,
  dataPianificata?, dataInizio?, dataFine?,
  orePreviste, oreReali,                       // previste dal preventivo, reali dai rapportini
  lavorazioni: Lavorazione[],
  fotoPrima: Foto[], fotoDopo: Foto[],
  rapportino?: Rapportino,
  avanzamentoPct,                              // da lavorazioni completate
  note?, fatturaId?,
}
interface Lavorazione { id, descrizione, orePreviste, oreReali?, completata }
interface Rapportino { dataCompilazione, oreLavorate, operatori: string[], materialiUsati?, noteCliente?, firmaCliente?, firmatoIl? }
```

### File

```
src/types/commessa.ts
src/mocks/commesse.ts
src/services/commesseService.ts  + generaFattura(id)
src/hooks/useCommesse.ts

src/pages/commesse/CommesseList.tsx            due viste: elenco e calendario
src/pages/commesse/CommessaNuova.tsx
src/pages/commesse/CommessaDetail.tsx

src/components/commesse/CommesseTable.tsx
src/components/commesse/CommesseCalendario.tsx      [AGGIUNTA] mese, commesse nelle celle
src/components/commesse/CommesseToolbar.tsx         TabPills stato + switch elenco/calendario
src/components/commesse/StatoCommessaBadge.tsx
src/components/commesse/LavorazioniTable.tsx        previste vs reali, checkbox completata
src/components/commesse/OreConfronto.tsx            barra previste/reali con scostamento
src/components/commesse/FotoPrimaDopo.tsx           due colonne affiancate
src/components/commesse/RapportinoForm.tsx
src/components/commesse/FirmaCliente.tsx            [AGGIUNTA] canvas per la firma
src/components/commesse/AvanzamentoBar.tsx
```

### Note di costruzione

- **Il calendario è la mia aggiunta più grossa**: Telebi ha un calendario ma è un altro
  impianto (presenze e appuntamenti). Costruisco una griglia mensile con i token del design
  system — celle `bg-[#111111] border-white/[0.06]`, commesse come `StatusPill` dentro la
  cella. Se preferisci partire dal solo elenco e rimandare il calendario, si taglia qui: è il
  pezzo più grosso e più rimandabile dello step 4.
- **La firma su canvas** è l'unica cosa in tutto il progetto senza precedenti in Telebi. Se
  preferisci, allo step 4 metto un segnaposto («firma raccolta su carta») e la faccio dopo.
- **Ore reali dal rapportino, non a mano**: `oreReali` è la somma delle lavorazioni. Se un
  giorno serve correggerla, è una lavorazione di rettifica.
- Qui **chiudo la conversione preventivo → commessa** lasciata aperta allo step 3.

### Verifica

- creo una commessa dal preventivo accettato dello step 3 e i dati arrivano già compilati
- la pianifico su una data, compare nel calendario
- carico foto prima, avvio, completo le lavorazioni, carico foto dopo
- compilo il rapportino, firmo, l'avanzamento va al 100% e lo stato a completata
- il confronto ore mostra lo scostamento
- dal dettaglio cliente vedo lo storico interventi (finalmente pieno)

---

## Step 5 — Fatture

**Obiettivo:** emissione da commessa, acconti e saldi, scadenzario incassi, solleciti.
**La fattura elettronica non si implementa** — si predispongono solo i campi.

### Modello

```ts
type StatoFattura = 'bozza' | 'emessa' | 'pagata_parziale' | 'pagata' | 'scaduta';
type TipoFattura  = 'acconto' | 'saldo' | 'unica';

interface Fattura {
  id, numero, tipo, commessaId?, clienteId,
  stato: StatoFattura,
  dataEmissione, dataScadenza,
  righe: RigaFattura[],
  imponibile, iva, totale, totaleIncassato, residuo,
  incassi: Incasso[],
  solleciti: Sollecito[],
  // predisposizione fattura elettronica — compilati, non trasmessi
  codiceDestinatario?, pec?, regimeFiscale?, tipoDocumento?, modalitaPagamento?,
  note?,
}
interface Incasso  { id, data, importo, modalita: 'bonifico'|'contanti'|'assegno'|'carta', riferimento? }
interface Sollecito { id, data, tipo: 'email'|'telefonata'|'raccomandata', esito?, note? }
```

### File

```
src/types/fattura.ts
src/mocks/fatture.ts
src/services/fattureService.ts    + registraIncasso, registraSollecito
src/hooks/useFatture.ts

src/pages/fatture/FattureList.tsx
src/pages/fatture/FatturaNuova.tsx
src/pages/fatture/FatturaDetail.tsx
src/pages/fatture/Scadenzario.tsx              vista per scadenza, non per numero

src/components/fatture/FattureTable.tsx
src/components/fatture/FattureToolbar.tsx
src/components/fatture/StatoFatturaBadge.tsx
src/components/fatture/RigheFatturaTable.tsx        con riepilogo imponibile/IVA/totale
src/components/fatture/IncassiTable.tsx
src/components/fatture/RegistraIncassoDialog.tsx
src/components/fatture/SollecitiTable.tsx
src/components/fatture/DatiFatturazioneElettronica.tsx   SectionCard "predisposta, non trasmessa"
src/components/fatture/EmettiDaCommessaDialog.tsx        acconto % o saldo
```

### Note di costruzione

- **Lo stato è derivato dagli incassi**, non scelto a mano: residuo = totale → `emessa`;
  0 < incassato < totale → `pagata_parziale`; residuo = 0 → `pagata`; scadenza passata e
  residuo > 0 → `scaduta`. Un campo `stato` modificabile a mano diverge dai numeri il primo
  giorno.
- **Acconto e saldo sono due fatture**, legate alla stessa commessa. Il saldo propone
  `totale commessa − acconti già emessi`.
- La sezione fattura elettronica **dice esplicitamente in pagina** che i dati sono raccolti e
  non trasmessi, così nessuno pensa che siano partiti.
- **Lo scadenzario ordina per `dataScadenza` crescente** e colora l'urgenza: scaduta `danger`,
  entro 7 giorni `amber`, oltre `neutral`.

### Verifica

- emetto un acconto 30% dalla commessa completata dello step 4, poi il saldo
- registro un incasso parziale: lo stato passa a `pagata_parziale` e il residuo torna
- lo scadenzario mette in cima le scadute
- registro un sollecito su una scaduta
- i campi di fatturazione elettronica sono compilabili e la pagina dice che non si trasmette

---

## Step 6 — Costi

**Obiettivo:** carburante distinto per mezzo, materiali di consumo, noleggi, smaltimento,
fornitori. È lo step che rende possibile la marginalità (fuori dal primo rilascio).

### Modello

```ts
type CategoriaCosto = 'carburante' | 'materiali' | 'noleggio' | 'smaltimento' | 'manodopera_esterna' | 'altro';

interface Costo {
  id, data, categoria, descrizione,
  importo, quantita?, unita?,
  fornitoreId?, commessaId?,                   // se imputato a una commessa
  mezzoId?,                                    // obbligatorio se categoria = carburante
  tipoNoleggio?: 'piattaforma_aerea' | 'gru' | 'camion' | 'cippatrice' | 'altro',
  numeroDocumento?, note?,
}
interface Fornitore { id, ragioneSociale, partitaIva?, categoria: CategoriaCosto[], telefono?, email?, indirizzo?, note? }
interface Mezzo     { id, targa, descrizione, tipo }   // anticipo minimo del modulo futuro
```

### File

```
src/types/costo.ts
src/mocks/costi.ts  src/mocks/fornitori.ts  src/mocks/mezzi.ts
src/services/costiService.ts  src/services/fornitoriService.ts
src/hooks/useCosti.ts  src/hooks/useFornitori.ts

src/pages/costi/CostiList.tsx
src/pages/costi/CostoDetail.tsx
src/pages/costi/FornitoriList.tsx
src/pages/costi/FornitoreDetail.tsx

src/components/costi/CostiTable.tsx
src/components/costi/CostiToolbar.tsx           TabPills per categoria + periodo
src/components/costi/CostoDrawer.tsx            campi condizionati alla categoria
src/components/costi/CategoriaCostoBadge.tsx
src/components/costi/CostiPerCategoria.tsx      riepilogo del periodo
src/components/costi/CostiPerMezzo.tsx          il carburante spaccato per targa
src/components/costi/FornitoriTable.tsx
src/components/costi/FornitoreDrawer.tsx
```

### Note di costruzione

- **`mezzoId` è obbligatorio quando la categoria è carburante** — è il requisito «carburante
  distinto per mezzo», e lo schema zod lo impone con un `refine`, non con un controllo nel
  componente.
- `Mezzo` qui è **l'anagrafica minima**: targa, descrizione, tipo. Il modulo mezzi completo
  (scadenze di revisione, assicurazione, tagliandi) è fuori dal primo rilascio, e questa
  struttura non gli sta in mezzo.
- Un costo con `commessaId` è imputato, senza è generale. La distinzione serve alla
  marginalità futura, e va fatta bene adesso o si rifà tutto dopo.

### Verifica

- filtro per categoria e per periodo
- registro un rifornimento su un mezzo: senza mezzo non salva
- registro un noleggio piattaforma imputato a una commessa
- il riepilogo per categoria e quello per mezzo tornano
- dal dettaglio fornitore vedo i suoi costi

---

## Step 7 — Dashboard

**Obiettivo:** la home che aggrega i sei moduli. **Ultima**, perché ora i numeri sono veri.

### File

```
src/pages/Dashboard.tsx
src/components/dashboard/KpiRow.tsx                DarkKpi in griglia
src/components/dashboard/ProssimiInterventi.tsx    commesse dei prossimi 7 giorni
src/components/dashboard/PreventiviDaSeguire.tsx   inviati non ancora esitati, e gli scaduti
src/components/dashboard/IncassiInScadenza.tsx     dallo scadenzario
src/components/dashboard/AttivitaRecente.tsx       ultime cose successe
src/hooks/useDashboard.ts                          un hook che compone gli altri service
```

### Contenuto

**KPI** (`DarkKpi`, griglia `sm:grid-cols-2 lg:grid-cols-4`):

| KPI | accent |
|---|---|
| Preventivi in attesa di risposta | `info` |
| Commesse in corso | `amber` |
| Da incassare | `emerald` — o `danger` se ci sono scadute |
| Costi del mese | `neutral` |

**Sezioni** (`DarkSection`, griglia 8/4): prossimi interventi e preventivi da seguire nella
colonna larga; incassi in scadenza e attività recente in quella stretta. Ognuna con il suo
«vedi tutti» verso la lista relativa.

### Note di costruzione

- **La dashboard non ha un suo service.** Compone quelli esistenti. Se un numero non si riesce
  a calcolare dai service, il difetto è nel modulo, non qui.
- **Ogni tile carica per conto suo**: i moduli rispondono in tempi diversi e chi è pronto non
  aspetta gli altri (è la lezione scritta nei commenti di `MagazzinoDashboard`).
- **Niente tile finti.** Se un dato non c'è, la tile non si mostra — meglio una griglia più
  corta che un numero inventato.

### Verifica

- ogni KPI torna con quello che si conta a mano nelle liste
- ogni «vedi tutti» porta alla lista giusta, già filtrata
- con i mock svuotati la dashboard non si rompe: mostra gli stati vuoti

---

## Cose che ti chiederò lungo la strada

Le anticipo così non arrivano a sorpresa:

| Quando | Cosa |
|---|---|
| Step 2 | La lista clienti ha due viste (tabella + card) come Telebi, o solo tabella? |
| Step 3 | `react-dropzone` per le foto, o un `<input type="file">` nudo? (dipendenza nuova) |
| Step 3 | La stampa PDF del preventivo è nel primo rilascio? Se sì serve una libreria |
| Step 4 | Il calendario mensile lo faccio subito o parto dal solo elenco? |
| Step 4 | La firma del cliente su canvas, o segnaposto «firmato su carta»? |
| Step 5 | Numerazione fatture: progressivo annuale automatico o inserito a mano? |

---

## Due cose che non sono nel piano, e il perché

**Autenticazione.** Non l'hai chiesta e per due persone su un'app dedicata può benissimo non
servire. Se serve, è uno step a sé e va messo prima dello step 2, non dopo — infilarla in fondo
significa toccare tutte le rotte.

**Stampa PDF.** Un preventivo che non si può mandare al cliente è un preventivo a metà, e la
fattura idem. Non l'ho messa nel primo rilascio perché non l'hai nominata, ma è la prima
candidata a diventare lo step 8 — e serve una dipendenza (`@react-pdf/renderer` o `jspdf`, in
Telebi ci sono entrambe).
