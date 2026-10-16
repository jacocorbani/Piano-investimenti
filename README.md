# Piano Investimenti 2.0 — versione di sviluppo

Applicazione web statica personale per finanza e studio degli investimenti. Lo sviluppo avviene su `develop-v2`. Dopo il merge della PR #1, `main` contiene la V2: per pubblicarla occorre compilare e distribuire `dist`, seguendo [la procedura Pages](docs/PAGES-DEPLOYMENT.md).

## Avviare il progetto in locale

Richiede Node.js recente (Node 22 consigliato).

```bash
npm install
npm run dev
```

Per verificare il codice:

```bash
npm test
npm run build
```

La compilazione Vite usa `/Piano-investimenti/` come base di produzione.

## Funzionalità realizzate in questa prima iterazione

- Dashboard con indicatori patrimoniali e grafico dello storico mensile.
- Conti, saldi iniziali e movimenti (entrata, spesa, trasferimento, rettifica).
- Obiettivi e riserve virtuali collegate ai conti.
- Consuntivi mensili, checklist, tabella storica e CSV.
- Simulazioni a rendimento annuo costante con costi ipotetici e inflazione.
- Portafogli reali/simulati, operazioni e prezzi inseriti manualmente.
- Lezioni originali (24 settimane), appunti, esercizi, stati di avanzamento e quiz.
- Prompt contestuali per ChatGPT da revisionare e copiare.
- IndexedDB, backup JSON V2 e migrazione conservativa dai dati V1.

## Privacy e migrazione

Tutti i dati restano nel browser, salvo scelta esplicita di copiarli o esportarli. Non vengono trasmessi a broker, ChatGPT o API remote. L'eventuale caricamento di caratteri da Google Fonts dipende dalla disponibilità della rete, senza invio dei dati finanziari.

Al primo avvio la versione 2 cerca la chiave locale `finanzaDashboard` usata dalla versione 1. Se presente, copia e migra i dati in IndexedDB conservando `finanzaDashboard` e creando `finanzaDashboard:before-v2` come copia aggiuntiva nello stesso browser. **Prima di testare la migrazione, esporta un backup JSON della versione 1.**

I vecchi valori di fondo emergenza e capitale investito sono importati come valori da riconciliare, **non** aggiunti al patrimonio netto, per evitare duplicazioni. I vecchi consuntivi rimangono record manuali, non movimenti inventati.

## Limiti dell'anteprima

È un'implementazione iniziale e **non una versione pronta per l'uso finanziario definitivo**: mancano test end-to-end nel browser, riconciliazione guidata dei saldi V1, portafoglio multi-valuta, importazione CSV di movimenti, rapporti rischio-rendimento avanzati, PWA, cifratura dei backup e pubblicazione del sito V2. L'archivio IndexedDB contiene attualmente uno snapshot strutturato dello stato, non tabelle indipendenti per ciascuna entità. Rendimenti e prezzi sono inseriti manualmente, non previsioni o dati di mercato in tempo reale.

## Pubblicazione

Non unire `develop-v2` a `main` e non cambiare la configurazione di GitHub Pages prima della verifica dei backup, dell'accessibilità e dei test di navigazione. Lo stato del lavoro è descritto in [docs/V2-STATUS.md](docs/V2-STATUS.md).

## Verifiche di integrità aggiunte il 16 ottobre 2026

Il motore rifiuta date di calendario impossibili e vendite che precedono le quote disponibili. Il ripristino verifica anche la cronologia delle operazioni, i collegamenti ai conti, le checklist e gli URL ChatGPT. Il simulatore rifiuta valori non finiti e tassi netti fuori dominio. La suite comprende 25 test; build TypeScript e Vite verificate. Il collaudo browser e IndexedDB resta da completare prima del rilascio.
