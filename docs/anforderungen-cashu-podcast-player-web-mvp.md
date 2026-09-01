# Anforderungs-Dokument: Cashu-Podcast-Player (Hackathon-MVP)

**Projekt:** Web-App im Desktop-Browser mit Cashu-Zahlungen
**Rahmen:** btc++ Hackathon Berlin, 1.–3. Oktober · Team: Jan-Paul, Thorsten · Implementierung überwiegend durch KI-Coding-Agents
**Status:** Initial, vor Tag 1
**Stand der Recherche:** 28.08.2026

> **Scope-Warnung vorab:** Der Umfang ist für drei Tage knapp, aber machbar. Wenn etwas fallen muss, fällt zuerst die PWA-Installierbarkeit (FR-22, FR-23): Die Demo läuft ohnehin im Browserfenster, und Manifest plus Service Worker lassen sich nach dem Hackathon in einer Stunde nachrüsten. Nicht fallen darf die Wallet-Sicherung (FR-16) — im Browser ist sie kein Komfort-Feature, sondern der Schutz vor Totalverlust.

---

## 1. Ziel und Problemstellung

**Problem.** Value-for-Value-Podcasting funktioniert heute praktisch nur über Lightning und dort fast nur über einen einzigen App-Anbieter (Fountain). Wer streamen oder boosten will, braucht eine Lightning-Wallet mit Kanälen oder ein Custodial-Konto; Hörer werden dabei über App-Konten identifiziert, und Kleinstbeträge pro Minute sind auf Lightning teuer und ausfallanfällig.

**Ziel.** Ein Podcast-Player, der im Desktop-Browser läuft: Hörer melden sich mit ihrer nostr-Identität an, abonnieren Podcasts, senden während des Hörens automatisch Cashu-Token an den Podcast und boosten einzelne Folgen mit Betrag und Nachricht. Ecash macht die Kleinstbeträge billig, nostr liefert Identität und Zustellweg, der Browser die Distribution ohne App Store.

**Erfolg am Ende des Hackathons.** Auf der Bühne läuft: Login mit Browser-Extension → Feed abonnieren → Folge starten → Streaming-Zahlungen laufen sichtbar hoch → Boost mit Nachricht absenden → Empfängerseite zeigt die eingegangenen Nutzaps. Die App ist unter einer öffentlichen URL erreichbar und lässt sich als eigenständiges Fenster installieren.

**Nicht das Ziel.** Ein vollständiger Podcast-Client. Alles, was nicht zur Zahlungsgeschichte gehört, bleibt bewusst rudimentär.

---

## 2. Use Cases

| ID | Use Case | Akteur | Kurzbeschreibung |
|---|---|---|---|
| UC-01 | Anmelden mit nostr-Identität | Hörer | Gibt über die Signer-Extension den Public Key frei und ist eingeloggt. Der private Schlüssel verlässt die Extension nie. |
| UC-02 | Podcast abonnieren | Hörer | Fügt einen RSS-Feed per URL hinzu; die App parst Feed und Episoden und legt das Abo lokal an. |
| UC-03 | Folge hören | Hörer | Startet eine Episode, wechselt Tab oder Fenster, springt vor und zurück. |
| UC-04 | Beim Hören streamen | Hörer | Bei laufender Wiedergabe wird ein konfigurierter Satz-pro-Minute-Betrag als Cashu-Token an den Podcast gesendet. |
| UC-05 | Folge boosten | Hörer | Wählt einen Betrag, schreibt optional eine Nachricht, sendet einen einmaligen Cashu-Token mit Zeitstempel der Hörposition. |
| UC-06 | Wallet aufladen und sichern | Hörer | Importiert Ecash, sieht Guthaben und Verlauf, exportiert das Guthaben als Token. |
| UC-07 | Podcast ohne Cashu-Empfänger | Hörer | Öffnet einen Feed ohne hinterlegte nostr-Identität; die App erklärt, warum Zahlungen nicht möglich sind, Wiedergabe funktioniert trotzdem. |
| UC-08 | App installieren | Hörer | Installiert die Web-App über den Browser als eigenständiges Fenster. |

---

## 3. Anforderungen

### 3.1 Funktionale Anforderungen

**Identität und Session**

| ID | Anforderung |
|---|---|
| FR-01 | Die App prüft beim Start, ob `window.nostr` vorhanden ist; fehlt es, zeigt sie einen Hinweis mit zwei benannten Extensions und bleibt ohne Login vollständig bedienbar. |
| FR-02 | Der Login ruft `window.nostr.getPublicKey()` auf und speichert den Pubkey als hex und npub lokal; die Session überlebt einen Reload und einen Browser-Neustart. |
| FR-03 | Alle zu signierenden Events gehen über `window.nostr.signEvent()`; lehnt der Nutzer ab oder antwortet die Extension nicht binnen 30 s, bricht die App die Aktion ab und nennt den Grund. |
| FR-04 | Vor dem ersten Streaming-Start führt die App eine Probe-Signatur aus und erklärt in einem Dialog, dass die Freigabe in der Extension dauerhaft erteilt werden muss, weil sonst pro Minute ein Extension-Fenster erscheint. |
| FR-05 | Ohne Login sind Abonnieren und Wiedergabe uneingeschränkt nutzbar; Streaming und Boost sind deaktiviert und mit dem Hinweis „Login erforderlich" versehen. |
| FR-06 | Logout löscht Pubkey und Session; die lokale Wallet bleibt erhalten, worauf im Bestätigungsdialog hingewiesen wird. |

**Abonnements und Feeds**

| ID | Anforderung |
|---|---|
| FR-07 | Ein Feed wird per URL-Eingabe hinzugefügt; die App lädt ihn, parst RSS 2.0, den iTunes-Namespace und den Podcast-Namespace (mindestens `podcast:guid`, `podcast:value`, `podcast:valueRecipient`, `podcast:txt`) und legt ihn als Abo an. |
| FR-08 | Scheitert der direkte Abruf eines Feeds an fehlenden CORS-Headern, wiederholt die App den Abruf einmalig über einen im Build konfigurierten Feed-Proxy und markiert das Abo sichtbar als „über Proxy geladen". |
| FR-09 | Die Abo-Liste zeigt Cover, Titel und Anzahl Episoden; Abbestellen erfolgt nach Bestätigungsdialog und löscht auch die Episodendaten. |
| FR-10 | Pro Feed werden die 50 neuesten Episoden absteigend nach Datum angezeigt, je Episode **ausschließlich der Titel**. Der Titel ist anklickbar und wählt die Episode zur Wiedergabe aus. Veröffentlichungsdatum, Dauer und Beschreibung werden weiterhin geparst und gespeichert, aber nicht in der Liste dargestellt: Die Beschreibungen der Feeds sind lang und enthalten rohes HTML, was die Liste unbrauchbar macht. Geändert am 01.09.2026. |
| FR-11 | Ein manueller Refresh lädt den Feed neu; nach 10 s Timeout oder bei HTTP-Fehler bleibt der letzte Stand sichtbar und ein Fehlerhinweis erscheint. |

