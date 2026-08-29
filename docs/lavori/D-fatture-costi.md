# Lavoro D — Fatture e Costi

> Sei la **chat D**. Costruisci i moduli **Fatture** e **Costi** del gestionale Tom.
> Le altre tre chat lavorano in parallelo sulla stessa cartella, su moduli diversi.
> Questo file è il tuo contratto: leggilo tutto prima di scrivere una riga.

**Cartella di lavoro:** `C:\Users\Samar\Documents\Work\MANUX\tom_gestionale`

Hai due moduli invece di uno perché sono i più indipendenti dagli altri: Costi non dipende
da nessuno tranne che per l'imputazione a una commessa, e Fatture ha un solo aggancio.

---

## 1. Prima di iniziare — obbligatorio

Leggi, in quest'ordine:

1. `docs/DESIGN_SYSTEM.md` — palette, tipografia, spaziature, e i 17 pattern con il codice
   vero da cui copiare. **È normativo**: se stai per inventare un colore, una spaziatura o
   un pattern che lì non c'è, fermati e chiedi a Omar.
2. `docs/CONVENTIONS.md` — stack, cartelle, naming, e soprattutto §4, il layer dati.
3. `docs/PLAN.md` §Step 5 e §Step 6 — i tuoi due step, con modelli dati e note.

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

Se non stampa niente, la chat A non ha ancora finito: **aspetta**.

Controlla anche che l'app parta:

```bash
npm run dev
```

---

## 2. Cosa costruisci

**Fatture** — emissione da commessa, acconti e saldi, scadenzario incassi, solleciti.
La fattura elettronica **non si implementa**: si predispongono i campi e basta.

**Costi** — carburante distinto per mezzo, materiali di consumo, noleggi (piattaforma aerea,
gru, cippatrice), smaltimento, fornitori.

Sei **10 task, 10 commit**. Fai prima tutte le Fatture, poi tutti i Costi.

| # | Task | File principali |
|---|---|---|
| 5.1 | Fatture: tipi e mock | `types/fattura.ts`, `mocks/fatture.ts` |
| 5.2 | Fatture: service e hook | `services/fattureService.ts`, `hooks/useFatture.ts` |
| 5.3 | Fatture: elenco ed emissione | `pages/fatture/{FattureList,FatturaNuova}.tsx`, `components/fatture/{FattureTable,FattureToolbar,StatoFatturaBadge,EmettiDaCommessaDialog}.tsx` |
| 5.4 | Fatture: dettaglio, incassi, solleciti | `pages/fatture/FatturaDetail.tsx`, `components/fatture/{RigheFatturaTable,IncassiTable,RegistraIncassoDialog,SollecitiTable,DatiFatturazioneElettronica}.tsx` |
| 5.5 | Fatture: scadenzario | `pages/fatture/Scadenzario.tsx` |
| 6.1 | Costi: tipi e mock | `types/costo.ts`, `mocks/{costi,fornitori,mezzi}.ts` |
| 6.2 | Costi: service e hook | `services/{costiService,fornitoriService}.ts`, `hooks/{useCosti,useFornitori}.ts` |
| 6.3 | Costi: elenco e drawer | `pages/costi/{CostiList,CostoDetail}.tsx`, `components/costi/{CostiTable,CostiToolbar,CostoDrawer,CategoriaCostoBadge}.tsx` |
| 6.4 | Costi: riepiloghi | `components/costi/{CostiPerCategoria,CostiPerMezzo}.tsx` |
| 6.5 | Fornitori | `pages/costi/{FornitoriList,FornitoreDetail}.tsx`, `components/costi/{FornitoriTable,FornitoreDrawer}.tsx` |

---

## 3. I file che possiedi

**Tuoi, nessun altro li tocca:**

```
src/types/{fattura,costo}.ts
src/mocks/{fatture,costi,fornitori,mezzi}.ts
src/services/{fattureService,costiService,fornitoriService}.ts
src/hooks/{useFatture,useCosti,useFornitori}.ts
src/pages/fatture/**   src/pages/costi/**
src/components/fatture/**   src/components/costi/**
```

**Più una sola riga fuori perimetro**, al task 5.2 — vedi §6.

**MAI toccare** (sono di altre chat o della fondazione):

```
src/App.tsx                    ← le tue rotte ci sono GIÀ
src/lib/**                     ← fondazione
src/index.css                  ← fondazione
src/components/ui/**           ← design system, chiuso
src/components/layout/**       ← shell
src/components/shared/**       ← condivisi (chat A)
src/types/{comune,cliente}.ts  ← contratti (chat A)
src/{services,hooks,mocks}/*clienti*   ← chat A
src/**/**preventivi**          ← chat B
src/**/**commesse**            ← chat C (tranne la riga del §6)
tailwind.config.ts  package.json       ← nessuno, senza chiedere
```

