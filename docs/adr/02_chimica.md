# ADR 02: Renderer Chimico

## Contesto
Dobbiamo renderizzare molecole e meccanismi chimici (cariche, geometrie) in SVG senza dipendere da servizi esterni o far eseguire JS malevolo.

## Decisione
Si sceglie `smiles-drawer` (o equivalente libreria JS pura) per convertire stringhe SMILES in SVG, isolando l'esecuzione. Il modello restituirà stringhe SMILES, non script.

## Conseguenze
La libreria è leggera e gestisce proiezioni 2D in modo autonomo senza canvas DOM, rendendola ideale per Node.js.