**Wiedergabe**

| ID | Anforderung |
|---|---|
| FR-12 | Die App spielt die Enclosure-URL über ein `<audio>`-Element ab und unterstützt Play, Pause, Sprung +30 s und −15 s sowie Scrubbing über eine Fortschrittsleiste. |
| FR-13 | Die Wiedergabe läuft weiter, wenn der Tab in den Hintergrund wechselt oder das Fenster den Fokus verliert; Titel, Cover und Play/Pause werden über die Media Session API an die Systemsteuerung gemeldet. |
| FR-14 | Die Hörposition wird pro Episode mindestens alle 10 s persistiert und beim erneuten Öffnen wiederhergestellt. |

**Wallet**

| ID | Anforderung |
|---|---|
| FR-15 | Die App führt eine lokale Cashu-Wallet über eine im Build konfigurierte Liste erlaubter Mints und zeigt das Guthaben in Sat an. |
| FR-16 | Die Wallet lässt sich jederzeit als Cashu-Token exportieren (Anzeige als Text und QR-Code); vor der ersten Aufladung zeigt die App einen Hinweis, dass Löschen der Website-Daten das Guthaben vernichtet. |
| FR-17 | Die Wallet lässt sich durch Einfügen eines Cashu-Tokens aufladen; ungültige, bei einem nicht erlaubten Mint ausgestellte oder bereits eingelöste Token werden mit konkretem Fehlertext abgelehnt. |
| FR-18 | Beim ersten Aufladen fordert die App über `navigator.storage.persist()` dauerhaften Speicher an und zeigt das Ergebnis in den Wallet-Einstellungen als „dauerhaft" oder „best effort" an. |
| FR-19 | Ein Verlauf zeigt je Zahlung Richtung, Betrag in Sat, Zeitstempel, Podcast/Episode und Status (`gesendet`, `ausstehend`, `fehlgeschlagen`). |
| FR-20 | Unterschreitet das Guthaben 10 Sat, stoppt die App laufende Streaming-Zahlungen, zeigt einen Hinweis und setzt sie nach erfolgreicher Aufladung fort. |

**Empfängerauflösung und Zahlungen**

| ID | Anforderung |
|---|---|
| FR-21 | Die App liest die nostr-Identität des Podcasts aus dem Feed (Primärquelle: `<podcast:txt purpose="nostr">` auf Channel-Ebene mit npub) und speichert sie am Abo. |
| FR-22 | Zur aufgelösten Identität lädt die App das `kind:10019`-Event (Mints, Relays, P2PK-Pubkey), cached es für 24 h und prüft, ob mindestens ein dort gelisteter Mint in der eigenen erlaubten Mint-Liste enthalten ist. |
| FR-23 | Fehlt npub, `kind:10019` oder eine Mint-Schnittmenge, sind Streaming und Boost für dieses Abo deaktiviert; die Episodenansicht nennt den konkreten fehlenden Baustein. |
| FR-24 | Während laufender Wiedergabe akkumuliert die App den konfigurierten Betrag anteilig zur tatsächlich gehörten Zeit; Pause und Seek akkumulieren nicht. |
| FR-25 | Alle 60 s gehörter Zeit sendet die App den akkumulierten Betrag als Nutzap; ergibt sich weniger als 1 Sat, bleibt der Rest stehen und wird im nächsten Intervall mitgesendet. |
| FR-26 | Der Streaming-Satz ist global einstellbar (Vorgabe 10 Sat/Minute, Bereich 0–1000, 0 schaltet Streaming ab) und wird vor dem ersten Streaming-Start einmal explizit bestätigt. |
| FR-27 | Ein Nutzap wird als `kind:9321`-Event gebaut: Proofs P2PK-gelockt auf den Pubkey aus `kind:10019` mit vorangestelltem `02`, Tags `proof`, `unit`, `u` (Mint-URL exakt wie im `kind:10019`) und `p` (Empfänger); signiert über die Extension und an die Relays aus `kind:10019` publiziert. |
| FR-28 | Boost: Der Nutzer wählt einen Betrag aus vier Vorgaben (100, 1 000, 5 000, 21 000 Sat) oder gibt einen freien Betrag ein, optional mit Nachricht bis 280 Zeichen; die Nachricht wird zum `content` des `kind:9321`, die aktuelle Hörposition wird im Format `hh:mm:ss` angehängt. |
| FR-29 | Proofs gelten erst als ausgegeben, wenn mindestens ein Relay das Event mit `OK` bestätigt hat; bis dahin bleiben sie in der Wallet reserviert. Der unwiderrufliche Punkt ist der Mint-Swap, der die Proofs auf den Empfänger lockt — davor und danach verhält sich ein Fehlschlag unterschiedlich: **(a) Abbruch vor dem Swap** (kein Relay erreichbar, Guthaben reicht nicht, Mint nicht erreichbar): die Reservierung wird freigegeben, das Guthaben steht vollständig wieder zur Verfügung, die Zahlung wird als `fehlgeschlagen` protokolliert. **(b) Fehlschlag nach dem Swap** (Relays erreichbar, aber keines bestätigt mit `OK`, oder die Signatur scheitert): die Proofs sind bereits auf den Empfänger gelockt und gehören ihm — eine Freigabe wäre eine Falschanzeige. Das signierte Event bleibt mit Status `ausstehend` in einer Warteschlange und wird erneut publiziert; das Guthaben ist in diesem Fall **nicht** wiederhergestellt. Entschieden am 28.08.2026. |
| FR-30 | Erfolg und Misserfolg jeder Zahlung sind in der Player-Ansicht sichtbar: laufender Streaming-Zähler für die Sitzung, Bestätigung nach Boost, Fehlerhinweis mit Grund. |

**Installierbarkeit**

| ID | Anforderung |
|---|---|
| FR-31 | Die App liefert ein Web App Manifest mit `name`, `short_name`, `start_url`, `display: standalone`, Theme-Farbe und Icons in 192 und 512 Pixeln sowie einen registrierten Service Worker mit Fetch-Handler, der die App-Shell cached. |
| FR-32 | Die App fängt `beforeinstallprompt` ab und bietet die Installation über eine eigene Schaltfläche an; ist die App bereits installiert oder das Ereignis nicht verfügbar, erscheint die Schaltfläche nicht. |

