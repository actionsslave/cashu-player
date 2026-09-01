# Ist-Stand gegen die Traceability-Matrix

Stand: 2026-09-01. Grundlage ist Kapitel 8 des
[Anforderungs-Dokuments](anforderungen-cashu-podcast-player-web-mvp.md),
Zeile fuer Zeile gegen den Quelltext geprueft.

## Wie die Einstufungen zu lesen sind

| Einstufung | Bedeutung |
|---|---|
| **umgesetzt** | Code vorhanden und gelesen, automatischer Test vorhanden und gelesen, Engpass in Kapitel 8 ist „KI-tauglich" |
| **Code vorhanden, ungeprueft** | Code vorhanden und gelesen, aber der Engpass ist **„Menschliche Verifikation"**. Diese Zeilen kann ich nicht abhaken, egal wie ueberzeugend der Code aussieht — was hier fehlt, ist ein Mensch mit Browser, Extension, Mint und Relay |
| **offen** | keine Umsetzung vorhanden, oder nur unter der echten Origin feststellbar |

Der Engpass stammt aus Kapitel 8 und ist unveraendert uebernommen. Jede
Fundstelle habe ich gelesen; jeder genannte Test existiert und laeuft.

Was **nicht** geprueft ist: die Laufzeit. Ich habe keine Zahlung ausgeloest,
kein Mint-Quote geholt, nichts an ein Relay publiziert und keinen Schluessel
angefasst. Alle Aussagen unten beziehen sich auf Quelltext und Testlauf.

## Funktionale Anforderungen

