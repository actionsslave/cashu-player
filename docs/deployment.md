# Deployment

Die App ist ein statisches Bundle. Es gibt kein Backend, keine Registrierung,
keinen Review-Prozess (Kapitel 5.5). Was es gibt, sind vier harte Bedingungen
und eine Entscheidung, die vor dem ersten Deploy fallen muss.

## Die vier Bedingungen

| Bedingung | Warum | Woran es sonst scheitert |
|---|---|---|
| Auslieferung ueber **HTTPS** | Service Worker und `navigator.storage.persist()` verlangen einen sicheren Kontext (NFR-04) | `registerServiceWorker()` liefert `kein-sicherer-kontext`, keine Installierbarkeit, kein dauerhafter Speicher |
| Bundle in der **Wurzel** der Origin | `start_url` und `scope` im Manifest stehen auf `/` | Manifest-Warnung in DevTools, `beforeinstallprompt` feuert nicht (FR-32) |
| **`sw.js` unter `/`** | Der Scope eines Service Workers reicht nur so weit wie sein Pfad | Ein Worker unter `/assets/sw.js` deckte nur `/assets/` ab, die App-Shell bliebe ungecacht (FR-31) |
| Origin bleibt **stabil** | IndexedDB haengt an der Origin | Domainwechsel nach der ersten Aufladung heisst: Guthaben weg, neue leere Wallet (OQ-08, A-06) |

Der Vite-Build erfuellt die ersten drei bereits: `vite.config.ts` gibt dem
Service-Worker-Entry `sw.js` ohne Hash und ohne Unterverzeichnis, alles andere
landet unter `assets/`. Nach `npm run build` sieht `dist/` so aus:

```
dist/
├── _headers                  Cache- und Sicherheitsheader
├── assets/                   gehashte JS- und CSS-Dateien
├── icon-192.png
├── icon-512.png
├── index.html
├── manifest.webmanifest
├── pruefung/                 Pruefseiten fuer A-01 und A-02
└── sw.js                     in der Wurzel, wie FR-31 verlangt
```

## Vor dem ersten Deploy zu entscheiden

Das sind die Punkte, die ich nicht fuer dich entscheiden kann.

**1. Die Origin (OQ-08).** Der Vorschlag im Anforderungs-Dokument ist eine
Subdomain der Podcast-Domain. Diese Entscheidung ist die teuerste, wenn sie
spaet faellt: Ab der ersten Aufladung haengt echtes Guthaben an der Origin,
und ein Umzug macht es unerreichbar. Entscheide sie **vor** dem ersten Test
mit echten Betraegen — nicht erst vor der Demo.

**2. Der Host.** Drei Wege, die alle die vier Bedingungen erfuellen:

| Weg | Passt, wenn | Aufwand |
|---|---|---|
| Netlify oder Cloudflare Pages | ihr die Subdomain per DNS auf den Host zeigen koennt | `_headers` wirkt direkt, HTTPS automatisch |
| GitHub Pages | ihr ohnehin auf GitHub seid | Custom Domain plus „Enforce HTTPS"; `_headers` wirkt **nicht**, Caching bleibt beim Standard |
| Eigener Server (nginx, Caddy) | die Podcast-Domain schon bei euch liegt | Header selbst setzen, siehe unten |

**3. Die Build-Konstanten.** `src/config/build-config.ts` enthaelt noch
Platzhalter fuer Mints, Relays, Feed-Proxy und Demo-npub. Die App zeigt das zur
Laufzeit als Warnung an (`hasPlaceholders()`), aber Zahlungen funktionieren
damit nicht. Kandidaten stehen in [`kandidaten.md`](kandidaten.md); die Auswahl
triffst du. **Jeder Mint muss vor dem Bau einzeln auf CORS-Tauglichkeit
geprueft werden** — dafuer ist `/pruefung/a02-mints.html` da, und sie muss
unter derselben Origin wie die Demo laufen, sonst sagt das Ergebnis nichts
ueber CORS aus (A-02).

