# Manuelle Tests

Diese Liste deckt die Zeilen der Traceability-Matrix (Kapitel 8) mit dem Engpass
„Menschliche Verifikation". Ein Coding-Agent kann sie nicht abhaken.

Spalte **Ergebnis** bitte ausfüllen: `ok`, `fehlgeschlagen` oder `offen`, mit Datum
und ein bis zwei Sätzen Beobachtung.

---

## Vorrang: die zwei Punkte, an denen das Projekt scheitern kann

Beides an Tag 1 prüfen, vor dem Zahlungspaket.

### A-01 — Signiert die NIP-07-Extension wiederholt ohne Interaktion?

Prüfseite: `/pruefung/a01-nip07.html` (im Dev-Server unter
`http://localhost:5173/pruefung/a01-nip07.html`, im Build unter derselben Origin
wie die Demo).

| # | Schritt | Erwartung | Ergebnis |
|---|---|---|---|
| A-01.1 | Seite in Chrome mit **nos2x** öffnen, „Public Key holen", Freigabe **dauerhaft** erteilen | npub-Hex erscheint | |
| A-01.2 | „3 Signaturen, 5 s Abstand" starten und **nichts anklicken** | 3 Zeilen, jede unter ~500 ms, kein Extension-Fenster | |
| A-01.3 | „3 Signaturen, 60 s Abstand" starten, Tab in den Hintergrund legen | 3 Signaturen, kein Fenster, keine Drosselung | |
| A-01.4 | Dasselbe in Chrome mit **Alby** | wie oben | |
| A-01.5 | Dasselbe in **Brave** mit Standard-Shields (A-07) | wie oben | |

**Wenn A-01.2 oder A-01.3 fehlschlägt:** A-01 ist falsch. Dann gilt die Rückfallebene
aus Kapitel 6 — Beträge lokal akkumulieren und beim Pausieren oder Beenden der
Episode als **ein** Nutzap mit **einer** Signatur senden. Diese Entscheidung fällt an
Tag 1, nicht an Tag 3, und ändert FR-25 spürbar. Bitte sofort melden.

### A-02 — Ist jeder Mint der erlaubten Liste aus dem Browser erreichbar?

Prüfseite: `/pruefung/a02-mints.html`. **Muss unter derselben Origin wie die Demo
laufen**, sonst sagt das Ergebnis nichts über CORS aus (OQ-08).

| # | Schritt | Erwartung | Ergebnis |
|---|---|---|---|
| A-02.1 | Kandidaten-Mints in das Textfeld eintragen, „Prüfen" | Spalte „Ergebnis" für jeden Mint: „erreichbar, CORS ok" | |
| A-02.2 | Spalte NUT-11 | `ja` für jeden Mint (sonst wäre der Nutzap-Token für jeden ausgebbar) | |
| A-02.3 | Spalte NUT-12 | `ja` (von NIP-61 empfohlen) | |
| A-02.4 | Spalte Fees | `fee-frei` (A-05; sonst fressen Fees die Minutenbeträge) | |
| A-02.5 | Mindestens zwei Mints bestehen alle Punkte | Reserve-Mint vorhanden (A-05) | |

**Wenn A-02.1 fehlschlägt:** Mint austauschen. Ein eigener Mint-Proxy wäre ein
bewusster Eingriff in NR-03 und muss gemeinsam entschieden werden.

---

## Identität und Signatur

| ID | Was prüfen | Erwartetes Ergebnis | Ergebnis |
|---|---|---|---|
| FR-03 / US-01-AC-4 | Login starten, Freigabe in der Extension **ablehnen** | App zeigt „Anmeldung abgebrochen", kein Fehlerzustand, weiterhin bedienbar | |
| FR-03 | Extension gesperrt lassen und 30 s warten | Abbruch nach Timeout mit genanntem Grund | |
| FR-04 / US-05-AC-3 | Vor dem ersten Streaming-Start: erscheint der Erklärdialog zur Dauerfreigabe? Danach drei Intervalle laufen lassen | Dialog erscheint einmal; danach drei Nutzaps ohne Extension-Fenster | |

## Feeds

| ID | Was prüfen | Erwartetes Ergebnis | Ergebnis |
|---|---|---|---|
| FR-08 / US-02-AC-2 | Feed eines Hosters **ohne** CORS-Header hinzufügen | Zweiter Versuch über den Proxy gelingt, Abo ist als „über Proxy geladen" markiert | |
| NR-03 | Während des Feed-Abrufs und einer Zahlung das Netzwerk-Panel mitlaufen lassen | Der Proxy sieht ausschließlich RSS-Abrufe; kein Mint- oder Relay-Verkehr | |

## Wiedergabe

| ID | Was prüfen | Erwartetes Ergebnis | Ergebnis |
|---|---|---|---|
| FR-13 / US-03-AC-1 | Episode starten, Tab wechseln, anderes Programm in den Vordergrund | Wiedergabe läuft weiter; Titel und Cover erscheinen in der Medienanzeige des Betriebssystems | |
| FR-13 / US-03-AC-3 | Bei Hintergrund-Tab die Medientaste der Tastatur drücken | App pausiert, Streaming-Zähler bleibt stehen | |

