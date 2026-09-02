# Kandidaten für die Build-Konstanten

> **Status: entschieden.** `ALLOWED_MINTS` fuehrt seit 02.09.2026 vier Mints:
> `mint.minibits.cash/Bitcoin` und `mint.macadamia.cash` fuer echtes Geld,
> `testnut.cashu.exchange` und `testnut.cashu.space` fuer die Entwicklung.
> A-05 ist damit erfuellt — mehrere Mints mit NUT-11 und NUT-12. Einzige
> Luecke: `cashu.exchange` ohne DLEQ, bewusst in Kauf genommen.

## Nachtrag 02.09.2026 — die vier eingetragenen Mints

| Mint | Software | NUT-11 | NUT-12 | Fee (aktiv, sat) | CORS |
|---|---|---|---|---|---|
| `mint.minibits.cash/Bitcoin` | cdk-mintd 0.17.6 | ja | ja | **0 ppk** | `*` |
| `mint.macadamia.cash` | Nutshell 0.20.3 | ja | ja | 150 ppk | `*` |
| `testnut.cashu.exchange` | Nutshell-CF 0.0.1 | ja | **nein** | 10 ppk | `*` |
| `testnut.cashu.space` | cdk-mintd 0.17.0-rc.3 | ja | ja | 100 ppk | `*` |

Minibits liegt unter dem Pfad `/Bitcoin`; die nackte Domain antwortet mit 404.
`mint.madacamia.cash` existiert nicht — die richtige Schreibweise ist
*macadamia*.

### Die beiden Testmints im Vergleich

| | `testnut.cashu.exchange` | `testnut.cashu.space` |
|---|---|---|
| Software | Nutshell-CF 0.0.1 | cdk-mintd 0.17.0-rc.3 |
| NUT-11 (P2PK) | ja | ja |
| **NUT-12 (DLEQ)** | **nein** (`supported: false`) | ja |
| Fee, aktives sat-Keyset | 10 ppk | 100 ppk |
| Weitere aktive Einheiten | usd (0 ppk) | usd, eur, msat (je 100 ppk) |
| CORS auf GET | `*` | `*` |
| Antwortzeit `/v1/keysets` | ~2,2 s | ~0,07 s |

`cashu.exchange` kam am 02.09.2026 dazu, weil `cashu.space` beim Minten nicht
zuverlaessig arbeitete. Der Preis ist NUT-12: Ohne DLEQ kann der Empfaenger
nicht pruefen, ob der Mint seine Token markiert hat, und NIP-61 empfiehlt es
ausdruecklich. **A-05 ist damit der Zahl nach erfuellt, dem Inhalt nach
nicht.** Fuer die Demo ist das neu zu entscheiden.

Erhebungsdatum: 2026-09-01. Gegengeprüft am selben Tag. Alle Werte stammen aus **lesenden** HTTP-GETs,
die live gegen die Endpunkte gelaufen sind. Keine Quotes, keine Swaps,
keine Melts, keine Beträge.

## Methode

Pro Mint zwei Abrufe:

- `GET <mint>/v1/info` → Feld `nuts`, daraus `nuts["11"].supported` (P2PK)
  und `nuts["12"].supported` (DLEQ).
- `GET <mint>/v1/keysets` → Feld `input_fee_ppk` je Keyset. `input_fee_ppk`
  ist die Swap-Gebühr in *Promille pro tausend Inputs*; `0` heißt gebührenfrei,
  `100` heißt 1 sat pro 10 Inputs, `150` entsprechend mehr. Maßgeblich ist
  das Keyset mit `active: true` — inaktive Keysets sind nur für Altbestände.

Zusaetzlich pro Mint eine CORS-Probe: derselbe GET noch einmal mit dem Header
`Origin: https://player.example`, und ein OPTIONS-Preflight auf `/v1/swap` mit
`Access-Control-Request-Method: POST`. Gesucht wird jeweils der
Antwort-Header `Access-Control-Allow-Origin`.

Pro Relay ein Abruf: `GET https://<host>` mit `Accept: application/nostr+json`
(NIP-11), daraus `supported_nips` und `limitation`.

Nicht erhoben, weil ohne Zahlung nicht feststellbar: Lightning-Melt-Gebühren
(`fee_reserve`), tatsächliche Einlösbarkeit, Uptime über Zeit, Betreiber-Identität.