Se ti serve una modifica fuori dal tuo perimetro: **non farla, scrivi a Omar.**

---

## 4. I contratti su cui costruisci

```ts
// src/types/comune.ts
export interface Indirizzo { via: string; civico: string; cap: string; comune: string; provincia: string }
export interface Paginato<T> { righe: T[]; totale: number; pagina: number; perPagina: number }

// src/types/cliente.ts
export interface Cliente { id: string; tipo: TipoCliente; denominazione: string; /* … */ }

// src/services/clientiService.ts
clientiService.list(filtri?)   clientiService.getById(id)

// src/components/shared/
<ClienteSelect value onChange />
<IndirizzoFields />   <IndirizzoCard indirizzo />
```

### Le rotte esistono già

```
/fatture              → pages/fatture/FattureList.tsx
/fatture/nuova        → pages/fatture/FatturaNuova.tsx
/fatture/scadenzario  → pages/fatture/Scadenzario.tsx
/fatture/:id          → pages/fatture/FatturaDetail.tsx
/costi                → pages/costi/CostiList.tsx
/costi/:id            → pages/costi/CostoDetail.tsx
/costi/fornitori      → pages/costi/FornitoriList.tsx
/costi/fornitori/:id  → pages/costi/FornitoreDetail.tsx
```

---

## 5. Decisioni già prese — non richiederle

### Fatture

- **Lo stato è DERIVATO dagli incassi, non scelto a mano.** È la regola centrale del modulo:
  - residuo = totale → `emessa`
  - 0 < incassato < totale → `pagata_parziale`
  - residuo = 0 → `pagata`
  - scadenza passata e residuo > 0 → `scaduta`

  Un campo `stato` modificabile diverge dai numeri il primo giorno.
- **Acconto e saldo sono due fatture** legate alla stessa commessa. Il saldo propone
  `totale commessa − acconti già emessi`.
- **La fatturazione elettronica si predispone, non si trasmette.** La `SectionCard` deve
  dirlo esplicitamente in pagina, o qualcuno penserà che le fatture siano partite.
- **Lo scadenzario ordina per `dataScadenza` crescente** e colora l'urgenza: scaduta `danger`,
  entro 7 giorni `amber`, oltre `neutral`. Usa `giorniDaOggi()` da `src/lib/formatters.ts`.
- **Importi con i centesimi**: `formatCurrency(v)` di default li ha. `{ interi: true }` solo
  nei riepiloghi, dove i centesimi sono rumore.
- **Accent** (`DESIGN_SYSTEM.md` §2.6): `bozza: neutral · emessa: info · pagata_parziale:
  amber · pagata: emerald · scaduta: danger`.

### Costi

- **`mezzoId` è obbligatorio quando la categoria è `carburante`** — è il requisito «carburante
  distinto per mezzo». Lo impone lo schema zod con un `.refine()`, non un `if` nel componente:
  la validazione deve stare dove sta la verità sul dato.
- **I campi del drawer cambiano con la categoria**: `tipoNoleggio` compare solo se noleggio,
  `mezzoId` solo se carburante. Non mostrare campi che non si applicano.
- **Un costo con `commessaId` è imputato, senza è generale.** La distinzione serve al report
  di marginalità (fuori dal primo rilascio) e va fatta bene adesso o si rifà tutto dopo.
- **`Mezzo` è l'anagrafica minima**: targa, descrizione, tipo. Il modulo mezzi completo, con
  scadenze di revisione e assicurazione, è fuori dal primo rilascio, e questa struttura non
  gli sta in mezzo.
- **Niente librerie di grafici.** I riepiloghi sono barre costruite coi token del design
  system. `recharts` arriva col report di marginalità, che non è nel primo rilascio.

### Entrambi

- **Niente dipendenze nuove.** Nessuna, per nessun motivo, senza chiedere a Omar.

---

## 6. L'unica riga che scrivi fuori dal tuo perimetro

Al **task 5.2** chiudi la generazione fattura che la chat C ha lasciato aperta.

Tu scrivi in `fattureService.ts`:

```ts
export async function emettiDaCommessa(
  commessa: Commessa,
  opts: { tipo: 'acconto' | 'saldo' | 'unica'; percentuale?: number },
): Promise<Fattura> { … }
```

Poi, in `src/services/commesseService.ts`, sostituisci **solo** il corpo di `generaFattura`,
che la chat C ha lasciato con un `TODO(chat D)` apposta per te. Non toccare nient'altro.

