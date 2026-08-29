/**
 * Prova del parser di `importa-fattura-xml` sul codice vero della funzione.
 *
 * L'XML qui sotto è una FatturaPA come la manda un fornitore italiano: prefisso
 * di namespace `p:`, due blocchi `DatiRiepilogo` con aliquote diverse, una
 * `&amp;` nella ragione sociale, e il `CessionarioCommittente` — che è Tom, e
 * che il parser NON deve scambiare per il fornitore.
 */
// `./parser` non esiste su disco: lo genera `esegui.mjs` accanto a questo file,
// estraendolo dal sorgente vero di `importa-fattura-xml`. Si lancia da lì, non
// direttamente.
import { tag, blocchi, decodifica, numero, categoriaProposta } from './parser';

const XML = `<?xml version="1.0" encoding="UTF-8"?>
<p:FatturaElettronica versione="FPR12" xmlns:p="http://ivaservizi.agenziaentrate.gov.it/docs/xsd/fatture/v1.2">
  <FatturaElettronicaHeader>
    <DatiTrasmissione>
      <ProgressivoInvio>0000912</ProgressivoInvio>
      <FormatoTrasmissione>FPR12</FormatoTrasmissione>
    </DatiTrasmissione>
    <CedentePrestatore>
      <DatiAnagrafici>
        <IdFiscaleIVA><IdPaese>IT</IdPaese><IdCodice>02887410372</IdCodice></IdFiscaleIVA>
        <Anagrafica><Denominazione>Noleggi Zanardi &amp; Figli S.r.l.</Denominazione></Anagrafica>
      </DatiAnagrafici>
      <Sede>
        <Indirizzo>Via del Lavoro</Indirizzo><NumeroCivico>44</NumeroCivico>
        <CAP>40057</CAP><Comune>Granarolo dell'Emilia</Comune><Provincia>bo</Provincia>
      </Sede>
    </CedentePrestatore>
    <CessionarioCommittente>
      <DatiAnagrafici>
        <IdFiscaleIVA><IdPaese>IT</IdPaese><IdCodice>99999999999</IdCodice></IdFiscaleIVA>
        <Anagrafica><Denominazione>Tom Manutenzione Verde</Denominazione></Anagrafica>
      </DatiAnagrafici>
    </CessionarioCommittente>
  </FatturaElettronicaHeader>
  <FatturaElettronicaBody>
    <DatiGenerali>
      <DatiGeneraliDocumento>
        <TipoDocumento>TD01</TipoDocumento>
        <Numero>2026/318</Numero>
        <Data>2026-03-14</Data>
      </DatiGeneraliDocumento>
    </DatiGenerali>
    <DatiBeniServizi>
      <DettaglioLinee>
        <NumeroLinea>1</NumeroLinea>
        <Descrizione>Noleggio piattaforma aerea 22 m</Descrizione>
        <Quantita>2.00</Quantita><PrezzoUnitario>250.00</PrezzoUnitario>
        <PrezzoTotale>500.00</PrezzoTotale><AliquotaIVA>22.00</AliquotaIVA>
      </DettaglioLinee>
      <DettaglioLinee>
        <NumeroLinea>2</NumeroLinea>
        <Descrizione>Riparazione impianto idraulico</Descrizione>
        <Quantita>1.00</Quantita><PrezzoUnitario>200.00</PrezzoUnitario>
        <PrezzoTotale>200.00</PrezzoTotale><AliquotaIVA>10.00</AliquotaIVA>
      </DettaglioLinee>
      <DatiRiepilogo><AliquotaIVA>22.00</AliquotaIVA><ImponibileImporto>500.00</ImponibileImporto><Imposta>110.00</Imposta></DatiRiepilogo>
      <DatiRiepilogo><AliquotaIVA>10.00</AliquotaIVA><ImponibileImporto>200.00</ImponibileImporto><Imposta>20.00</Imposta></DatiRiepilogo>
    </DatiBeniServizi>
    <DatiPagamento>
      <DettaglioPagamento><DataScadenzaPagamento>2026-04-13</DataScadenzaPagamento></DettaglioPagamento>
    </DatiPagamento>
  </FatturaElettronicaBody>
</p:FatturaElettronica>`;

let falliti = 0;
function verifica(cosa: string, ottenuto: unknown, atteso: unknown) {
  const ok = JSON.stringify(ottenuto) === JSON.stringify(atteso);
  if (!ok) falliti++;
  console.log(`  ${ok ? '✓' : '✗'} ${cosa}${ok ? '' : `\n      atteso: ${JSON.stringify(atteso)}\n      ottenuto: ${JSON.stringify(ottenuto)}`}`);
}

const cedente = blocchi(XML, 'CedentePrestatore')[0];

console.log('=== Il fornitore, non noi ===');
verifica('la P. IVA è del cedente e non del cessionario', tag(cedente, 'IdCodice'), '02887410372');
verifica('la denominazione è del cedente', tag(cedente, 'Denominazione'), 'Noleggi Zanardi & Figli S.r.l.');
verifica("l'entità &amp; è decodificata", decodifica('Rossi &amp; Figli'), 'Rossi & Figli');

console.log('=== La testata, col prefisso di namespace ===');
const datiGenerali = blocchi(XML, 'DatiGeneraliDocumento')[0];
verifica('numero del documento', tag(datiGenerali, 'Numero'), '2026/318');
verifica('data del documento', tag(datiGenerali, 'Data'), '2026-03-14');
verifica('protocollo SdI', tag(XML, 'ProgressivoInvio'), '0000912');
verifica('scadenza di pagamento', tag(XML, 'DataScadenzaPagamento'), '2026-04-13');

console.log('=== Le righe: due, con due aliquote diverse ===');
const linee = blocchi(XML, 'DettaglioLinee');
verifica('quante righe', linee.length, 2);
verifica('aliquota della riga 1', numero(tag(linee[0], 'AliquotaIVA')), 22);
verifica('aliquota della riga 2', numero(tag(linee[1], 'AliquotaIVA')), 10);
verifica('prezzo della riga 1', numero(tag(linee[0], 'PrezzoUnitario')), 250);

console.log('=== La categoria proposta dalla descrizione ===');
verifica('noleggio', categoriaProposta(tag(linee[0], 'Descrizione')!), 'noleggio');
verifica('manutenzione', categoriaProposta(tag(linee[1], 'Descrizione')!), 'manutenzione');
verifica('gasolio → carburante', categoriaProposta('Rifornimento gasolio autotrazione'), 'carburante');
verifica('conferimento → smaltimento', categoriaProposta('Conferimento in discarica'), 'smaltimento');
verifica('quello che non si riconosce resta altro', categoriaProposta('Voce generica'), 'altro');

console.log('=== I riepiloghi si SOMMANO, non si legge il primo ===');
const riepiloghi = blocchi(XML, 'DatiRiepilogo');
const imponibile = riepiloghi.reduce((s, r) => s + numero(tag(r, 'ImponibileImporto')), 0);
const imposta = riepiloghi.reduce((s, r) => s + numero(tag(r, 'Imposta')), 0);
verifica('imponibile totale (500 + 200)', imponibile, 700);
verifica('IVA totale (110 + 20)', imposta, 130);

console.log(falliti === 0 ? '\nOK: il parser regge una FatturaPA vera.' : `\n${falliti} CONTROLLI FALLITI`);
process.exit(falliti === 0 ? 0 : 1);
