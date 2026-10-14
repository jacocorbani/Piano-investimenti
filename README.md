# Finanza personale — Dashboard

Dashboard statica in italiano per consultare il piano finanziario personale, tenere un check mensile, seguire un percorso gratuito di studio sugli investimenti e preparare prompt da usare nel progetto ChatGPT.

## Pubblicazione con GitHub Pages

1. Apri **Settings → Pages** nel repository.
2. In **Build and deployment**, scegli **Deploy from a branch**.
3. Seleziona `main` e la cartella `/(root)`, poi salva.
4. Attendi il completamento del deployment indicato nella sezione Pages.

La disponibilità di GitHub Pages per un repository privato dipende dal piano GitHub; se non è disponibile, rendi pubblico il repository solo se ti va bene pubblicare il codice del sito. Non inserire mai dati finanziari personali nel codice del repository.

## Funzioni

- Panoramica del piano e flusso mensile.
- Parametri modificabili: entrate, spese, target mensile, fondo emergenza e capitale attuale.
- Check mensile, consuntivo e storico.
- Percorso di sei mesi, con massimo tre ore di studio a settimana e link a risorse educative gratuite.
- Generatore di prompt da copiare nel progetto ChatGPT.
- Backup JSON e storico CSV.

## Privacy e limiti

L'app non si collega direttamente a conti bancari, non esegue investimenti e non invia automaticamente dati a ChatGPT. Le informazioni vengono salvate in `localStorage` nel browser/dispositivo; non sono sincronizzate fra dispositivi. Usa la sezione Impostazioni per aggiungere il link al progetto ChatGPT.

I numeri iniziali sono valori di partenza modificabili: reddito netto mensile €1.700, spese stimate €450 e target risparmio/investimenti €1.000. Le proiezioni sono versamenti cumulati senza rendimenti, costi o inflazione e non sono promesse di risultato.