| ID | Einstufung | Fundstelle | Test | Bemerkung |
|---|---|---|---|---|
| FR-01 | umgesetzt | `src/identity/nip07.ts` → `detectSigner()`; `src/ui/identity-bar.tsx` | `test/identity/nip07.test.ts`, `test/ui/identity-bar.test.tsx` | Zwei Extensions aus `SUGGESTED_EXTENSIONS` (nos2x, Alby) |
| FR-02 | umgesetzt | `src/identity/session.ts` → `login()`, `restoreSession()` | `test/identity/session.test.ts` | Session in IndexedDB, nicht localStorage (NR-04) |
| FR-03 | Code vorhanden, ungeprueft | `src/identity/nip07.ts` → `withTimeout()`, `SignerError` | `test/identity/nip07.test.ts` | 30-s-Timeout aus `SIGN_TIMEOUT_MS`. Der Code kann Ablehnung und internen Extension-Fehler nicht unterscheiden — als `TODO` im Quelltext vermerkt |
| FR-04 | Code vorhanden, ungeprueft | `src/identity/signing-permission.ts` → `runSigningProbe()` | `test/identity/signing-permission.test.ts` | Probe traegt kind 9321, weil Extensions je Art freigeben. Ob die Dauerfreigabe wirklich traegt, ist **A-01** und der Punkt, an dem das Projekt scheitern kann |
| FR-05 | umgesetzt | `src/payments/capability.ts` → `paymentCapability()` | `test/payments/capability.test.ts` | `canSubscribe`/`canPlay` sind konstant true |
| FR-06 | umgesetzt | `src/identity/session.ts` → `logout()`; Dialog `src/ui/identity-bar.tsx:88` | `test/ui/identity-bar.test.tsx` | Dialog nennt ausdruecklich, dass die Wallet bleibt |
| FR-07 | umgesetzt | `src/feed/subscriptions.ts` → `subscribe()`; `src/feed/parse.ts` → `parseFeed()` | `test/feed/subscriptions.test.ts`, `test/feed/parse.test.ts` | iTunes- und Podcast-Namespace inkl. `podcast:txt`, `podcast:value`, `valueRecipient` |
| FR-08 | Code vorhanden, ungeprueft | `src/feed/fetch.ts` → Proxy-Zweitversuch | `test/feed/fetch.test.ts` | Proxy nur bei `reason === 'netz'`; HTTP-Fehler und Timeout loesen ihn bewusst nicht aus. `FEED_PROXY_URL` ist **leer** (OQ-03): der Zweitversuch wird uebersprungen, FR-08 ist damit codeseitig da, aber ohne Ziel |
| FR-09 | umgesetzt | `src/feed/subscriptions.ts` → `listSubscriptions()`, `unsubscribe()`; `parseFeed()` → `totalEpisodes` | `test/feed/subscriptions.test.ts`, `test/feed/parse.test.ts`, `test/ui/feed-view.test.tsx` | Abbestellen loescht Episoden in derselben Transaktion. Die Abo-Zeile nennt seit 01.09.2026 die Gesamtzahl im Feed, nicht den lokalen Bestand; aeltere Abos fallen auf den Bestand zurueck |
| FR-10 | umgesetzt | `src/feed/parse.ts:148` (`EPISODES_PER_FEED`); `listEpisodes()`; Darstellung `src/ui/feed-view.tsx` | `test/feed/parse.test.ts`, `test/feed/subscriptions.test.ts`, `test/ui/feed-view.test.tsx` | 50 Episoden geladen und gespeichert (`EPISODES_PER_FEED`), davon 3 sichtbar (`EPISODES_VISIBLE`), absteigend nach Datum, je Episode nur der Titel. Am 01.09.2026 auf Nutzerwunsch zweimal reduziert; FR-10 im Dokument mitgezogen |
| FR-11 | umgesetzt | `src/feed/fetch.ts` (`FEED_TIMEOUT_MS`); `refreshSubscription()` | `test/feed/fetch.test.ts` | Bei Fehler bleibt der letzte Stand, `feed-view.tsx:83` faengt ab |
| FR-12 | umgesetzt | `src/ui/player.tsx` → `start`, `halt`, `skip`, `scrubTo` | `test/ui/player.test.tsx` | +30 s / −15 s, Fortschrittsleiste |
| FR-13 | Code vorhanden, ungeprueft | `src/player/media-session.ts` | `test/player/media-session.test.ts` | Ob das Betriebssystem Titel und Cover wirklich anzeigt und die Medientaste durchkommt, sagt kein jsdom-Test |
| FR-14 | umgesetzt | `src/player/position-store.ts` → `PositionPersister`, `loadPosition()` | `test/player/position-store.test.ts` | `POSITION_PERSIST_INTERVAL_MS` = 10 s |
| FR-15 | Code vorhanden, ungeprueft | `src/wallet/local-wallet.ts` → `LocalWallet.balance()` | `test/wallet/local-wallet.test.ts` | Gegen einen echten Mint ungetestet. `ALLOWED_MINTS` steht seit 01.09.2026 auf `testnut.cashu.space` — **ein** Mint, A-05 verlangt zwei |
| FR-16 | Code vorhanden, ungeprueft | `local-wallet.ts` → `exportTokens()`; `src/ui/qr-code.tsx` | `test/wallet/export.test.ts`, `test/ui/qr-code.test.tsx` | Der eigentliche Test ist die **Einloesung in einer fremden Wallet** — das kann nur ein Mensch |
| FR-17 | Code vorhanden, ungeprueft | `local-wallet.ts` → `importToken()`; `TokenImportError` | `test/wallet/import.test.ts` | Vier benannte Fehlergruende inkl. „bereits eingeloest" (NUT-07) |
| FR-18 | Code vorhanden, ungeprueft | `src/wallet/persistence.ts` → `ensurePersistentStorage()` | `test/wallet/persistence.test.ts` | Chrome entscheidet heuristisch; beide Ergebnisse gueltig |
| FR-19 | umgesetzt | `src/wallet/history.ts` | `test/wallet/history.test.ts` | Richtung, Betrag, Zeit, Podcast, Episode, Status |
| FR-20 | umgesetzt | `src/payments/streaming.ts` → `flush()` (`MIN_BALANCE_SATS`); Fortsetzung `src/main.tsx:63` | `test/payments/streaming.test.ts` | Stoppt unter 10 Sat, `resume()` nach Aufladung |
| FR-21 | umgesetzt | `src/feed/parse.ts:92` → `readNpub()` | `test/feed/parse.test.ts` | Nur ein bech32-gueltiger npub zaehlt |
| FR-22 | Code vorhanden, ungeprueft | `src/payments/nutzap-config.ts` → `fetchNutzapConfig()` | `test/payments/nutzap-config.test.ts` | 24-h-Cache aus `NUTZAP_CONFIG_CACHE_MS`; gegen echte Relays ungetestet |
| FR-23 | umgesetzt | `src/payments/resolve-target.ts` → `MESSAGES`; `capability.ts` | `test/payments/resolve-target.test.ts`, `test/payments/capability.test.ts` | Vier unterscheidbare Gruende, `lookup-failed` getrennt von `no-nutzap-config` |
| FR-24 | umgesetzt | `src/player/listening-ticker.ts` → `sample()` | `test/player/listening-ticker.test.ts` | Aus `currentTime`, nicht aus Timer-Ticks; Sprungerkennung ueber Wanduhr-Abgleich |
| FR-25 | Code vorhanden, ungeprueft | `src/payments/streaming.ts` → `flush()` | `test/payments/streaming.test.ts` | Rest unter 1 Sat bleibt stehen. Der 60-s-Takt unter echter Wiedergabe ist ungeprueft |
| FR-26 | umgesetzt | `src/payments/streaming-settings.ts`; UI `payments-panel.tsx` | `test/payments/streaming-settings.test.ts` | 0–1000, Vorgabe 10, einmalige Bestaetigung |
| FR-27 | Code vorhanden, ungeprueft | `src/payments/nutzap.ts` → `buildNutzap()`, `p2pkLockKey()` | `test/payments/nutzap.test.ts`, `test/payments/pay.test.ts` | Tags `proof`/`unit`/`u`/`p`, `02`-Praefix. Ob der Empfaenger die Proofs einloesen kann, sagt nur ein Test gegen eine echte Wallet |
| FR-28 | umgesetzt | `src/ui/boost-dialog.tsx`; `nutzap.ts` → `formatTimecode()` | `test/ui/boost-dialog.test.tsx` | Vier Vorgaben, freier Betrag, 280 Zeichen mit Restzaehler |
| FR-29 | Code vorhanden, ungeprueft | `src/payments/pay.ts` → `sendNutzap()`, `retryPendingNutzaps()` | `test/payments/pay.test.ts` (17 Tests) | Beide Faelle getrennt umgesetzt und getestet, siehe unten. Am Dokument nachgezogen |
| FR-30 | umgesetzt | `src/ui/payments-panel.tsx` | `test/ui/payments-panel.test.tsx` | Sitzungszaehler, Boost-Bestaetigung, Fehlergrund |
| FR-31 | umgesetzt | `public/manifest.webmanifest`; `src/sw.ts`; `src/pwa/register.ts` | `test/pwa/manifest.test.ts`, `test/pwa/cache-policy.test.ts`, `test/pwa/register.test.ts` | `sw.js` liegt nach dem Build in `dist/` (verifiziert). Registrierung nur unter `PROD` und `isSecureContext` |
| FR-32 | Code vorhanden, ungeprueft | `src/pwa/install-prompt.ts`; `src/ui/install-button.tsx` | `test/ui/install-button.test.tsx` | `beforeinstallprompt` feuert nur unter HTTPS mit gueltigem Manifest — ohne Deployment nicht pruefbar |

