# Cashu-Podcast-Player

Podcast-Player im Desktop-Browser mit Cashu-Zahlungen. Anforderungen:
[docs/anforderungen-cashu-podcast-player-web-mvp.md](docs/anforderungen-cashu-podcast-player-web-mvp.md).

## Entwickeln

```bash
npm install
npm run dev      # Vite-Dev-Server
npm test         # Vitest
npm run build    # tsc --noEmit && vite build -> dist/
npm run lint
```

Der Service Worker wird nur im Produktions-Build registriert — im Dev-Server
gibt es kein gebautes `/sw.js`.

## Vor dem ersten Lauf

In [src/config/build-config.ts](src/config/build-config.ts) stehen Platzhalter für
erlaubte Mints, Demo-Relays, Feed-Proxy und Demo-npub. Solange sie dort stehen,
zeigt die App oben einen Hinweis (`hasPlaceholders()`).

Icons neu erzeugen: `node tools/make-icons.mjs`.

## Ausliefern

`dist/` ist ein statisches Bundle und muss **über HTTPS von der Wurzel einer
Origin** ausgeliefert werden:

- Service Worker und `navigator.storage.persist()` verlangen einen sicheren
  Kontext (NFR-04).
- `sw.js` liegt bewusst unter `/`, sonst gilt sein Scope nur für `/assets/`.
- Die Origin früh festlegen: Der Browser-Speicher hängt daran, ein Domainwechsel
  nach dem ersten Aufladen bedeutet neues Guthaben (OQ-08).

## Prüfseiten

Zwei Seiten für die riskanten Annahmen, beide unter derselben Origin wie die Demo
zu öffnen:

- `/pruefung/a01-nip07.html` — signiert die NIP-07-Extension wiederholt ohne
  Interaktion? (A-01)
- `/pruefung/a02-mints.html` — ist jeder Mint aus dem Browser erreichbar, mit
  NUT-11, NUT-12 und ohne Fees? (A-02, A-05)

Was Menschen prüfen müssen, steht in [docs/manuelle-tests.md](docs/manuelle-tests.md).

## Aufbau

| Ordner | Inhalt |
|---|---|
| `src/contracts` | Die drei Verträge aus Kapitel 5.7 |
| `src/config` | Alle Build-Konstanten |
| `src/db` | IndexedDB-Schema |
| `src/identity` | NIP-07, Session (Paket D) |
| `src/wallet` | Proofs, Import, Export, Mint-Anbindung (Paket C) |
| `src/feed` | Abruf, Proxy-Fallback, Parsing, Abos (Paket A) |
| `src/player` | Wiedergabe, Position, ListeningTick (Paket B) |
| `src/payments` | Empfängerauflösung, Nutzaps (Paket E) |
| `src/pwa` | Manifest-Registrierung, Cache-Regel, Install-Prompt (Paket F) |
| `tools/guardrails.ts` | Statischer Scanner für NR-01, NR-03, NR-04, NR-05, NR-10 |