**4. Eine Content-Security-Policy — oder bewusst keine.** Eine CSP mit
`connect-src` waere die technische Durchsetzung von NR-02 (keine fremden
Endpunkte). Sie laesst sich erst schreiben, wenn die Mints feststehen, und die
Relays kommen aus dem `kind:10019` des Empfaengers, sind also zur Build-Zeit
unbekannt. `public/_headers` enthaelt deshalb absichtlich keine CSP. Eine
falsche CSP blockiert Zahlungen still — wenn ihr eine wollt, schreibt sie erst
nach A-02 und prueft danach einen kompletten Zahlungsdurchlauf.

## Schritte

```bash
npm ci
npm test
npm run build
npm run lint
```

Laufen alle vier durch, liegt das fertige Bundle in `dist/`. Dann:

1. `dist/` auf den gewaehlten Host bringen — als Wurzel der Origin, nicht in
   ein Unterverzeichnis.
2. HTTPS erzwingen (bei Netlify, Cloudflare Pages und GitHub Pages eine
   Einstellung, kein Zertifikatsgeschaeft).
3. Die Pruefungen aus [`manuelle-tests.md`](manuelle-tests.md) fahren, in
   dieser Reihenfolge: erst **A-02** (Mints unter der echten Origin
   erreichbar?), dann **A-01** (signiert die Extension wiederholt ohne
   Interaktion?), dann der Rest. Beides sind die Punkte, an denen das Projekt
   scheitern kann.

### Header auf einem eigenen Server

`_headers` ist Netlify- und Cloudflare-Pages-Format. Fuer nginx:

```nginx
location = /sw.js {
    add_header Cache-Control "no-cache, no-store, must-revalidate";
}
location /assets/ {
    add_header Cache-Control "public, max-age=31536000, immutable";
}
add_header X-Content-Type-Options nosniff;
add_header Referrer-Policy no-referrer;
add_header X-Frame-Options DENY;
```

Fuer Caddy:

```caddyfile
handle /sw.js {
    header Cache-Control "no-cache, no-store, must-revalidate"
}
handle /assets/* {
    header Cache-Control "public, max-age=31536000, immutable"
}
header {
    X-Content-Type-Options nosniff
    Referrer-Policy no-referrer
    X-Frame-Options DENY
}
```

Der Punkt, der wirklich zaehlt, ist `sw.js`: Wird er gecacht, laeuft nach einem
Deploy weiter der alte Worker, und die App aktualisiert sich nie.

## Was die GitHub-Action tut — und was nicht

`.github/workflows/ci.yml` laeuft bei jedem Push auf `main` und bei jedem Pull
Request. Sie fuehrt aus: Guardrails (eigener Schritt, damit ein Verstoss gegen
NR-01 bis NR-10 nicht in den uebrigen Tests untergeht), Tests, Build, Lint.

Sie **deployt nicht**. Das ist Absicht und bleibt so, solange die Origin nicht
feststeht: Ein automatischer Deploy auf eine noch nicht entschiedene Domain
haette dieselbe Folge wie ein Domainwechsel — Guthaben an einer Origin, die
niemand mehr aufruft. Die Action hat `permissions: contents: read` und braucht
kein Secret.

**Wenn die Origin feststeht**, kommt ein `deploy`-Job dazu, der von
`pruefungen` abhaengt und nur auf `main` laeuft. Was er braucht, haengt vom
Host ab: bei Netlify und Cloudflare Pages ein API-Token als Repository-Secret,
bei GitHub Pages die `pages: write`- und `id-token: write`-Berechtigung. Beides
erst dann anlegen — ein Token fuer einen Host, den ihr am Ende nicht nehmt, ist
ein Secret ohne Zweck.

## Nach dem Deploy

Zwei Dinge, die sich nur unter der echten Origin pruefen lassen und die vor der
Demo stehen muessen:

- **A-02 nachfahren.** CORS ist eine Eigenschaft des Paares aus Origin und
  Mint. Ein Ergebnis von `localhost` sagt darueber nichts.
- **DevTools → Application.** Manifest ohne Warnung, Service Worker
  „activated and is running", und nach einer Zahlung: kein Mint- oder
  Relay-Verkehr im Cache Storage (NR-10), kein Proof im Local Storage (NR-04).