## Nicht-funktionale Anforderungen

| ID | Einstufung | Fundstelle | Test | Bemerkung |
|---|---|---|---|---|
| NFR-01 | offen | — | — | Ladezeit unter 2 s ist erst unter der echten Origin messbar. Zur Einordnung: das Bundle wiegt 427,46 kB, gzip 142,92 kB |
| NFR-02 | Code vorhanden, ungeprueft | `src/payments/simple-pool-gateway.ts` → `MAX_WAIT_MS = 5_000` | — | Die 5 s sind als Grenze gesetzt, nicht als Ergebnis gemessen |
| NFR-03 | Code vorhanden, ungeprueft | `src/sw.ts` (Fallback-Kette); `streaming.ts:110` (catch) | `test/payments/streaming.test.ts` | Netzausfall ist nur simuliert |
| NFR-04 | umgesetzt | `src/db/database.ts`; `register.ts` → `isSecureContext` | `test/db/database.test.ts`, `test/pwa/register.test.ts` | Neun Stores, alles in IndexedDB |
| NFR-05 | umgesetzt | Guardrail-Regeln `NR-05` in `tools/guardrails.ts` | `test/guardrails/source.test.ts` | Statisch durchgesetzt ueber `src/` und `index.html`; einzige Ausnahme ist `namespaces.ts` (XML-Bezeichner, werden nie abgerufen) |
| NFR-06 | offen | — | — | Chrome und Brave gleichwertig: nur am Geraet feststellbar |
| NFR-07 | offen | — | — | Demo unter 3 Minuten per Hotspot: nur am Geraet feststellbar |
| NFR-08 | offen | — | — | Prozessanforderung an das Dokument selbst, nach dem Hackathon zu beantworten. Ein Datenpunkt liegt vor: FR-29 war unterspezifiziert und musste nachgezogen werden |

## Negative Anforderungen

