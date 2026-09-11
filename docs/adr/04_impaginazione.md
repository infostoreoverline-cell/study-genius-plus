# ADR 04: Motore di Paginazione e Documenti

## Contesto
I documenti finali devono essere consegnati in PDF formattato, includendo font, matematica (MathJax), immagini SVG generate e una corretta paginazione (Page QA).

## Decisione
Uso di Chromium headless tramite Playwright per esportare l'HTML e CSS composti in PDF. MathJax viene incluso in locale per il rendering offline delle formule.

## Conseguenze
Playwright necessita del download dei binari dei browser su Windows (già collaudato con `npx playwright install chromium`), garantendo affidabilità e identità visiva rispetto alla preview a schermo.
