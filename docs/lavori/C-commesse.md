# Lavoro C — Commesse

> Sei la **chat C**. Costruisci il modulo **Commesse** del gestionale Tom.
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
3. `docs/PLAN.md` §Step 4 — il tuo step, con modello dati e note di costruzione.

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

Il lavoro sul campo: pianificazione a calendario, ore previste contro ore reali, foto prima
e dopo, rapportino con firma del cliente, stato di avanzamento.

**da_pianificare → pianificata → in_corso → completata**, più `sospesa` e `annullata`.

Sei **6 task, 6 commit**. Uno per volta, nell'ordine.

| # | Task | File principali |
|---|---|---|
| 4.1 | Tipi e mock | `types/commessa.ts`, `mocks/commesse.ts` |
| 4.2 | Service, hook, aggancio da preventivo | `services/commesseService.ts`, `hooks/useCommesse.ts` |
| 4.3 | Pagina elenco | `pages/commesse/CommesseList.tsx`, `components/commesse/{CommesseTable,CommesseToolbar,StatoCommessaBadge,AvanzamentoBar}.tsx` |
| 4.4 | Calendario mensile | `components/commesse/CommesseCalendario.tsx` |
| 4.5 | Dettaglio: lavorazioni, ore, foto | `pages/commesse/{CommessaDetail,CommessaNuova}.tsx`, `components/commesse/{LavorazioniTable,OreConfronto,FotoPrimaDopo}.tsx` |
| 4.6 | Rapportino e firma | `components/commesse/{RapportinoForm,FirmaCliente}.tsx` |

---

## 3. I file che possiedi

**Tuoi, nessun altro li tocca:**

```
src/types/commessa.ts
src/mocks/commesse.ts
src/services/commesseService.ts
src/hooks/useCommesse.ts
src/pages/commesse/**
src/components/commesse/**
```

**Più una sola riga fuori perimetro**, al task 4.2 — vedi §6.

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
src/**/**preventivi**          ← chat B (tranne la riga del §6)
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
export interface Cliente { id: string; tipo: TipoCliente; denominazione: string; luoghiIntervento: LuogoIntervento[] }
export interface LuogoIntervento { id: string; etichetta: string; indirizzo: Indirizzo; accessoMezzi?: 'facile'|'medio'|'difficile' }

// src/services/clientiService.ts
clientiService.list(filtri?): Promise<Paginato<Cliente>>
clientiService.getById(id): Promise<Cliente | null>