**Nicht im Scope (bewusst ausgeschlossen)**

Native Android- oder iOS-App; Splits über mehrere Empfänger und `podcast:valueTimeSplit`; Empfangen und Einlösen eingehender Nutzaps in dieser App; NIP-60-Wallet-Synchronisierung über Relays; Download und Offline-Wiedergabe von Audio (offline funktioniert nur die App-Shell); Podcast-Suche und -Discovery; Kapitel, Transkripte, Playlists; Lightning-Fallback, falls kein Cashu-Empfänger existiert; mehrere Accounts; Mobile-Layout; Mehrsprachigkeit über Deutsch hinaus.

### 3.2 Nicht-funktionale Anforderungen

| ID | Anforderung |
|---|---|
| NFR-01 | Die App lädt in Chrome und Brave (jeweils aktuelle Stable-Version) auf einem Laptop mit 16 GB RAM in unter 2 s bis zur Abo-Liste. |
| NFR-02 | Ein Nutzap ist in 95 % der Fälle binnen 5 s nach Auslösung beim Relay bestätigt, gemessen gegen den Demo-Mint und die Demo-Relays im Konferenz-WLAN. |
| NFR-03 | Fällt das Netz aus, läuft die Wiedergabe aus dem Puffer weiter, Zahlungen werden angehalten und nach Rückkehr des Netzes fortgesetzt; die App zeigt einen Offline-Zustand und wirft keine unbehandelte Ausnahme. |
| NFR-04 | Proofs, Abos und Verlauf liegen in IndexedDB unter der App-Origin; die App wird ausschließlich über HTTPS ausgeliefert, damit Service Worker und `navigator.storage.persist()` verfügbar sind. |
| NFR-05 | Sämtliche Verbindungen zu Mints und Relays laufen über `https` und `wss`; die App enthält keine `http`- oder `ws`-Endpunkte, weil der Browser sie von einer HTTPS-Seite aus ohnehin blockiert. |
| NFR-06 | Die App funktioniert in Chrome und Brave identisch; Brave-spezifische Blockaden (Shields) werden vor der Demo mit Standardeinstellungen geprüft. |
| NFR-07 | Der komplette Demo-Ablauf von Login bis Boost ist in unter 3 Minuten vorführbar, auch bei Verbindung über einen Handy-Hotspot. |
| NFR-08 | Die Anforderungen sind so formuliert, dass ein Coding-Agent sie ohne Rückfrage umsetzen kann: Zustände, Grenzwerte, Einheiten und Fehlerverhalten sind benannt. |

### 3.3 Negative Anforderungen

| ID | Anforderung |
|---|---|
| NR-01 | Die App fragt zu keinem Zeitpunkt nach einem nsec, bietet kein Eingabefeld dafür an und speichert keinen privaten nostr-Schlüssel. |
| NR-02 | Die App sendet Proofs an keine anderen Endpunkte als die konfigurierten Mints und die aus `kind:10019` gelesenen Relays. |
| NR-03 | Der Feed-Proxy wird ausschließlich für RSS-Abrufe verwendet; Mint- und Relay-Verkehr läuft nie über ihn. |
| NR-04 | Proofs und Token stehen nie in einer URL, einem Query-Parameter, im `localStorage` oder in einer Konsolenausgabe. |
| NR-05 | Die App enthält keine Analytics-, Tracking- oder Error-Reporting-Bibliothek und sendet keine Nutzungsdaten an Dritte. |
| NR-06 | Die App startet keine Zahlung ohne vorherige explizite Bestätigung des Streaming-Satzes und überschreitet den konfigurierten Satz nie, auch nicht durch Nachholen nach Netzausfall. |
| NR-07 | Die App mintet und swappt nicht bei Mints außerhalb der Schnittmenge aus eigener erlaubter Liste und `kind:10019` des Empfängers. |
| NR-08 | Die App legt kein serverseitiges Konto an, hält kein Guthaben bei einem eigenen Backend und überträgt keine Schlüssel oder Proofs an einen vom Team betriebenen Dienst. |
| NR-09 | Die App schreibt keine `kind:17375`- oder `kind:7375`-Events und verändert keine bestehende NIP-60-Wallet des Nutzers. |
| NR-10 | Der Service Worker cached keine Antworten von Mints oder Relays. |

---

## 4. User Stories mit Abnahmekriterien

### US-01 — Mit nostr-Identität anmelden
*Als Hörer will ich mich mit meinem npub anmelden, ohne meinen privaten Schlüssel herauszugeben, damit ich Zahlungen unter meiner Identität senden kann.*

```gherkin
US-01-AC-1
Angenommen im Browser ist eine NIP-07-Extension installiert und entsperrt
Wenn ich "Mit nostr anmelden" wähle
Dann fragt die Extension nach Freigabe
Und nach Freigabe zeigt die App meinen npub in gekürzter Form an

US-01-AC-2
Angenommen ich habe mich angemeldet
Wenn ich die Seite neu lade
Dann bin ich weiterhin angemeldet
Und es erscheint keine erneute Freigabeabfrage

US-01-AC-3
Angenommen im Browser ist keine NIP-07-Extension installiert
Wenn ich "Mit nostr anmelden" wähle
Dann nennt die App zwei mögliche Extensions
Und die App bleibt ohne Login vollständig bedienbar

US-01-AC-4
Angenommen die Extension zeigt die Freigabeabfrage
Wenn ich sie ablehne
Dann bleibe ich abgemeldet
Und die App zeigt "Anmeldung abgebrochen" ohne Fehlerzustand
```

### US-02 — Podcast abonnieren
*Als Hörer will ich einen Feed per URL abonnieren, damit ich seine Episoden in der App sehe.*

```gherkin
US-02-AC-1
Angenommen ich bin in der Abo-Ansicht
Wenn ich eine gültige Feed-URL einfüge und bestätige
Dann erscheint der Podcast mit Cover und Titel in meiner Abo-Liste
Und die 50 neuesten Episoden sind absteigend nach Datum sichtbar

US-02-AC-2
Angenommen der Feed-Host sendet keine CORS-Header
Wenn ich den Feed hinzufüge
Dann lädt die App ihn über den konfigurierten Proxy
Und das Abo ist als "über Proxy geladen" gekennzeichnet

US-02-AC-3
Angenommen ich habe eine URL eingegeben, die kein gültiger RSS-Feed ist
Wenn ich bestätige
Dann erscheint "Kein gültiger Podcast-Feed"
Und es wird kein Abo angelegt

US-02-AC-4
Angenommen ich habe den Podcast bereits abonniert
Wenn ich dieselbe URL erneut hinzufüge
Dann wird kein zweites Abo angelegt
Und die App springt zum bestehenden Abo
```

