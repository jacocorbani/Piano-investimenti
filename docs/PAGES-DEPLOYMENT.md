# Ripristino della pubblicazione GitHub Pages

## Causa verificata
Dopo il merge della PR #1, il sito pubblicato usa l'index.html sorgente: il modulo richiesto è https://jacocorbani.github.io/src/main.ts. GitHub Pages non compila TypeScript/Vite quando pubblica direttamente la radice del branch. Il messaggio di caricamento rimane quindi visibile.

## Correzione pronta
Il workflow pages.yml esegue test, build e verifica degli asset e carica esclusivamente dist. Viene attivato da push su main o manualmente su main; develop-v2 esegue soltanto la CI. Il percorso base resta /Piano-investimenti/.

## Attivazione, dopo autorizzazione del proprietario
1. In Settings → Pages → Build and deployment → Source selezionare GitHub Actions.
2. Unire la PR di correzione da develop-v2 a main.
3. Verificare il workflow Publish Vite app to Pages. Se necessario avviarlo manualmente su main.
4. Aprire il sito pubblico e verificare panoramica, navigazione e assenza di errori nel caricamento degli asset.

Non pubblicare la radice dei sorgenti, non modificare soltanto il percorso src/main.ts e non cancellare i dati del browser. La compilazione produce i moduli JS necessari.
L'anteprima locale usa un archivio distinto da quello del dominio pubblico.

## Verifica eseguita
Controllo di dist superato; controllo contro la radice sorgente fallisce come previsto. Anteprima Vite al percorso /Piano-investimenti/: panoramica e Accademia aperte nel browser, 24 lezioni presenti. Questo è un controllo di avvio e navigazione, non un collaudo completo dei flussi finanziari.

Riferimento: https://vite.dev/guide/static-deploy.html#github-pages