| ID | Einstufung | Fundstelle | Test | Bemerkung |
|---|---|---|---|---|
| NR-01 | umgesetzt | Guardrail-Regel `NR-01` | `test/guardrails/source.test.ts`, `scanner.test.ts` | Wortgrenze verhindert Fehlalarm bei `positionSeconds` |
| NR-02 | Code vorhanden, ungeprueft | `src/wallet/mint-gateway.ts`, `src/payments/nostr-gateway.ts` als einzige Netz-Schnittstellen | — | Architektonisch auf zwei Stellen begrenzt, aber **nicht statisch erzwungen**. Der Nachweis ist das Netzwerk-Panel waehrend einer echten Zahlung |
| NR-03 | Code vorhanden, ungeprueft | Guardrail-Regel `NR-03`: `FEED_PROXY_URL` nur in `src/feed/` | `test/guardrails/source.test.ts` | Statisch abgesichert; der Gegenbeweis waere ein Proxy-Aufruf zur Laufzeit |
| NR-04 | Code vorhanden, ungeprueft | Guardrail-Regeln `NR-04`: `localStorage`, `console.*` | `test/guardrails/source.test.ts` | Faengt den Quelltext, nicht eine Bibliothek. DevTools-Pruefung bleibt |
| NR-05 | umgesetzt | Guardrail-Regeln `NR-05` | `test/guardrails/source.test.ts` | 13 Testreferenzen, die dichteste Abdeckung im Projekt |
| NR-06 | umgesetzt | `rateConfirmed`-Sperre `src/main.tsx:94`; `payments-panel.tsx` (`askForRate`) | `test/payments/streaming-settings.test.ts`, `test/ui/payments-panel.test.tsx` | Ohne Bestaetigung entsteht kein `StreamingController` |
| NR-07 | umgesetzt | `local-wallet.ts:111` (Import); `resolve-target.ts` (Schnittmenge) | `test/wallet/import.test.ts`, `test/payments/resolve-target.test.ts` | Vergleich ueber `normalizeMintUrl`, nicht zeichengenau |
| NR-08 | umgesetzt | kein Backend im Repo | `test/guardrails/source.test.ts` | Abhaengigkeitsliste ist auf fuenf Pakete festgenagelt; ein neues Paket laesst den Test rot werden |
| NR-09 | Code vorhanden, ungeprueft | Guardrail-Regel `NR-09` in `tools/guardrails.ts` | `test/guardrails/scanner.test.ts`, `source.test.ts` | **In dieser Runde ergaenzt.** Faengt nur den schreibenden Teil ab; ob die NIP-60-Wallet des Testaccounts unveraendert bleibt, zeigt erst der Vorher-Nachher-Vergleich |
| NR-10 | Code vorhanden, ungeprueft | `src/pwa/cache-policy.ts` → `shouldCache()`; Regel `NR-10` | `test/pwa/cache-policy.test.ts` | Nur eigene Origin, Mints zusaetzlich ausgeschlossen. Cache Storage nach einer Zahlung bleibt zu pruefen |

## Zusammenzaehlung

Ausgezaehlt aus der Tabelle oben, abgeglichen gegen Kapitel 8: alle 50 Zeilen
sind erfasst, keine fehlt, keine ist doppelt.

| | Anzahl |
|---|---|
| umgesetzt | 26 |
| Code vorhanden, ungeprueft | 20 |
| offen | 4 |
| **gesamt** | **50** |

Die 20 ungeprueften Zeilen sind kein Vorwurf an den Code — sie sind genau die
Zeilen, bei denen Kapitel 8 „Menschliche Verifikation" als Engpass nennt. Die
Liste dazu steht in [`manuelle-tests.md`](manuelle-tests.md) und ist bislang
**vollstaendig unausgefuellt**: 43 Pruefzeilen, davon 0 mit gesetztem Ergebnis.

Das ist der eigentliche Befund dieser Bestandsaufnahme. Der Code ist weit;
geprueft ist er nicht. Die zwei Punkte, an denen das Projekt scheitern kann —
**A-01** (signiert die Extension wiederholt ohne Interaktion?) und **A-02**
(sind die Mints aus dem Browser erreichbar?) — sind beide offen, und beide
gehoeren laut Pruefliste an Tag 1, vor das Zahlungspaket.

## Abweichungen zwischen Dokument und Code

