# MEGA TASK — Gestionale Tom v1

Task padre unico. Sotto ci stanno **tutti** i sottotask del progetto, nell'ordine in cui
vanno eseguiti e committati. Un sottotask = un commit. Nient'altro.

- Repo: `https://github.com/s1ddharth-s1ngh/gestionale_tom.git` (remote `origin`, branch `main`)
- Piano tecnico: [`../PLAN.md`](../PLAN.md) — convenzioni: [`../CONVENTIONS.md`](../CONVENTIONS.md)
- Divisione in quattro chat parallele: [A](A-fondazione-clienti-dashboard.md) ·
  [B](B-preventivi.md) · [C](C-commesse.md) · [D](D-fatture-costi.md)

**Totale: 5 commit fatti + 34 sottotask da fare.**

---

## Fase 0 — Fatto (già su `origin/main`)

| # | Sottotask | Commit |
|---|---|---|
| 0.1 | Analisi Telebi e piano di costruzione | `4cfbc84` |
| 0.2 | Scaffold Vite + React + TypeScript + Tailwind | `118cfea` |
| 0.3 | Token del design system, utils, formatter italiani | `5bba3a2` |
| 0.4 | Primitive vestite scure e shim delle icone | `09f6e2e` |
| 0.5 | Componenti del design system portati da Telebi | `82e9125` |
| 0.6 | Brief delle quattro chat + questo mega task | *questo commit* |

---

## Fase 1 — Fondazione (chat A, da sola)

Blocca tutto: finché non è chiusa e pushata, B, C e D non partono.

| # | Sottotask | Commit |
|---|---|---|
| 1.1 | Shell: `AppLayout`, `AppHeader`, `AppSidebar`, `PageLoader` | `feat: shell dell'applicazione` |
| 1.2 | Routing completo in `lazy()` + pagine segnaposto | `feat: rotte e segnaposto` |
| 1.3 | Contratti `types/comune.ts` + `types/cliente.ts` | `feat: contratti condivisi` |
| 1.4 | Mock, `clientiService`, `useClienti` | `feat: dati e service clienti` |
| 1.5 | I sei componenti di `components/shared/` | `feat: componenti condivisi` |
| 1.6 | **Gate**: fondazione pronta, push | `chore: fondazione pronta` |

---

## Fase 2 — Le quattro chat in parallelo

Da qui in poi si lavora in contemporanea sulla stessa cartella. Regola non negoziabile:
`git add` con percorsi espliciti, **mai** `git add -A` / `git add .`.

### Chat A — Clienti (4 sottotask)

| # | Sottotask | Commit |
|---|---|---|
| 2.3 | Elenco: tabella, toolbar, pill per tipo, ricerca, paginazione, due stati vuoti | `feat: elenco clienti` |
| 2.4 | Drawer di creazione, zod discriminated union su `tipo` | `feat: creazione cliente` |
| 2.5 | Dettaglio: jump-nav, griglia 8/4, modifica inline al clic | `feat: scheda cliente` |
| 2.6 | Luoghi di intervento (CRUD) + eliminazione con conferma | `feat: luoghi di intervento` |

### Chat B — Preventivi (6 sottotask)

| # | Sottotask | Commit |
|---|---|---|
| 3.1 | Tipi e mock (preventivi, specie alberi) | `feat: modello preventivi` |
| 3.2 | `preventiviService` + `usePreventivi` | `feat: service preventivi` |
| 3.3 | Pagina elenco + tabella, toolbar, badge di stato | `feat: elenco preventivi` |
| 3.4 | Scheda sopralluogo: rilievo alberi, criticità, foto | `feat: scheda sopralluogo` |
| 3.5 | Righe e totali | `feat: righe e totali preventivo` |
| 3.6 | Dettaglio + dialog di conversione — lascia il `TODO(chat C)` | `feat: dettaglio preventivo` |

### Chat C — Commesse (6 sottotask)

| # | Sottotask | Commit |
|---|---|---|
| 4.1 | Tipi e mock | `feat: modello commesse` |
| 4.2 | Service, hook, **chiusura del `TODO` di B** (commit separato per la riga fuori perimetro) | `feat: service commesse` + `feat: conversione preventivo in commessa` |
| 4.3 | Pagina elenco, badge di stato, barra di avanzamento | `feat: elenco commesse` |
| 4.4 | Calendario mensile | `feat: calendario commesse` |
| 4.5 | Dettaglio: lavorazioni, confronto ore, foto prima/dopo | `feat: dettaglio commessa` |
| 4.6 | Rapportino e firma del cliente | `feat: rapportino e firma` |

### Chat D — Fatture e Costi (10 sottotask)

| # | Sottotask | Commit |
|---|---|---|
| 5.1 | Fatture: tipi e mock | `feat: modello fatture` |
| 5.2 | Fatture: service, hook, **chiusura del `TODO` di C** (riga fuori perimetro in commit suo) | `feat: service fatture` + `feat: emissione fattura da commessa` |
| 5.3 | Fatture: elenco ed emissione | `feat: elenco ed emissione fatture` |
| 5.4 | Fatture: dettaglio, incassi, solleciti, campi FE (non si trasmette) | `feat: dettaglio fattura e incassi` |
| 5.5 | Fatture: scadenzario | `feat: scadenzario` |
| 6.1 | Costi: tipi e mock (costi, fornitori, mezzi) | `feat: modello costi` |
| 6.2 | Costi: service e hook (+ fornitori) | `feat: service costi e fornitori` |
| 6.3 | Costi: elenco e drawer | `feat: elenco costi` |
| 6.4 | Costi: riepiloghi per categoria e per mezzo | `feat: riepiloghi costi` |
| 6.5 | Fornitori: elenco e scheda | `feat: fornitori` |

---

## Fase 3 — Chiusura (chat A, quando le altre hanno finito)

| # | Sottotask | Commit |
|---|---|---|
| 7.1 | Dashboard: struttura e aggregazioni | `feat: dashboard` |
| 7.2 | Dashboard: KPI, scadenze, commesse della settimana | `feat: widget dashboard` |
| 7.3 | Dashboard: andamento e ultimi movimenti | `feat: andamento dashboard` |
| 8.1 | Integrazione: pattern allineati, `TODO` incrociati chiusi, typecheck pulito | `chore: integrazione finale` |

---

## Dipendenze fra sottotask

```
1.1 → 1.2 → 1.3 → 1.4 → 1.5 → 1.6 (gate)
                                 ├── A: 2.3 → 2.4 → 2.5 → 2.6 ──┐
                                 ├── B: 3.1 → … → 3.6 ──┐        │
                                 ├── C: 4.1 → 4.2 ←─────┘ → 4.6 ─┤
                                 └── D: 5.1 → 5.2 ←──────────────┤ (da 4.2)
                                          … → 6.5 ───────────────┤
                                                    7.1 → 7.2 → 7.3 → 8.1
```

Due soli agganci incrociati, entrambi già decisi: **B 3.6 → C 4.2** (conversione) e
**C 4.2 → D 5.2** (emissione fattura). Ognuno si chiude in un commit dedicato.

---

## Regole valide per ogni sottotask

1. Un sottotask, un commit. Se serve una riga fuori perimetro, va in un **commit suo**.
2. `git add <percorsi espliciti>` → `git diff --cached --name-only` → controlla → commit.
3. `npx tsc --noEmit` pulito prima di ogni commit.
4. `git pull --rebase` prima di ogni push.
5. Nessuna dipendenza nuova in `package.json` senza chiedere.
6. Messaggi di commit in italiano, minuscolo, `tipo: cosa`.