**Was die CORS-Probe nicht ersetzt:** CORS ist eine Eigenschaft des Paares aus
Origin und Mint. Diese Probe lief von der Kommandozeile mit einer erfundenen
Origin — sie zeigt, ob ein Mint die Header ueberhaupt setzt, nicht, ob er sie
fuer *eure* Origin setzt. A-02 unter der echten Demo-Origin bleibt Pflicht.

## Mint-Kandidaten

| Mint | URL | NUT-11 | NUT-12 | Swap-Fee (aktives Keyset) | CORS auf GET | Software |
|---|---|---|---|---|---|---|
| Minibits | `https://mint.minibits.cash/Bitcoin` | ja | ja | **0** (`input_fee_ppk=0`, sat) | `*` | cdk-mintd 0.17.6 |
| 21Mint | `https://21mint.me` | ja | ja | **0** (`input_fee_ppk=0`, sat + msat) | **teilweise** — siehe unten | Nutshell 0.18.2 |
| macadamia | `https://mint.macadamia.cash` | ja | ja | 150 ppk (sat) | `*` | Nutshell 0.20.3 |
| Coinos | `https://mint.coinos.io` | ja | ja | 100 ppk (sat) | `*` | Nutshell 0.20.3 |
| WesternBTC | `https://mint.westernbtc.com` | ja | ja | 100 ppk (sat) | `*` | cdk-mintd 0.17.0 |

Alle Werte aus `/v1/info` und `/v1/keysets`, die CORS-Spalte aus der Probe oben.

Alle fünf melden zusätzlich NUT-07 (State-Check), NUT-08 (Lightning-Fee-Return),
NUT-09 (Restore), NUT-10 (Spending Conditions), NUT-14 (HTLC) und NUT-20
(signierte Mint-Quotes) als `supported: true`. NUT-17 (WebSocket-Subscriptions,
u. a. `proof_state`) ist bei allen fünf vorhanden — für einen Player relevant,
weil er damit auf Proof-Zustände reagieren kann, ohne zu pollen.

### Der Sonderfall 21Mint

21Mint ist der einzige zweite gebuehrenfreie Kandidat, und genau bei ihm gibt
es einen Haken. Aufgeschluesselt nach Endpunkt:

| Anfrage | `Access-Control-Allow-Origin` |
|---|---|
| `GET /v1/info` | **fehlt** |
| `GET /v1/keys` | vorhanden |
| `GET /v1/keysets` | vorhanden |
| `OPTIONS /v1/swap` (Preflight) | vorhanden, `POST` erlaubt |

Der Swap-Pfad ist also offen, und die Keysets, die `loadMint()` braucht, sind
es auch — aber ein Aufruf von `/v1/info` aus dem Browser wuerde blockiert.
Praktische Folge: Die Wallet duerfte funktionieren, `a02-mints.html` wird den
Mint aber als nicht erreichbar melden, weil die Pruefseite ueber `/v1/info`
geht. Das ist eine Nginx-Konfiguration beim Betreiber, kein Protokollproblem,
und kann sich jederzeit aendern. **Vor der Auswahl unter der echten Origin
nachpruefen** — nicht auf diese Tabelle verlassen.

### Einordnung

Die harte Anforderung ist NUT-11 **und** NUT-12 — die erfuellen alle fuenf.
Unterschieden wird damit ueber Gebuehr und CORS:

- **Gebuehrenfrei und CORS vollstaendig:** nur **Minibits**. Der eine
  Kandidat, gegen den nichts spricht.
- **Gebuehrenfrei, CORS mit Einschraenkung:** 21Mint (siehe oben).
- **CORS vollstaendig, aber mit Fee:** macadamia (150 ppk), Coinos (100 ppk),
  WesternBTC (100 ppk). Bei 100 ppk kostet jeder Swap mit zehn oder mehr
  Inputs mindestens 1 Sat extra — bei einem Minutenbetrag von 10 Sat ist das
  spuerbar, aber nicht ruinoes.

A-05 verlangt einen Reserve-Mint, es muessen also zwei ueberleben. Meine
Einschaetzung: **Minibits als erster**, und als zweiter entweder 21Mint (wenn
die CORS-Pruefung unter eurer Origin gut ausgeht) oder **WesternBTC**
beziehungsweise **Coinos** (wenn ihr die 100 ppk in Kauf nehmt und dafuer
keine offene Frage mitschleppt). Ich wuerde die Fee nehmen: Ein Mint, der
waehrend der Demo an einem fehlenden Header scheitert, kostet mehr als 100 ppk.