### US-03 — Folge hören
*Als Hörer will ich eine Folge hören und dabei in anderen Fenstern arbeiten, damit die Wiedergabe nicht abbricht.*

```gherkin
US-03-AC-1
Angenommen ich habe eine Episode gestartet
Wenn ich in einen anderen Tab oder ein anderes Programm wechsle
Dann läuft die Wiedergabe weiter
Und Titel und Cover erscheinen in der Medienanzeige des Betriebssystems

US-03-AC-2
Angenommen die Wiedergabe läuft bei Minute 12:30
Wenn ich den Tab schließe und die Episode später erneut öffne
Dann setzt die Wiedergabe bei etwa 12:30 an

US-03-AC-3
Angenommen die Wiedergabe läuft und der Tab ist im Hintergrund
Wenn ich die Wiedergabe über die Medientaste der Tastatur pausiere
Dann pausiert die App
Und der Streaming-Zähler bleibt stehen
```

### US-04 — Wallet aufladen und sichern
*Als Hörer will ich Ecash in die App laden und jederzeit herausholen können, damit mein Guthaben nicht im Browser gefangen ist.*

```gherkin
US-04-AC-1
Angenommen meine Wallet hat 0 Sat
Wenn ich einen gültigen Cashu-Token eines erlaubten Mints einfüge
Dann erhöht sich das angezeigte Guthaben um den Token-Betrag
Und im Verlauf erscheint ein Eingang mit Zeitstempel

US-04-AC-2
Angenommen ich lade zum ersten Mal auf
Wenn der Import beginnt
Dann fordert die App dauerhaften Speicher an
Und ich sehe einen Hinweis, dass Löschen der Website-Daten das Guthaben vernichtet

US-04-AC-3
Angenommen meine Wallet hat 500 Sat
Wenn ich "Guthaben exportieren" wähle
Dann zeigt die App einen Cashu-Token über 500 Sat als Text und QR-Code
Und der Token lässt sich in einer anderen Cashu-Wallet einlösen

US-04-AC-4
Angenommen ich füge einen Token eines nicht erlaubten Mints ein
Wenn ich bestätige
Dann wird der Import abgelehnt
Und die App nennt den Mint, der nicht in der erlaubten Liste steht

US-04-AC-5
Angenommen der Mint ist nicht erreichbar
Wenn ich einen Token importiere
Dann erscheint ein Hinweis auf die fehlende Mint-Verbindung
Und der Token bleibt für einen erneuten Versuch im Eingabefeld
```

### US-05 — Beim Hören streamen
*Als Hörer will ich beim Hören automatisch kleine Beträge senden, damit der Podcast laufend etwas bekommt, ohne dass ich etwas tue.*

```gherkin
US-05-AC-1
Angenommen ich bin angemeldet, habe Guthaben und der Podcast hat einen auflösbaren Cashu-Empfänger
Wenn ich eine Episode starte und 60 Sekunden höre
Dann wurde ein Nutzap über den konfigurierten Minutenbetrag gesendet
Und der Sitzungszähler im Player zeigt den gesendeten Betrag

US-05-AC-2
Angenommen der Streaming-Satz steht auf 10 Sat pro Minute
Wenn ich 30 Sekunden höre und dann pausiere
Dann wurde kein Nutzap gesendet
Und 5 Sat bleiben als offener Rest stehen

US-05-AC-3
Angenommen ich habe die Signatur in der Extension dauerhaft freigegeben
Wenn drei Streaming-Intervalle vergehen
Dann erscheint kein Extension-Fenster
Und drei Nutzaps wurden gesendet

US-05-AC-4
Angenommen mein Guthaben liegt bei 8 Sat
Wenn das nächste Streaming-Intervall fällig wird
Dann stoppt die App die Streaming-Zahlungen
Und zeigt "Guthaben zu niedrig" mit Verweis auf die Wallet

US-05-AC-5
Angenommen die Wiedergabe läuft und das Netz bricht weg
Wenn ein Streaming-Intervall fällig wird
Dann wird kein Betrag von der Wallet abgebucht
Und nach Rückkehr des Netzes wird höchstens der Satz für die tatsächlich gehörte Zeit gesendet

US-05-AC-6
Angenommen ich habe den Streaming-Satz noch nie bestätigt
Wenn ich zum ersten Mal eine Episode mit auflösbarem Empfänger starte
Dann fragt die App den Satz einmalig ab
Und ohne Bestätigung wird nichts gesendet
```

### US-06 — Folge boosten
*Als Hörer will ich eine Folge mit einem selbst gewählten Betrag und einer Nachricht boosten, damit ich eine Stelle gezielt honorieren kann.*

```gherkin
US-06-AC-1
Angenommen ich höre eine Episode bei 00:14:07 und habe ausreichend Guthaben
Wenn ich "Boost" wähle, 1 000 Sat auswähle, "Starke Folge" schreibe und sende
Dann wird ein Nutzap über 1 000 Sat mit dieser Nachricht und der Zeitmarke 00:14:07 gesendet
Und die App bestätigt den erfolgreichen Boost

US-06-AC-2
Angenommen ich gebe einen Betrag ein, der mein Guthaben übersteigt
Wenn ich senden will
Dann ist der Sendeknopf deaktiviert
Und die App zeigt das verfügbare Guthaben an

US-06-AC-3
Angenommen ich habe den Boost-Dialog geöffnet
Wenn ich ihn abbreche
Dann wird nichts gesendet
Und mein Guthaben ist unverändert

US-06-AC-4
Angenommen ich sende einen Boost und kein Relay bestätigt das Event
Wenn der Sendeversuch nach Timeout endet
Dann steht mein ursprüngliches Guthaben wieder vollständig zur Verfügung
Und im Verlauf steht der Eintrag als "fehlgeschlagen"

US-06-AC-5
Angenommen ich schreibe eine Nachricht mit mehr als 280 Zeichen
Wenn ich tippe
Dann verhindert das Eingabefeld weitere Zeichen
Und ein Zähler zeigt die verbleibende Länge
```

### US-07 — Podcast ohne Cashu-Empfänger
*Als Hörer will ich verstehen, warum ich einen bestimmten Podcast nicht bezahlen kann, damit ich es nicht für einen Fehler der App halte.*

