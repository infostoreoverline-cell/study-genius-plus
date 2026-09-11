# ADR 03: Conversione Slide

## Contesto
Dobbiamo estrarre il contenuto (testo, note, immagini e formule) da presentazioni PPTX in modo deterministico e preservare la provenienza (indice slide).

## Decisione
Uso di un parser puro o tramite LibreOffice locale se serve resa visiva. Per ora si sceglie un parser puro su JS (es. un equivalente di `officeparser` o `pptx-parser`) per estrarre il testo strutturato senza accollarsi la conversione in PDF preventiva, oppure Playwright se il file può essere reso in HTML locale. Per M00: la lettura diretta di testo strutturato da file XML-based.

## Conseguenze
L'assenza di rendering completo significa che la validazione della geometria OCR su slide non supporta bounding box precisi per ogni parola, ma si riferirà alla slide intera.