### Nicht erreichbar zum Erhebungszeitpunkt

Diese Hosts haben nicht geantwortet (curl exit, HTTP 000). Das ist eine
Momentaufnahme, kein Urteil über den Mint:

`https://stablenut.cashu.network`, `https://mint.lnwallet.app`,
`https://cashu.mint.cubabitcoin.org`, `https://nofees.testnut.cashu.space`

### Testnetz (nicht für Produktion)

`https://testnut.cashu.space` — NUT-11 ja, NUT-12 ja, 100 ppk, CORS `*`, Units sat/msat/usd/eur.
Nützlich für manuelle Tests ohne echte Beträge; Tokens dort sind wertlos.
Wenn ihr eine Testkonstante braucht, ist das der Kandidat.

## Relay-Kandidaten

| Relay | supported_nips | auth_required | payment_required | max_message_length | max_subscriptions | Festgestellt durch |
|---|---|---|---|---|---|---|
| `wss://relay.damus.io` | 1,2,4,9,11,28,40,45,70,77 | nein | nein | 1.000.000 | 200 | NIP-11 |
| `wss://relay.primal.net` | 1,2,4,9,11,22,28,40,70,77 | nein | nein | 1.000.000 | 20 | NIP-11 |
| `wss://purplerelay.com` | 1,2,4,9,11,22,28,40,45,70,77 | nein | nein | 131.072 | 200 | NIP-11 |
| `wss://nos.lol` | 1,2,4,9,11,28,40,45,70 | nein | nein | 131.072 | 20 | NIP-11 |
| `wss://offchain.pub` | 1,2,4,9,11,28,40,45,70,77 | nein | nein | 131.072 | 20 | NIP-11 |
| `wss://nostr.mom` | 1,2,4,9,11,28,40,45,70 | nein | nein | 131.072 | 50 | NIP-11 |

### Einordnung

- `relay.damus.io` und `relay.primal.net` haben mit 1 MB die deutlich höhere
  Nachrichtengrenze. Falls Events mit eingebettetem Token groß werden können,
  ist das der ausschlaggebende Wert — die 131 KB der übrigen sind für
  normale Text-Events reichlich, aber es ist der engere Rahmen.
- Alle sechs sind schreibbar ohne AUTH und ohne Zahlung. **Verifiziert habe
  ich nur, was das NIP-11-Dokument behauptet** — geschrieben habe ich nichts,
  wie festgelegt. Ob ein Relay ein `OK: true` liefert, ist damit *nicht* geprüft.
- `wss://nostr.wine` ist **ungeeignet**: `payment_required: true`,
  `restricted_writes: true`, Aufnahmegebühr 18.888.000 msat (≈ 18.888 sat).
- `wss://relay.snort.social` antwortete mit HTTP 503,
  `wss://relay.nostr.band` und `wss://relay.nostr.bg` gar nicht.

## Was du entscheiden musst

1. **Mint-Auswahl fuer die Demo.** Aktuell laeuft nur der Testmint.
   Minibits steht als erster Kandidat fest; beim zweiten die Wahl zwischen
   21Mint (gebuehrenfrei, offene CORS-Frage) und WesternBTC oder Coinos
   (100 ppk, CORS geklaert). Dazu die Kriterien, die ich nicht erheben kann:
   Vertrauen, Jurisdiktion, Betreiber-Identitaet.
2. **Relay-Anzahl und -Mix.** FR-29 hängt daran: „kein Relay antwortet mit OK"
   wird umso unwahrscheinlicher, je mehr unabhängige Relays konfiguriert sind.
   Mindestens ein Relay mit 1-MB-Grenze einzuplanen, kostet nichts.
3. **Testkonstanten.** Ob `testnut.cashu.space` als separater Test-Mint in die
   Konfiguration soll, oder ob manuelle Tests ihre Werte anders beziehen.

## Was hier bewusst offen bleibt

Uptime, Einlösbarkeit, Melt-Gebühren und Betreiber-Vertrauen sind mit
lesenden Abrufen nicht feststellbar. Die Tabellen sagen, was die Mints und
Relays über sich selbst behaupten — mehr nicht.