```gherkin
US-07-AC-1
Angenommen der Feed enthält keine nostr-Identität
Wenn ich eine Episode öffne
Dann sind Streaming und Boost sichtbar deaktiviert
Und die App nennt als Grund die fehlende nostr-Identität im Feed

US-07-AC-2
Angenommen der Feed enthält einen npub, zu dem kein kind:10019 auffindbar ist
Wenn ich eine Episode öffne
Dann nennt die App als Grund die fehlende Empfangs-Konfiguration des Podcasts

US-07-AC-3
Angenommen das kind:10019 des Podcasts listet nur Mints, die nicht in meiner erlaubten Liste stehen
Wenn ich eine Episode öffne
Dann sind Zahlungen deaktiviert
Und die App nennt den fehlenden gemeinsamen Mint
Aber die Wiedergabe funktioniert uneingeschränkt
```

### US-08 — App installieren
*Als Hörer will ich die App als eigenes Fenster installieren, damit sie sich wie ein Programm und nicht wie ein Tab anfühlt.*

```gherkin
US-08-AC-1
Angenommen ich öffne die App zum ersten Mal in Chrome
Wenn Manifest und Service Worker geladen sind
Dann erscheint in der App eine Schaltfläche "Installieren"

US-08-AC-2
Angenommen ich wähle "Installieren"
Wenn ich den Browser-Dialog bestätige
Dann startet die App in einem eigenen Fenster ohne Adressleiste
Und meine Abos und mein Guthaben sind unverändert vorhanden

US-08-AC-3
Angenommen die App ist bereits installiert
Wenn ich sie im Browser öffne
Dann erscheint keine Installieren-Schaltfläche
```

---

## 5. Integration und technische Hinweise

### 5.1 Cashu