**Se il file non esiste ancora o il TODO non c'è**, la chat C non è arrivata: lascia perdere,
va' avanti e dillo a Omar a fine turno. Non scrivere tu `commesseService`.

Quella modifica va in un **commit suo**, separato.

> Se al task 5.1 il tipo `Commessa` non esiste ancora, non bloccarti: dichiara in
> `types/fattura.ts` solo `commessaId: string` e prendi i dati della commessa quando il tipo
> arriva. I mock delle fatture possono citare un `commessaId` che ancora non risolve — è
> esattamente quello che succederà col backend vero.

---

## 7. Regole di lavoro

### Git — la regola che evita i disastri

Quattro chat scrivono nella stessa cartella. **Mai `git add -A` e mai `git add .`**:
metteresti in stage il lavoro a metà di qualcun altro e lo committeresti a suo nome.

**Non usare `git add`.** Committa direttamente i percorsi:

```bash
# File GIÀ tracciati da git — basta committarli:
git commit -F <file-messaggio> -- src/types/tuofile.ts src/mocks/tuofile.ts

# File NUOVI — `git commit -- <percorsi>` non li vede, vanno aggiunti prima:
git add src/types/tuofile.ts src/mocks/tuofile.ts
git commit -F <file-messaggio> -- src/types/tuofile.ts src/mocks/tuofile.ts
```

Il `-- <percorsi>` sul commit resta anche dopo l'`add`, e non è ridondante: è
quello che impedisce di portarsi via i file che un'altra chat ha appena messo
in stage.

`git commit -- <percorsi>` committa il contenuto di QUEI file e ignora l'indice.
È l'unica forma sicura qui: l'indice git (`.git/index`) è **uno solo** per tutte
e quattro le sessioni, quindi fra il tuo `git add` e il tuo `git commit` un'altra
chat può committare — e si porta via i tuoi file staged dentro il suo commit.
È già successo. Con `git commit -- <percorsi>` non può succedere.

Vecchia forma, **da non usare**:

```bash
git add src/types/fattura.ts src/mocks/fatture.ts
git commit -F <file-messaggio>
```

Prima di ogni commit:

```bash
git status --short
git diff --cached --name-only
```

**Un commit per task**, dieci più quello del §6. Messaggio in italiano, minuscolo dopo il
prefisso (`fatture:` o `costi:`), che dice **cosa cambia per chi usa l'app**. Nel corpo il
perché.

```
fatture: lo stato si calcola dagli incassi, non si sceglie

Residuo pieno = emessa, parziale = pagata_parziale, zero = pagata, scaduta se
la data è passata e il residuo è sopra zero. Un campo stato modificabile a mano
diverge dai numeri il primo giorno che qualcuno registra un incasso e si
dimentica di cambiarlo.
```

### Verifica prima di committare

```bash
npm run typecheck
```

Deve uscire pulito **sui tuoi file**. Se un errore punta fuori dal tuo perimetro, è di
un'altra chat a metà lavoro: **non aggiustarlo**.

### Stile

- **UI in italiano.** Etichette, messaggi, placeholder, stati vuoti.
- **Termini di dominio in italiano anche nel codice** (`Fattura`, `useCosti`), tecnici in
  inglese (`loading`, `onChange`).
- **Chiavi di stato in inglese minuscolo, etichetta italiana in UI**, con
  `statoFatturaLabel()` e `categoriaCostoLabel()`.
- **Commenti in italiano che spiegano il perché**, non il cosa.
- **Niente markup a mano** per pill, badge e testate.
- **Ogni importo incolonnato porta `tabular-nums`.** Una colonna di euro senza cifre
  tabellari è illeggibile.

---

## 8. Quando hai finito

**Fatture** — a schermo puoi:

- [ ] emettere un acconto 30% da una commessa completata, poi il saldo
- [ ] registrare un incasso parziale e vedere lo stato passare a `pagata_parziale` col
      residuo giusto
- [ ] vedere lo scadenzario con le scadute in cima e i colori dell'urgenza
- [ ] registrare un sollecito
- [ ] compilare i campi di fatturazione elettronica **e leggere in pagina che non si trasmette**

**Costi** — a schermo puoi:

- [ ] filtrare per categoria e per periodo
- [ ] registrare un rifornimento, **e senza scegliere il mezzo non salva**
- [ ] registrare un noleggio piattaforma imputato a una commessa
- [ ] leggere i riepiloghi per categoria e per mezzo, e i numeri tornano
- [ ] aprire un fornitore e vedere i suoi costi

Poi scrivi a Omar: cosa hai fatto, cosa può verificare, cosa è rimasto aperto.

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
