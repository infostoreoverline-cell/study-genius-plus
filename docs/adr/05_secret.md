# ADR 05: Secret Helper

## Contesto
Le chiavi API di Google e DeepSeek non devono essere scritte in `.env` locale, nel browser o nei log, ma archiviate sul PC di Marco in modo sicuro, sopravvivendo al riavvio del progetto.

## Decisione
Uso di DPAPI (Data Protection API) su Windows tramite la libreria `win-dpapi`. Il database SQLite salverà solo i blob cifrati con l'identità dell'utente (CurrentUser).

## Conseguenze
I segreti sono illeggibili se trasferiti su un altro PC. Se l'utente cambia utente Windows, deve reinserire le chiavi. Il pacchetto `win-dpapi` sfrutta funzionalità native senza binari complessi compilati, risultando stabile.