// src/components/shared/
<ClienteSelect value onChange />
<LuogoInterventoSelect clienteId value onChange />
<FotoUploader foto onChange />                // input file + drop, nessuna dipendenza
<FotoGallery foto onRimuovi? />
```

### Le rotte esistono già

In `src/App.tsx` sono dichiarate e puntano a file segnaposto che **tu sostituisci**:

```
/commesse          → pages/commesse/CommesseList.tsx
/commesse/nuova    → pages/commesse/CommessaNuova.tsx
/commesse/:id      → pages/commesse/CommessaDetail.tsx
```

---

## 5. Decisioni già prese — non richiederle

- **Niente dipendenze nuove.** Vale per tutti e tre i pezzi difficili del tuo modulo:
  - **il calendario** è una griglia mensile scritta a mano con i token del design system —
    celle `bg-[#111111] border-white/[0.06]`, le commesse dentro le celle come `StatusPill`,
    navigazione mese precedente/successivo. Niente librerie di calendario;
  - **la firma** è un `<canvas>` con i listener di pointer, ~60 righe, salvata come `dataUrl`.
    Niente `react-signature-canvas`;
  - **le foto** usano `FotoUploader`, che esiste già.
- **`oreReali` è la somma delle lavorazioni**, non un campo scrivibile a mano. Una correzione
  è una lavorazione di rettifica. Stessa cosa per `avanzamentoPct`, che deriva dalle
  lavorazioni completate: due numeri che si possono scrivere a mano divergono dai dati il
  primo giorno.
- **Numerazione `CM-AAAA-NNNN`**, progressivo annuale generato dal service.
- **Date coerenti nei mock**: una commessa nata da un preventivo accettato il 12/03 non è
  pianificata l'8/03. Le date sono relative a oggi (`oggi - 40 giorni`) così non invecchiano.
- **Accent degli stati** (da `DESIGN_SYSTEM.md` §2.6, non inventarne altri):
  `da_pianificare: neutral · pianificata: info · in_corso: amber · completata: emerald ·
  sospesa: orange · annullata: danger`
  Il fallback `?? 'neutral'` non è opzionale.
- **Lo scostamento ore** si colora in ambra se sopra il previsto, neutral se in linea.
  Mai verde: «a posto» in questo progetto è bianco (`ONBOARDING-GRAFICO` §8 di Telebi).

---

## 6. L'unica riga che scrivi fuori dal tuo perimetro

Al **task 4.2** chiudi la conversione preventivo → commessa che la chat B ha lasciato aperta.

Tu scrivi in `commesseService.ts`:

```ts
export async function creaDaPreventivo(preventivo: Preventivo): Promise<Commessa> { … }
```

Poi, in `src/services/preventiviService.ts`, sostituisci **solo** il corpo di
`convertiInCommessa` — che la chat B ha lasciato con un `throw` e un `TODO(chat C)` apposta
per te. Non toccare nient'altro di quel file.

**Se il file non esiste ancora o il TODO non c'è**, la chat B non è arrivata: lascia perdere,
va' avanti col tuo lavoro e dillo a Omar a fine turno. Non scrivere tu `preventiviService`.

Quella modifica va in un **commit suo**, separato:

```bash
git add src/services/preventiviService.ts
git commit -F …   # commesse: la conversione da preventivo crea davvero la commessa
```

---

## 7. Regole di lavoro

### Git — la regola che evita i disastri

Quattro chat scrivono nella stessa cartella. **Mai `git add -A` e mai `git add .`**:
metteresti in stage il lavoro a metà di qualcun altro e lo committeresti a suo nome.

Metti in stage **solo i tuoi file, per percorso esplicito**:

```bash
git add src/types/commessa.ts src/mocks/commesse.ts
git commit -F <file-messaggio>
```

Prima di ogni commit, controlla di non aver preso roba d'altri:

```bash
git status --short
git diff --cached --name-only
```

**Un commit per task**, sei più quello del §6. Messaggio in italiano, minuscolo dopo il
prefisso `commesse:`, che dice **cosa cambia per chi usa l'app** — non quale funzione hai
toccato. Nel corpo il perché.

```
commesse: calendario mensile con le commesse pianificate

Griglia costruita con i token del design system invece di una libreria: serve
mostrare tre informazioni per cella, e ogni calendario pronto va combattuto per
togliergli il suo stile.
```

### Verifica prima di committare

```bash
npm run typecheck
```

Deve uscire pulito **sui tuoi file**. Se un errore punta a un file fuori dal tuo perimetro,
è di un'altra chat a metà lavoro: **non aggiustarlo**, aspetta o segnalalo a Omar.

### Stile

- **UI in italiano.** Etichette, messaggi, placeholder, stati vuoti.
- **Termini di dominio in italiano anche nel codice** (`Commessa`, `useCommesse`), termini
  tecnici in inglese (`loading`, `onChange`).
- **Chiavi di stato in inglese minuscolo, etichetta italiana in UI**, con una funzione
  `statoCommessaLabel()` che fa la traduzione.
- **Commenti in italiano che spiegano il perché**, non il cosa.
- **Niente markup a mano** per pill, badge e testate: esistono `StatusPill`, `TabPills`,
  `PageHeader`. Se non bastano, si estendono — non si apre una seconda strada.
- **Ogni numero incolonnato porta `tabular-nums`.** Ore e importi in colonna senza cifre
  tabellari ballano.

---

## 8. Quando hai finito

Il modulo è chiuso quando a schermo puoi:

- [ ] filtrare per stato, e passare da elenco a calendario con lo switch
- [ ] creare una commessa da un preventivo accettato **e trovare i dati già compilati**
- [ ] pianificarla su una data e vederla comparire nella cella giusta del calendario
- [ ] caricare le foto prima, avviare, spuntare le lavorazioni, caricare le foto dopo
- [ ] compilare il rapportino, firmare, e vedere l'avanzamento andare al 100% con lo stato
      che passa a completata
- [ ] leggere il confronto ore previste/reali con lo scostamento
- [ ] vedere lo storico interventi nella scheda del cliente (la sezione esiste già, si popola
      da sola quando il tuo service risponde)

Poi scrivi a Omar: cosa hai fatto, cosa può verificare, e cosa è rimasto aperto
(`generaFattura` lo è: la aggancia la chat D).

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