Die Zahlung ist ein **Nutzap** nach [NIP-61](https://nips.nostr.com/61): ein P2PK-gelockter Cashu-Token, der als nostr-Event zugestellt wird — die Zahlung ist gleichzeitig die Quittung. Der Sender liest das `kind:10019` des Empfängers, mintet oder swappt bei einem dort gelisteten Mint, lockt die Proofs auf den dort angegebenen Pubkey (mit `02`-Präfix) und publiziert ein `kind:9321` mit den Tags `proof`, `unit`, `u` und `p` an die Relays des Empfängers. Proofs bei einem nicht gelisteten Mint riskieren, dass der Empfänger sie nie sieht.

Relevante NUTs: [NUT-00](https://cashubtc.github.io/nuts/) (Modelle und Token-Format), NUT-01/02 (Keysets und Fees), NUT-03 (Swap), NUT-04/05 (Mint/Melt), [NUT-07](https://cashubtc.github.io/nuts/07/) (Token-Status prüfen — nötig für „bereits eingelöst"), NUT-10 (Spending Conditions), [NUT-11](https://cashubtc.github.io/nuts/11/) (P2PK) und NUT-12 (DLEQ). NIP-61 empfiehlt ausdrücklich Mints mit NUT-11- und NUT-12-Unterstützung; ohne P2PK wäre der Token für jeden ausgebbar.

**Bibliothek:** [`@cashu/cashu-ts`](https://github.com/cashubtc/cashu-ts) deckt den Protokollteil ab. Die Wallet-Klassen sind weitgehend zustandslos — die App muss Proofs selbst speichern und verwalten, das ist ausdrücklich so gedacht und passt zu FR-29. `loadMint()` muss nach dem Instanziieren aufgerufen werden. Für den Fall, dass ein Mint direkt nicht erreichbar ist, lässt sich über die `requestFetch`-Option ein eigener Transport einhängen, ohne die restliche Logik anzufassen.

**CORS gegenüber Mints:** Dass eine Browser-Wallet gegen öffentliche Mints funktioniert, ist praktisch belegt — [Cashu.me](https://github.com/cashubtc/cashu.me) ist selbst eine Web-App auf Basis derselben Bibliothek. Ob ein *bestimmter* Mint die nötigen `Access-Control-Allow-Origin`-Header setzt, ist aber Sache des Betreibers und **muss für jeden Mint der erlaubten Liste einzeln geprüft werden**, bevor gebaut wird. Das ist eine Zehn-Minuten-Prüfung an Tag 1 und ein verlorener halber Tag, wenn man sie sich schenkt.

**Praktisch für Streaming:** Jedes Intervall bedeutet mindestens einen Swap beim Mint plus ein Relay-Publish. Bei 60-Sekunden-Intervallen sind das in einer 40-Minuten-Folge rund 40 Roundtrips — machbar, aber Keyset-Fees (NUT-02) fressen bei sehr kleinen Beträgen anteilig viel. Für die Demo einen fee-freien Testmint verwenden und den Minutenbetrag nicht unter 10 Sat setzen.

### 5.2 nostr

**Login und Signatur:** [NIP-07](https://nips.nostr.com/7) definiert ein `window.nostr`-Objekt, das Extensions in die Seite injizieren. Gebraucht werden `getPublicKey()` und `signEvent()`; verbreitete Chromium-Extensions sind [nos2x](https://github.com/fiatjaf/nos2x) und Alby.

**Wichtig für Streaming:** Bei Zahlungen im Minutentakt muss jedes `kind:9321` signiert werden. nos2x kennt beim Freigabedialog die Optionen, dauerhaft, für einige Minuten oder nur einmalig zu autorisieren — genau das braucht das Streaming. Ob die jeweils installierte Extension in ihrer aktuellen Version eine dauerhafte Freigabe für wiederholtes `signEvent` tatsächlich ohne weitere Interaktion durchreicht, ist **unbestätigt** und gehört an Tag 1 mit den beiden Zielextensions geprüft, nicht angenommen. Die Rückfallebene steht in A-01.

**Relays:** Der Zugriff läuft über WebSockets; CORS gilt für sie nicht, aber von einer HTTPS-Seite sind ausschließlich `wss`-Verbindungen erlaubt, sonst blockiert der Browser sie als Mixed Content. Nutzaps müssen an die Relays aus dem `kind:10019` des Empfängers gehen, nicht an eine eigene Liste.

**Empfängerauflösung:** `kind:10019` liefert Mints, Relays und den P2PK-Pubkey. Es gilt eine Cache-Dauer von 24 h; das Event ist replaceable, ein veralteter Cache kann zu Zahlungen an einen alten Mint führen.

### 5.3 Podcasting 2.0

Der [`podcast:value`-Tag](https://podcasting2.org/docs/podcast-namespace/tags/value) trägt `type`, `method` und `suggested`; die Empfänger stehen in `podcast:valueRecipient` mit `address` und `split`, zeitabhängige Splits in [`podcast:valueTimeSplit`](https://podcasting2.org/docs/podcast-namespace/tags/value-time-split). In der Praxis ist ausschließlich `type="lightning" method="keysend"` verbreitet.

**Es gibt keinen standardisierten Weg, einen Cashu- oder nostr-Empfänger in einem Feed anzugeben.** Das ist die zentrale konzeptionelle Lücke des Projekts. Für den MVP wird `<podcast:txt purpose="nostr">npub…</podcast:txt>` auf Channel-Ebene gelesen; `podcast:txt` existiert mit `purpose`-Attribut, aber diese konkrete Belegung ist **unbestätigt** und keine etablierte Konvention. Siehe A-04 und OQ-01.

**CORS gegenüber Feeds:** Anders als eine native App darf eine Web-App einen fremden RSS-Feed nur lesen, wenn dessen Host CORS-Header setzt. Viele Podcast-Hoster tun das nicht. Deshalb FR-08: ein Proxy als zweiter Versuch. Die Audio-Wiedergabe ist davon nicht betroffen — ein `<audio>`-Element lädt Cross-Origin-Medien ohne CORS, solange man nicht per Skript auf die Rohdaten zugreift.

Der Boost-Kontext auf Lightning steckt heute im TLV-Record 7629169 ([blip-0010](https://github.com/lightning/blips/blob/master/blip-0010.md)) mit Feldern wie `podcast`, `episode`, `action`, `ts` und `message`. Auf dem Nutzap-Weg gibt es dieses Feld nicht; der MVP legt die Nachricht in `content` und hängt die Zeitmarke an. Eine strukturierte Entsprechung wäre die saubere Lösung — siehe OQ-02.

### 5.4 Browser-Speicher

Proofs sind echtes Geld in einem Speicher, den der Nutzer mit zwei Klicks löschen kann. Standardmäßig ist Origin-Speicher „best effort" und wird bei Speicherdruck von der zuletzt genutzten Origin an geräumt; `navigator.storage.persist()` hebt ihn auf „persistent", danach räumt der Browser ihn nur noch, wenn der Nutzer es selbst veranlasst. Chrome entscheidet die Vergabe heuristisch anhand der bisherigen Nutzung, nicht per Nutzerdialog; die Anfrage kann also stillschweigend abgelehnt werden — deshalb zeigt FR-18 das Ergebnis an, statt es zu ignorieren. Erfahrungswerte des Chrome-Teams sagen, dass automatisches Löschen selten ist und manuelles Löschen durch Nutzer der häufigere Fall bleibt.

Praktische Konsequenz für den MVP: Der Export (FR-16) ist nicht optional, und ein privates Fenster ist kein unterstützter Modus.

### 5.5 PWA und Auslieferung

Für den Installationsprompt in Chromium-Browsern braucht es HTTPS, ein Manifest mit `name`, Icons, `start_url` und `display` sowie einen registrierten Service Worker mit einem nicht-leeren Fetch-Handler; sind die Kriterien erfüllt, feuert `beforeinstallprompt`, das die App abfangen und mit einer eigenen Schaltfläche verbinden kann. Chrome hat die Kriterien zuletzt gelockert und arbeitet daran, die Service-Worker-Bedingung durch andere Signale zu ersetzen — für den Hackathon-Zeitraum gilt sie als vorhanden. Brave und Edge folgen denselben Chromium-Regeln.

Ausgeliefert wird als statisches Bundle über HTTPS. Das genügt für alles Weitere: Es gibt kein Backend, keine Registrierung, keinen Review-Prozess.

### 5.6 Architektur

TypeScript, Vite als Build, ein schlankes UI-Framework nach Wahl des Teams, IndexedDB über eine dünne Wrapper-Bibliothek für Abos, Episoden, Proofs und Verlauf, `@cashu/cashu-ts` für die Wallet, eine nostr-Client-Bibliothek oder ein minimaler eigener Relay-Client (`EVENT` / `REQ` / `OK`) für `kind:10019` und `kind:9321`, Workbox oder ein handgeschriebener Service Worker für die App-Shell.

Vier Module mit klaren Grenzen: `feed` (Abruf, Proxy-Fallback, Parsing, Abos), `player` (Wiedergabe, Position, Hörzeit-Events), `wallet` (Guthaben, Proofs, Mint-Kommunikation, Export), `payments` (Empfängerauflösung, Nutzap-Bau, Signatur, Relay-Publish).

**Ein Timer-Detail, das sonst still kaputtgeht:** Chrome drosselt JavaScript-Timer in Hintergrund-Tabs auf eine Ausführung pro Sekunde und nach längerer Inaktivität noch stärker. Tabs, die hörbar Audio abspielen, sind davon ausgenommen, ebenso Tabs mit offenen WebSocket-Verbindungen. Der Streaming-Takt ist also sicher, solange tatsächlich Ton läuft — er darf aber nicht auf präzise Sub-Sekunden-Timer bauen. Die gehörte Zeit wird deshalb aus `currentTime` des Audio-Elements abgeleitet und nicht aus Timer-Ticks gezählt.

### 5.7 Arbeitspakete und Parallelisierbarkeit

| Paket | Anforderungen | Abhängigkeiten |
|---|---|---|
| A: Feed und Abos | FR-07 bis FR-11, FR-21 | Proxy-Entscheidung |
| B: Player | FR-12 bis FR-14 | keine |
| C: Wallet | FR-15 bis FR-20 | Mint erreichbar und CORS-tauglich |
| D: Identität | FR-01 bis FR-06 | Extension im Testbrowser |
| E: Zahlungen | FR-22 bis FR-30 | A, C, D |
| F: PWA und Hosting | FR-31, FR-32, NFR-04 | lauffähiger Build |

A, B, C und D sind unabhängig und können parallel an Agents gegeben werden. E ist der Integrationspunkt. F ist unabhängig von allem anderen und deshalb der beste Kandidat für den Fall, dass die Zeit knapp wird.

**Vor Tag 1 festzulegen**, sonst laufen die Pakete auseinander:

- `PaymentTarget` — was die Empfängerauflösung liefert: npub, P2PK-Pubkey, Mint-Liste, Relay-Liste, Auflösungsstatus mit Fehlergrund.
- `WalletService` — `balance()`, `reserve(amount): ProofBundle`, `commit(bundle)`, `release(bundle)`, `exportAll(): string`. Die Reserve-Semantik ist der Kern von FR-29 und muss stehen, bevor jemand Zahlungen baut.
- `ListeningTick` — das Ereignis, das der Player pro tatsächlich gehörter Sekunde ausgibt, inklusive Episode und Position, abgeleitet aus `currentTime`. Ohne diesen Vertrag baut Paket B eine Player-Logik, an die Paket E nicht andocken kann.
- Die Liste erlaubter Mints, die Demo-Relays und die Proxy-URL als Build-Konstanten.

---

## 6. Annahmen

| ID | Annahme | Konsequenz, wenn falsch |
|---|---|---|
| A-01 | Die NIP-07-Extension signiert nach einmaliger dauerhafter Freigabe wiederholt ohne weitere Interaktion. | Bei jedem Intervall poppt ein Extension-Fenster auf, Streaming ist unbenutzbar. Rückfallebene: Zahlungen werden lokal akkumuliert und beim Pausieren oder Beenden der Episode als ein einziger Nutzap mit einer Signatur gesendet. An Tag 1 entscheiden, nicht an Tag 3. |
| A-02 | Die Mints der erlaubten Liste erlauben Cross-Origin-Requests aus dem Browser. | Die Wallet funktioniert lokal, aber nicht unter der Demo-Domain. Gegenmittel: Mint mit belegter Browser-Tauglichkeit wählen oder `requestFetch` auf einen eigenen Proxy legen — Letzteres ist ein Eingriff in NR-03 und muss dann bewusst entschieden werden. |
| A-03 | Für die Demo-Feeds ist entweder CORS gesetzt oder der Proxy verfügbar. | Ohne beides lässt sich kein Feed laden und die Demo hat keinen Inhalt. Deshalb steht die Proxy-Entscheidung als Abhängigkeit von Paket A. |
| A-04 | Der Empfänger-npub kann über `podcast:txt purpose="nostr"` aus dem Feed gelesen werden. | Ohne Konvention muss der MVP die Zuordnung Feed → npub hart hinterlegen. Für die Demo mit dem eigenen Podcast ausreichend, für die Erzählung „funktioniert mit jedem Podcast" nicht. |
| A-05 | Es existiert ein öffentlicher Testmint mit NUT-11 und NUT-12 ohne Fees, der drei Tage stabil läuft. | Fees fressen Minutenbeträge oder der Mint fällt während der Demo aus. Gegenmittel: zweiter Mint als Reserve, beide vorab geprüft und in der erlaubten Liste. |
| A-06 | Der Browser gewährt der Origin dauerhaften Speicher oder räumt sie zumindest während des Hackathons nicht. | Guthaben verschwindet zwischen Proben. Gegenmittel ist der Export aus FR-16; deshalb ist er Muss und nicht Kann. |
| A-07 | Brave blockiert mit Standardeinstellungen weder die Extension-Injektion noch die Relay-WebSockets. | Die Demo läuft nur in Chrome. Vor der Bühne in beiden Browsern durchspielen. |
| A-08 | Konferenz-WLAN erlaubt WebSocket-Verbindungen zu beliebigen Relays. | Demo per Hotspot; deshalb NFR-07. |
| A-09 | Die Nachricht eines Boosts darf öffentlich sichtbar sein. | Nutzap-Proofs und `content` sind unverschlüsselt und für jeden lesbar. Wenn private Boosts erwartet werden, ist das ein anderes Feature. |

---

## 7. Offene Fragen

| ID | Frage | Vorschlag als Default |
|---|---|---|
| OQ-01 | Wie findet die App den Empfänger, wenn der Feed keine nostr-Identität trägt? | Für den MVP: gar nicht, Zahlungen bleiben deaktiviert (FR-23). Nach dem Hackathon einen Namespace-Vorschlag bei PodcastIndex einreichen — das wäre ohnehin das interessantere Ergebnis als die App selbst. |
| OQ-02 | Wie werden Podcast-, Episoden- und Zeitkontext maschinenlesbar mitgesendet, wenn es kein TLV gibt? | MVP: Freitext im `content`. Sauberer wäre ein zusätzliches Tag im `kind:9321` mit `podcast:guid` und Episoden-GUID, analog zu blip-0010. Entscheiden, sobald die Empfängerseite steht. |
| OQ-03 | Eigener Feed-Proxy oder ein öffentlicher Dienst? | Eigener, minimaler Proxy auf derselben Domain: ein öffentlicher Dienst sieht mit, welche Feeds gelesen werden, und kann während der Demo ausfallen. Wenn die Zeit fehlt, für die Demo Feeds wählen, die CORS bereits setzen. |
| OQ-04 | Welches Streaming-Intervall? | 60 Sekunden für die Demo, weil sichtbar. Falls Mint-Fees oder Latenz stören, auf 300 Sekunden hochsetzen; die Anforderung ist so geschrieben, dass nur eine Konstante geändert wird. |
| OQ-05 | Wird an den Podcast als Ganzes gezahlt oder an einzelne Crew-Mitglieder? | MVP: ein Empfänger pro Podcast. Splits brauchen npubs pro Person im Feed und sind ohne OQ-01 nicht lösbar. |
| OQ-06 | Soll die App vor dem Aufladen zum Export zwingen oder nur warnen? | Nur warnen, aber prominent. Ein Zwang bremst die Bühnendemo; die Warnung ist die ehrliche Aussage über Browser-Speicher. |
| OQ-07 | Empfangsseite für die Demo: eigene Oberfläche oder bestehende Wallet? | Bestehende Wallet mit NIP-60/61-Unterstützung. Nichts selbst bauen, was eine Nutzap-fähige Wallet schon zeigt. |
| OQ-08 | Unter welcher Domain läuft die Demo? | Eine Subdomain der Podcast-Domain, per HTTPS und statisch ausgeliefert. Origin früh festlegen — der Browser-Speicher hängt daran, und ein Domainwechsel nach dem ersten Aufladen bedeutet neues Guthaben. |

---

## 8. Traceability-Matrix

| Anforderung | Kurztitel | User Story | Abnahmekriterien | Priorität | Engpass |
|---|---|---|---|---|---|
| FR-01 | Extension erkennen | US-01 | US-01-AC-3 | Muss | KI-tauglich |
| FR-02 | Pubkey holen und speichern | US-01 | US-01-AC-1, US-01-AC-2 | Muss | KI-tauglich |
| FR-03 | Events signieren lassen | US-01 | US-01-AC-4 | Muss | Menschliche Verifikation |
| FR-04 | Dauerfreigabe erklären und prüfen | US-05 | US-05-AC-3 | Muss | Menschliche Verifikation |
| FR-05 | Nutzung ohne Login | US-01 | US-01-AC-3 | Soll | KI-tauglich |
| FR-06 | Logout | US-01 | US-01-AC-2 | Kann | KI-tauglich |
| FR-07 | Feed per URL hinzufügen | US-02 | US-02-AC-1, US-02-AC-3 | Muss | KI-tauglich |
| FR-08 | Proxy-Fallback bei CORS | US-02 | US-02-AC-2 | Muss | Menschliche Verifikation |
| FR-09 | Abo-Liste und Abbestellen | US-02 | US-02-AC-1, US-02-AC-4 | Muss | KI-tauglich |
| FR-10 | Episodenliste | US-02 | US-02-AC-1 | Muss | KI-tauglich |
| FR-11 | Feed-Refresh mit Timeout | US-02 | US-02-AC-3 | Soll | KI-tauglich |
| FR-12 | Wiedergabe und Navigation | US-03 | US-03-AC-1 | Muss | KI-tauglich |
| FR-13 | Hintergrund-Tab und Media Session | US-03 | US-03-AC-1, US-03-AC-3 | Muss | Menschliche Verifikation |
| FR-14 | Hörposition merken | US-03 | US-03-AC-2 | Soll | KI-tauglich |
| FR-15 | Lokale Wallet | US-04 | US-04-AC-1 | Muss | Menschliche Verifikation |
| FR-16 | Wallet exportieren | US-04 | US-04-AC-2, US-04-AC-3 | Muss | Menschliche Verifikation |
| FR-17 | Wallet per Token aufladen | US-04 | US-04-AC-1, US-04-AC-4, US-04-AC-5 | Muss | Menschliche Verifikation |
| FR-18 | Dauerhaften Speicher anfordern | US-04 | US-04-AC-2 | Soll | Menschliche Verifikation |
| FR-19 | Zahlungsverlauf | US-04, US-06 | US-04-AC-1, US-06-AC-4 | Soll | KI-tauglich |
| FR-20 | Guthaben-Untergrenze | US-05 | US-05-AC-4 | Muss | KI-tauglich |
| FR-21 | npub aus Feed lesen | US-07 | US-07-AC-1 | Muss | KI-tauglich |
| FR-22 | kind:10019 laden und cachen | US-05, US-07 | US-05-AC-1, US-07-AC-2 | Muss | Menschliche Verifikation |
| FR-23 | Zahlungen deaktivieren mit Grund | US-07 | US-07-AC-1, US-07-AC-2, US-07-AC-3 | Muss | KI-tauglich |
| FR-24 | Hörzeit akkumulieren | US-05 | US-05-AC-2 | Muss | KI-tauglich |
| FR-25 | Intervall-Zahlung | US-05 | US-05-AC-1, US-05-AC-2 | Muss | Menschliche Verifikation |
| FR-26 | Streaming-Satz konfigurieren | US-05 | US-05-AC-6 | Muss | KI-tauglich |
| FR-27 | Nutzap bauen und publizieren | US-05, US-06 | US-05-AC-1, US-06-AC-1 | Muss | Menschliche Verifikation |
| FR-28 | Boost mit Betrag und Nachricht | US-06 | US-06-AC-1, US-06-AC-2, US-06-AC-5 | Muss | KI-tauglich |
| FR-29 | Proof-Reservierung | US-06 | US-06-AC-3, US-06-AC-4 | Muss | Menschliche Verifikation |
| FR-30 | Zahlungsfeedback im Player | US-05, US-06 | US-05-AC-1, US-06-AC-1 | Soll | KI-tauglich |
| FR-31 | Manifest und Service Worker | US-08 | US-08-AC-1, US-08-AC-2 | Soll | KI-tauglich |
| FR-32 | Installieren-Schaltfläche | US-08 | US-08-AC-1, US-08-AC-3 | Soll | Menschliche Verifikation |
| NFR-01 | Ladezeit unter 2 s | — | *Lücke: keine User Story* | Kann | Menschliche Verifikation |
| NFR-02 | Nutzap in unter 5 s | US-05 | US-05-AC-1 | Soll | Menschliche Verifikation |
| NFR-03 | Verhalten bei Netzausfall | US-05 | US-05-AC-5 | Muss | Menschliche Verifikation |
| NFR-04 | IndexedDB unter HTTPS | US-08 | US-08-AC-2 | Muss | KI-tauglich |
| NFR-05 | Nur https und wss | — | *Lücke: keine User Story* | Muss | KI-tauglich |
| NFR-06 | Chrome und Brave gleichwertig | — | *Lücke: keine User Story* | Muss | Menschliche Verifikation |
| NFR-07 | Demo in unter 3 Minuten | — | *Lücke: keine User Story* | Muss | Menschliche Verifikation |
| NFR-08 | Agentenfeste Formulierung | — | *Lücke: Prozessanforderung, nicht am Produkt testbar* | Soll | Menschliche Verifikation |
| NR-01 | Kein nsec | US-01 | US-01-AC-1 | Muss | KI-tauglich |
| NR-02 | Keine fremden Endpunkte | — | *Lücke: keine User Story* | Muss | Menschliche Verifikation |
| NR-03 | Proxy nur für Feeds | US-02 | US-02-AC-2 | Muss | Menschliche Verifikation |
| NR-04 | Keine Proofs in URL, localStorage, Konsole | — | *Lücke: keine User Story* | Muss | Menschliche Verifikation |
| NR-05 | Kein Tracking | — | *Lücke: keine User Story* | Muss | KI-tauglich |
| NR-06 | Keine Zahlung ohne Bestätigung | US-05 | US-05-AC-5, US-05-AC-6 | Muss | KI-tauglich |
| NR-07 | Nur erlaubte Mints | US-04, US-07 | US-04-AC-4, US-07-AC-3 | Muss | KI-tauglich |
| NR-08 | Kein Backend, kein Custody | — | *Lücke: keine User Story* | Muss | KI-tauglich |
| NR-09 | Fremde NIP-60-Wallet unangetastet | — | *Lücke: keine User Story* | Muss | Menschliche Verifikation |
| NR-10 | Service Worker cached keine Zahlungsdaten | — | *Lücke: keine User Story* | Muss | Menschliche Verifikation |

**Lücken.** Elf Anforderungen haben keine zugehörige User Story. Bei den nicht-funktionalen und negativen Anforderungen ist das erwartbar: Sie beschreiben Eigenschaften und Verbote, keine Nutzerhandlungen, und werden über Code-Review und manuelle Prüfung abgenommen, nicht über ein Gherkin-Szenario. NFR-08 ist eine Prozessanforderung an dieses Dokument selbst.