**1. FR-29 — nachgezogen.** Das Dokument sagte pauschal, Proofs wuerden bei
fehlgeschlagenem Publizieren freigegeben. `src/payments/pay.ts` unterscheidet
seit Commit `af0a3e5` zwei Faelle, und `docs/manuelle-tests.md` haelt die
Entscheidung vom 28.08.2026 fest. FR-29 im Dokument nennt jetzt beide Faelle
getrennt. Der Code folgte der Unterscheidung bereits; ungetestet war
`retryPendingNutzaps()` — der Mechanismus des zweiten Falls. Fuenf Tests
ergaenzt (Commit `e07cef7`).

**2. US-06-AC-4 ist mit der neuen FR-29 nicht mehr deckungsgleich.** Das
Gherkin-Szenario lautet „kein Relay bestaetigt das Event" und erwartet, dass
das Guthaben *vollstaendig* zurueckkommt. Nach der Entscheidung vom 28.08.2026
gilt das nur, wenn der Abbruch **vor** dem Mint-Swap passiert.
`docs/manuelle-tests.md` loest das bereits auf, indem es US-06-AC-4 an den Fall
„alle Relays vor dem Senden unerreichbar" bindet und den Restfall getrennt
fuehrt; `test/payments/pay.test.ts:129` folgt dieser Lesart. **Nicht
geaendert** — der Auftrag erlaubte im Anforderungs-Dokument nur die Aenderung
an FR-29. Vorschlag: US-06-AC-4 um das Wort „unerreichbar" praezisieren und ein
US-06-AC-6 fuer den Restfall ergaenzen.

