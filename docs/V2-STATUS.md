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

## Revisione 16 ottobre 2026

Base verificata: 3c5d8c4eb324d8e17b9f7bd65a6f789049cb50ab, successiva al commit del documento di consegna. CI originale positiva.

Correzioni verificate: date impossibili, vendita retrodatata senza disponibilità, parametri non finiti del simulatore, ripristino di backup con movimenti semanticamente invalidi, checklist corrotte e URL eseguibili. Aggiunti 14 casi di regressione (25 test complessivi). Test unitari, TypeScript e build Vite superati localmente.

Restano aperti: test browser/IndexedDB e concorrenza dei salvataggi, limiti aggregati degli importi, riconciliazione V1 guidata, prezzi storici e data di valutazione, rendimento realizzato esplicito, valute e collaudo mobile/accessibilità. Non è stata eseguita una revisione esaustiva di tutti i flussi. Nessun rilascio autorizzato.
