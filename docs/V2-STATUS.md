# Piano Investimenti 2.0 — stato avanzamento

Branch: `develop-v2` · Pubblicazione GitHub Pages: versione 1 su `main`.

## Realizzato
- [x] Ramo separato, TypeScript, Vite, CSS responsive, CI GitHub Actions.
- [x] Conservazione del corso di 24 settimane (copia JSON originale).
- [x] Schema dati V2, import V1, salvataggio in IndexedDB, backup JSON.
- [x] Test unitari su trasferimenti, riserve, portafogli, simulazione e migrazione.
- [x] Prime interfacce per conti, obiettivi, dashboard e report mensili.
- [x] Prime interfacce per simulatore, portafogli, accademia, quiz e prompt AI.
- [x] Protezione contro la duplicazione del patrimonio e conferma del ripristino.

## Da completare prima di pubblicare
- [ ] Test automatici dell'interfaccia e verifica manuale dei flussi completi.
- [ ] Riconciliazione guidata dei valori storici non attribuiti ai conti.
- [ ] Migrazioni versionate successive e maggiore atomicità dell'archivio IndexedDB.
- [ ] Storico delle valutazioni patrimoniali (non ricostruire serie inventate).
- [ ] Migliorie rendimenti portafoglio (XIRR, TWR), vendite parziali e gestioni valute.
- [ ] Scenari di mercato variabili e simulatore dettagliato a 36 mesi.
- [ ] Migliorie accessibilità, layout mobile, UX, report stampabili.
- [ ] Protezione opzionale dei backup con cifratura e funzionalità offline/PWA.
- [ ] Blocco dipendenze con package-lock e revisione licenze.
- [ ] Collaudo dei backup e rilascio sicuro su `main`.

## Avvertenze
Il ramo V2 è una versione di sviluppo; non è una piattaforma di trading. Nessun dato reale è nel codice GitHub. Nessun prezzo di mercato viene scaricato automaticamente. L'assistente genera testo ma non comunica direttamente con ChatGPT.