## Wallet

| ID | Was prüfen | Erwartetes Ergebnis | Ergebnis |
|---|---|---|---|
| FR-15 / US-04-AC-1 | Gültigen Token eines erlaubten Mints einfügen | Guthaben steigt um den Token-Betrag, Eingang im Verlauf mit Zeitstempel | |
| FR-16 / US-04-AC-3 | 500 Sat exportieren, Token in einer **anderen** Cashu-Wallet einlösen | Einlösung gelingt; das ist der eigentliche Test, nicht die Anzeige | |
| FR-16 | QR-Code des Exports mit einer Wallet-App scannen | Token wird gelesen | |
| FR-17 / US-04-AC-5 | Mint während des Imports abschalten oder Netz trennen | Hinweis auf fehlende Mint-Verbindung, Token bleibt im Eingabefeld | |
| FR-18 / US-04-AC-2 | Beim ersten Aufladen die Anzeige in den Wallet-Einstellungen lesen | „dauerhaft" oder „best effort"; Chrome entscheidet heuristisch, beide Werte sind gültig | |
| A-06 | Nach einer Nacht Pause: ist das Guthaben noch da? | Guthaben unverändert | |

## Zahlungen

| ID | Was prüfen | Erwartetes Ergebnis | Ergebnis |
|---|---|---|---|
| FR-22 / US-07-AC-2 | Podcast mit npub, aber ohne kind:10019 öffnen | Grund „fehlende Empfangs-Konfiguration des Podcasts" | |
| FR-25 / US-05-AC-1 | 60 s hören, Empfängerseite beobachten | Genau ein Nutzap über den Minutenbetrag; Sitzungszähler stimmt | |
| FR-27 | Auf der Empfängerseite (Wallet mit NIP-60/61) den eingegangenen Nutzap ansehen | Betrag, `u` (Mint-URL exakt wie im kind:10019) und `p` stimmen; Proofs sind einlösbar | |
| FR-29 / US-06-AC-4 | Alle Relays des Empfängers unerreichbar machen, Boost senden | Nach Timeout: Guthaben vollständig zurück, Verlaufseintrag „fehlgeschlagen" | |
| NR-02 | Netzwerk-Panel während Streaming und Boost | Ausgehende Verbindungen nur zu erlaubten Mints und den Relays aus kind:10019 | |
| NR-09 | Vor und nach der Demo die NIP-60-Wallet des Testaccounts prüfen | Keine neuen kind:17375- oder kind:7375-Events, bestehende Wallet unverändert | |

## Speicher und Datenschutz

| ID | Was prüfen | Erwartetes Ergebnis | Ergebnis |
|---|---|---|---|
| NR-04 | DevTools: Application → Local Storage, Konsole, Netzwerk-URLs während einer Zahlung | Nirgends ein Proof oder Token; Local Storage ist leer | |
| NR-10 | DevTools: Application → Cache Storage nach einer Zahlung | Keine Antworten von Mints oder Relays im Cache | |

## PWA

| ID | Was prüfen | Erwartetes Ergebnis | Ergebnis |
|---|---|---|---|
| FR-32 / US-08-AC-1 | App zum ersten Mal in Chrome über HTTPS öffnen | Schaltfläche „Installieren" erscheint | |
| FR-32 / US-08-AC-3 | App installieren, danach im Browser-Tab öffnen | Keine Installieren-Schaltfläche | |
| US-08-AC-2 | Installierte App starten | Eigenes Fenster ohne Adressleiste, Abos und Guthaben unverändert | |

## Nicht-funktionale Anforderungen

| ID | Was prüfen | Erwartetes Ergebnis | Ergebnis |
|---|---|---|---|
| NFR-01 | Ladezeit bis zur Abo-Liste stoppen (Laptop, 16 GB RAM) | unter 2 s | |
| NFR-02 | 20 Nutzaps senden, Zeit bis zur Relay-Bestätigung messen | in 95 % der Fälle unter 5 s | |
| NFR-03 / US-05-AC-5 | Während der Wiedergabe das WLAN trennen und nach 2 min wieder verbinden | Wiedergabe läuft aus dem Puffer, Zahlungen pausieren, keine unbehandelte Ausnahme, danach höchstens der Satz für die tatsächlich gehörte Zeit | |
| NFR-06 / A-07 | Kompletter Ablauf in Chrome **und** Brave mit Standardeinstellungen | Identisches Verhalten; Shields blockieren weder Extension noch Relay-WebSockets | |
| NFR-07 / A-08 | Ablauf Login → Feed → Wiedergabe → Streaming → Boost per Handy-Hotspot stoppen | unter 3 Minuten | |
| NFR-08 | Nach dem Hackathon: Ließen sich die Anforderungen ohne Rückfrage umsetzen? | Rückfragen sammeln und im Dokument nachziehen | |