**3. `DEMO_NPUB` war tote Konfiguration — entfernt.** Die Konstante war als
Rueckfallebene fuer A-04 deklariert, wurde aber nirgends ausser in
`hasPlaceholders()` verwendet: `resolvePaymentTarget()` liefert bei fehlendem
npub `no-npub` und greift nicht darauf zurueck. Das entspricht FR-23 und OQ-01
(„fuer den MVP: gar nicht"), also war die Konstante ueberfluessig, nicht der
Code falsch. Auf Entscheidung vom 01.09.2026 entfernt. **Erledigt.**

**4. Der „Guardrails-Scanner" ist kein eigener Aufruf.** Der Auftrag nennt vier
Gates: `npm test`, `npm run build`, `npm run lint` und den Guardrails-Scanner.
`tools/guardrails.ts` ist aber ein Modul ohne CLI — es laeuft ausschliesslich
ueber `test/guardrails/`, ist also in `npm test` enthalten. Es gibt kein
`npm run guardrails`. Die CI-Action fuehrt die Guardrail-Tests deshalb als
eigenen, benannten Schritt vor den uebrigen Tests aus, damit ein Verstoss
sichtbar bleibt. Kein Widerspruch im Code, nur eine Erwartung, die ins Leere
gegriffen haette.

## Stand der Build-Konfiguration

Am 01.09.2026 gesetzt, nachdem die Entscheidungen gefallen sind:

| Konstante | Wert | Bemerkung |
|---|---|---|
| `ALLOWED_MINTS` | `https://testnut.cashu.space` | Testmint, Tokens wertlos. Am 01.09.2026 geprueft: NUT-11 ja, NUT-12 ja, CORS `*`, aktives sat-Keyset 100 ppk. **A-05 offen** — der Reserve-Mint fehlt, und 100 ppk sind nicht fee-frei |
| `DEMO_RELAYS` | `relay.damus.io`, `relay.primal.net`, `nos.lol` | Nur fuer das Nachschlagen von kind:10019. Nutzaps gehen an die Relays aus dem kind:10019 des Empfaengers (FR-27, NR-02). Alle drei am 01.09.2026 per NIP-11 erreichbar, ohne AUTH, ohne Zahlung |
| `FEED_PROXY_URL` | leer | OQ-03, Rueckfall „Feeds waehlen, die CORS bereits setzen". `fetchFeed()` ueberspringt den Zweitversuch bei leerem Wert |
| `DEMO_NPUB` | entfernt | War nirgends verwendet, siehe Abweichung 3 |

`hasPlaceholders()` liefert damit `false`, die Warnung im UI ist weg. Das
heisst **nicht**, dass die Konfiguration demo-fertig ist: Der Testmint ist eine
Entwicklungsentscheidung, kein Demo-Mint, und A-05 ist unerfuellt.

**5. FR-10 auf Nutzerwunsch geaendert.** Die Episodenliste zeigte Titel,
Datum, Dauer und Beschreibung. Die Beschreibungen der Feeds sind lang und
enthalten rohes HTML, das als Text durchschlug — die Liste war damit
unbrauchbar. Am 01.09.2026 auf den Titel allein reduziert und FR-10 im
Anforderungs-Dokument mitgezogen, damit Code und Dokument nicht auseinander
laufen. Datum, Dauer und Beschreibung werden weiterhin geparst und in
IndexedDB gespeichert; sie sind nur nicht dargestellt. Im selben Zug wurde die
Anzeigemenge auf 3 Episoden begrenzt (`EPISODES_VISIBLE`), getrennt von der
Abrufmenge von 50 (`EPISODES_PER_FEED`). Weil die Abo-Zeile damit "50 Episoden"
meldete, waehrend drei sichtbar waren, nennt sie jetzt die Gesamtzahl im Feed
(`totalEpisodes`, beim Parsen vor dem Zuschnitt gezaehlt) — bei Darknet Diaries
180 statt 50. FR-09 im Dokument praezisiert. **Erledigt.**

**Offen dabei:** Die Beschreibung wurde als roher HTML-Text angezeigt, statt
als Markup interpretiert oder bereinigt zu werden. Das ist jetzt unsichtbar,
aber nicht behoben — wer die Beschreibung wieder einblendet, holt sich den
Fehler zurueck.

## Blockiert

**A-01 und A-02 kann ich nicht abnehmen.** Beide verlangen einen Browser mit
installierter Extension beziehungsweise die echte Demo-Origin. A-02 ist
zusaetzlich per Definition an die Origin gebunden — ein Ergebnis von
`localhost` sagt ueber CORS nichts aus. Vorbereitet ist, was sich vorbereiten
liess: `docs/kandidaten.md` enthaelt fuenf Mints mit NUT-11, NUT-12, Fees und
einer CORS-Vorprobe von der Kommandozeile.

**Zahlungsseitige Verifikation ist ausgeschlossen.** FR-15 bis FR-17, FR-25,
FR-27, FR-29, NFR-02, NR-02 und NR-09 lassen sich abschliessend nur mit einer
echten Zahlung pruefen. Der Auftrag verbietet Zahlung, Mint-Quote, Swap und
Melt in jeder Hoehe, und das Publizieren an Relays ebenso. Diese Zeilen bleiben
deshalb bei „Code vorhanden, ungeprueft" — nicht weil der Code schwach waere,
sondern weil ich die Grenze nicht anfasse.

**Der Deployment-Schritt fehlt bewusst.** Die Origin steht nicht fest (OQ-08).
Die GitHub-Action prueft nur; der Deploy-Job kommt dazu, wenn die Entscheidung
gefallen ist. Siehe [`deployment.md`](deployment.md).

**Die CI-Action liegt lokal, aber nicht auf GitHub.** `.github/workflows/ci.yml`
ist geschrieben, das YAML ist gegen einen Parser gepruefte gueltige Syntax, und
der Commit liegt auf `main` — aber der Push wird abgewiesen:

```
refusing to allow an OAuth App to create or update workflow
`.github/workflows/ci.yml` without `workflow` scope
```

Der angemeldete Token hat die Scopes `gist`, `read:org` und `repo`; fuer Dateien
unter `.github/workflows/` braucht es zusaetzlich `workflow`. Einen Token mit
weiteren Rechten auszustellen ist deine Entscheidung, nicht meine. Der Weg:

```bash
gh auth refresh -h github.com -s workflow
git push origin main
```

Bis dahin laufen die vier Gates nur lokal. Alle uebrigen Commits dieser Runde
sind auf `main` gepusht.

## npm audit

Ausgefuehrt am 2026-09-01 nach `npm ci`:

```
found 0 vulnerabilities
```

| Schwere | Anzahl |
|---|---|
| critical | 0 |
| high | 0 |
| moderate | 0 |
| low | 0 |
| info | 0 |

280 Abhaengigkeiten geprueft, davon fuenf Laufzeit-Abhaengigkeiten
(`@cashu/cashu-ts`, `idb`, `nostr-tools`, `preact`, `qrcode-generator`). In
dieser Runde ist keine Abhaengigkeit hinzugekommen.

Eine Randnotiz aus `npm ci`: `fsevents@2.3.3` hat ein nicht freigegebenes
Install-Script. Das ist ein optionales macOS-Modul fuer File-Watching, es
haengt an der Entwicklungsumgebung und nicht am Bundle.
