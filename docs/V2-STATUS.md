# Piano Investimenti 2.0 — Sviluppo

Branch di lavoro: `develop-v2`. Il sito della branch `main` resta invariato fino al collaudo.

## Fasi
- [x] Fase 0: ramo isolato, setup TypeScript/Vite, test e copia del curriculum.
- [ ] Fase 1: archivio IndexedDB versionato e migrazione conservativa da `finanzaDashboard`.
- [ ] Fase 2: conti, movimenti, obiettivi e riconciliazione.
- [ ] Fase 3: dashboard e check mensile.
- [ ] Fase 4: simulatore.
- [ ] Fase 5: portafoglio simulato/reale.
- [ ] Fase 6: corso con quiz e appunti.
- [ ] Fase 7: prompt AI contestuali.
- [ ] Fase 8: QA, sicurezza, PWA e pubblicazione.

## Principi
- Non copiare dati finanziari nel repository.
- Nessun dato inviato automaticamente a servizi esterni.
- Importazioni validate e backup prima della migrazione.
- Le riserve per obiettivi sono etichette sulla liquidità esistente, non nuovo patrimonio.
- I portafogli simulati non influenzano i saldi reali.
