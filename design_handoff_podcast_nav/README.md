# Handoff: Cashu Player — library navigation, full-screen player, wallet

## Overview

Three connected pieces of the Cashu Player desktop UI:

1. **Library navigation** — eight subscriptions under a *Shows ⇄ Episodes* toggle
   that swaps the whole pane, plus a show page and an expanded search state.
2. **Full-screen episode player** — reached from the persistent bottom strip or
   from any episode row.
3. **Wallet** — deposit a Cashu token, export one, see the mints the balance sits
   at, and a history typed by transaction. Plus the *Nutzap senden* sheet the Boost
   button opens.

Repository this was designed against: `08Cashu-player` (`actionsslave/cashu-player`).
It supersedes the earlier `design_handoff_cashu_player` bundle for the wallet:
**nutzaps are one-way in this design** — the listener sends to a podcast and never
receives. There is no kind-10019 receiving address, no nutzap inbox, no redemption
state, no NIP-60 wallet backup. The npub is identity only; the balance is local to
the device.

Language: the **wallet screens and the send sheet are in German** (final copy — use
it verbatim). The library and player screens are in **English**; the app's UI is
German, so treat that English as meaning, not wording, and keep the app's existing
German strings.

## About the design files

`mockups/Podcast Nav.dc.html` is a **design reference created in HTML** — a
prototype showing intended look, hierarchy and states. It is not production code.
The task is to **recreate these designs in this codebase's existing environment**
(React + TypeScript + Vite under `src/ui/`), using its established components,
hooks and state. Do not import the HTML, `support.js`, `image-slot.js` or the
design-system bundle into the app; read the values out of them and express them in
the app's own styling layer.

Open the file in a browser (double-click; everything it needs is in `mockups/`,
except the Phosphor icon font and Google Fonts, which load from a CDN). It is one
long pan-and-zoom canvas, newest work at the top:

- **Turn 4** — `4a` Wallet page, `4b` Nutzap senden sheet + Gesendet confirmation.
- **Turn 3** — `3a` Full-screen player.
- **Turn 2** — `2a` masthead-toggle navigation (**the approved direction**: Shows,
  Episodes, Show page, Search) and `2b` a left-rail alternative
  (**not chosen — do not implement**).

**Build:** all of turn 4, all of turn 3, and `2a`. Skip `2b`.

## Fidelity

**High-fidelity.** Colors, type sizes, spacing and copy are final and come from the
bound Broadsheet design system. Every value is either a token (`var(--color-*)`,
`var(--font-*)`) or an explicit px value stated below; token hex values are in
**Design tokens** at the end.

Deliberately not final:

- Cover art is a grey drop-in placeholder (`<image-slot>`) with a `.halftone`
  screen over it. Real art comes from the feed's `<itunes:image>`; keep the
  halftone treatment.
- Sample data (show names, episode titles, amounts, mint URLs, keyset IDs) is
  fictional.

## The frame every screen shares

Screens are drawn at **1120 × 1010 px** on the paper ground `#f3f2f2`. The page is
an open broadsheet: **no cards, no boxed panels, no section borders.** Structure
comes from the serif scale and whitespace. Only these rules print:

1. **Masthead rule** — `height: 3px; background: var(--color-text)`, full content
   width, `margin-top: 14px` under the top row.
2. **Dateline strip** — directly under it, `display: flex;
   justify-content: space-between; padding: 7px 0; font-size: 12px;
   text-transform: uppercase; letter-spacing: .1em;` in
   `color-mix(in srgb, var(--color-text) 62%, transparent)`. Three items: context,
   count, sort/state.
3. **Hairline** — `height: 1px; background: var(--color-divider)` closing the head.

Horizontal padding is **40px** everywhere. The head block is `padding: 22px 40px 0`;
content columns are `padding: 26px 40px 0` (24–30px top varies per screen, noted
below). Content is `flex: 1; min-height: 0; overflow: hidden`.

Row rules inside lists are `1px solid var(--color-divider)`; they separate rows,
never wrap them in boxes.

---

## Screens

### 2a — Library, Shows

Top row: `display: flex; align-items: baseline; gap: 24px`.

- Wordmark **“Podcasts”** — `var(--font-heading)`, 600, `26px`,
  `letter-spacing: -0.02em`.
- Centered segmented control (`.seg`, `font-size: 14px`) with two options
  (`.seg-opt`, `padding: 6px 20px`): **Shows** / **Episodes**. Active option is
  `background: var(--color-accent); color: var(--color-bg); font-weight: 600`;
  inactive is `color-mix(in srgb, var(--color-text) 70%, transparent)`.
  This toggle swaps the entire content pane; it is the primary navigation.
- Right: search icon (`ph-duotone ph-magnifying-glass`, `20px`,
  `var(--color-accent-700)`) and the user name at `14px`.

Dateline: `Tuesday, 2 September` · `8 subscriptions · 4 with new episodes` ·
`Recently updated`.

Content (`padding: 26px 40px 0`):

- Header row: `<h3>` **Subscriptions** at `25px`, with a ghost button
  *Manage subscriptions* right-aligned. `margin-bottom: 20px`.
- Grid: `grid-template-columns: repeat(3, 286px); gap: 26px 30px`. Per tile:
  - Cover: `width: 100%; aspect-ratio: 1/1`, class `halftone`,
    `margin-bottom: 11px`.
  - Title row: `display: flex; align-items: baseline; gap: 8px`. Shows with unplayed
    episodes carry a **7px magenta dot** (`var(--color-accent-2)`,
    `border-radius: 50%`) before the title. Title is heading font, 600, `18px`.
  - Meta line: `14px`, `color-mix(in srgb, var(--color-text) 68%, transparent)` —
    e.g. `3 new · 42 min left in progress`, or `All played · fortnightly`.

**Magenta is used for exactly one thing across the whole design: marking something
as new/unplayed.** Everything actionable is cyan.

### Persistent player strip (on every library screen)

`flex: none; height: 78px; padding: 0 40px; border-top: 1px solid
var(--color-divider); background: var(--color-neutral-100); display: flex;
align-items: center; gap: 28px`. Left to right:

1. Ghost icon button `ph-caret-up`, `20px`, title “Open full screen” — **this is
   the entry point to the full-screen player**; in the full-screen view the same
   control becomes `ph-caret-down` to collapse.
2. Now-playing block, `width: 280px`: a `46px` square with a `1px solid
   var(--color-divider)` border holding the show initial (heading, 600, `20px`),
   then kicker (show name, `11px`, uppercase, `.1em`) over the episode title
   (heading, 600, `15px`, single line, ellipsis).
3. Transport: `ph-skip-back` `22px`, `ph-pause-circle` `34px` in
   `var(--color-accent-700)`, `ph-skip-forward` `22px`; `gap: 18px`.
4. Progress: elapsed `21:14` / bar / `42:07 left`, both `13px` tabular. Bar is
   `height: 2px; background: var(--color-neutral-300)`, played portion
   `var(--color-accent)`, `8px` round accent knob at the play head.
5. Value block (only when the feed carries a `<podcast:value>` tag):
   `47 sats/min` at `13px` plus a primary **Boost** button
   (`.btn.btn-primary`, `14px`, `padding: 7px 16px`, `ph-lightning` icon).

### 2a — Library, Episodes

Same head; segmented control flipped. Dateline: `Tuesday, 2 September` ·
`Unplayed only` · `Newest first`.

`<h3>` **Latest episodes** at `25px`. A flat list, newest first, across all
subscriptions. Row: `display: grid; grid-template-columns: minmax(0,1fr) auto 44px;
align-items: center; gap: 0 24px; padding: 17px 0; border-bottom: 1px solid
var(--color-divider)`.

- Kicker line: `11px` uppercase `.1em` at 62% text — the **show name**, preceded by
  a `6px` magenta dot when unplayed. (Episode rows carry no thumbnail; the show
  name reads as a newspaper kicker over the headline.)
- Title: heading, 600, `19px`, `margin-top: 3px`, `cursor: pointer`; hover
  `color: var(--color-accent-700); text-decoration: underline`.
- Description: `14px` at 70%, single line, ellipsis.
- Right: time remaining, `14px` tabular at 70% (`42 min left`), or `Played` at 55%.
- Play button: `.btn.btn-icon.btn-secondary`, `17px`, `ph-play` — `.btn-ghost`
  instead when the episode is played.

### 2a — Show page

Head swaps the wordmark for a ghost back button *← All shows*
(`ph-arrow-left`, `padding-left: 0`). Dateline: `Weekly` · `84 episodes · 1 new` ·
`Newest first`.

Compact header: `display: flex; gap: 26px; align-items: flex-start;
margin-bottom: 26px`.

- `132 × 132` halftone cover.
- `<h2>` show title, `32px`; description `16px/1.55`, `max-width: 62ch`, 78% text.
- Right: `.btn.btn-secondary` **Following** with `ph-check`, plus an icon button
  `ph-dots-three`.

Episode rows as above but `padding: 16px 0` with `border-top` instead of bottom, and
the kicker carries the date (`New · 28 August` when unplayed, otherwise
`21 August`).

### 2a — Search

The search icon expands into the whole head row: `display: flex; align-items:
center; gap: 16px` — `ph-magnifying-glass` at `24px` accent, the query set in the
heading face at `28px`, 600, `letter-spacing: -0.02em` with a `2px × 28px` accent
caret, and a ghost `ph-x` to dismiss.

The dateline strip becomes filter tabs: `All` (accent, 600) · `Shows` · `Episodes`
· `Unplayed`, with `Searching your subscriptions` pushed right (`margin-left: auto`).

Results are grouped by kicker (`Shows`, then episodes), with `88 × 88` halftone
covers in the show group.

### 3a — Full-screen player

Head: ghost `ph-caret-down` (collapse back to the strip) · `Now playing` kicker ·
right: ghost button `Up next · 4` with `ph-queue`, and `ph-dots-three`.
Dateline: `Signal & Noise` · `Episode 118 · 28 August` · `1 h 03 total`.

Body is a single centered column (`display: flex; flex-direction: column;
align-items: center; padding: 24px 40px 0`):

1. **Cover** `260 × 260`, `.halftone`.
2. Kicker `Signal & Noise · Episode 118`, `12px` uppercase `.12em`, `margin-top: 20px`.
3. `<h2>` episode title, `28px`, centered, `max-width: 34ch`.
4. **Scrubber**, `width: 100%; max-width: 760px; margin-top: 24px`, `gap: 18px`:
   elapsed / 2px bar with 34% accent fill and a `10px` knob / remaining, both `14px`
   tabular at 65%.
5. **Transport row**, `gap: 24px; margin-top: 14px`, centered:
   `1.2×` speed (`14px` tabular, `width: 34px`, right-aligned) · `ph-skip-back` 24px
   · `ph-arrow-counter-clockwise` 21px (back 15s) · **`ph-pause-circle` 58px in
   `var(--color-accent-700)`** · `ph-arrow-clockwise` 21px (forward 30s) ·
   `ph-skip-forward` 24px · `ph-moon` 20px (sleep timer) · `ph-download-simple` 20px.
6. **Value row** (only with a `<podcast:value>` tag), `margin-top: 16px`:
   `Streaming 47 sats/min · 1,240 sent` at `14px` tabular, plus the primary
   **Boost** button — this opens the *Nutzap senden* sheet (4b).
7. **Notes + chapters**, `width: 100%; max-width: 900px; margin-top: 26px;
   padding-top: 22px; border-top: 1px solid var(--color-divider); display: grid;
   grid-template-columns: minmax(0,1fr) 300px; gap: 44px`.
   - Left: kicker `Episode notes`, body `16px/1.6`, `max-width: 58ch` at 84%; then a
     `14px` credit line at 65% with **Transcript** as an accent link.
   - Right: kicker `Chapters`, then rows `grid-template-columns: 56px minmax(0,1fr);
     gap: 0 14px; padding: 9px 0; border-top: 1px solid var(--color-divider)` —
     timestamp `13px` tabular, label `15px` at 70%. **The current chapter is set in
     the heading face, 600, in `var(--color-accent-700)`, timestamp included.**

### 4a — Wallet (German, final copy)

Head: `Cashu Player` wordmark (heading, 600, `24px`) then route links
`Hören` / **`Wallet`** / `Einstellungen` at `16px` — the active route is heading
600 in `var(--color-accent-700)`, the others 72% text. Truncated npub right-aligned,
`14px` tabular at 70%.

Dateline: `2 Mints` · `Nur auf diesem Gerät gespeichert` ·
`npub dient der Identität, nicht der Verwahrung`.

Content, `padding: 30px 40px 0`, top to bottom:

**Balance** — `display: flex; align-items: baseline; gap: 16px`: the number in the
heading face, 600, **`72px`**, `line-height: 0.9`, `letter-spacing: -0.03em`,
tabular; `Sat` at `26px`; `verfügbar für Nutzaps` at `14px`, 62%.

**Aufladen / Export** — `display: grid; grid-template-columns: minmax(0,1fr)
minmax(0,1fr); gap: 56px; margin-top: 28px`. Both columns: `<h3>` at `25px`, then a
`14px/1.6` explainer at 68%.

- *Aufladen*: a `.input` textarea, `height: 76px`, placeholder `cashuA…`. Below,
  `gap: 14px`: `.btn.btn-primary` **Aufladen** and `.btn.btn-ghost`
  **Aus Zwischenablage** (`ph-clipboard`). Copy: “Füge einen Cashu-Token ein,
  lautend auf Sat. Ein Token eines fremden Mints lässt sich einlösen, sobald du dem
  Mint vertraust.”
- *Export*: amount `.input` `width: 150px` (tabular), the word `Sat von`, and a
  `.tag.tag-outline` naming the source mint; below, `.btn.btn-secondary`
  **Token erzeugen** and `.btn.btn-ghost` **Gesamtes Guthaben**. Copy: “Gib einen
  Betrag als Cashu-Token aus, einlösbar in jeder Wallet. Der Token entsteht beim
  gewählten Mint und verlässt diese Wallet endgültig.”

**Mints** — `margin-top: 30px; padding-top: 20px; border-top: 1px solid
var(--color-divider)`. `<h3>` **Mints** with a ghost **Mint hinzufügen** right.
Explainer at `15px/1.6`, `max-width: 80ch`, 78%: “Dein Guthaben ist eine Forderung
gegen den jeweiligen Mint. Ein Nutzap kann nur von einem Mint gesendet werden, den
der Podcast auch akzeptiert.”

Table: `grid-template-columns: minmax(0,1fr) 130px 100px 190px 110px; gap: 0 24px`.
Header row `12px` uppercase `.1em` at 55% with a bottom hairline; body rows `15px`,
`padding: 12px 0`, bottom hairline. Columns:
**Mint** (the default sending mint is suffixed `· Standard zum Senden` at 60%) ·
**Guthaben** (tabular) · **Einheit** (`sat`) · **Keyset** (tabular, 65%) ·
**Status** (`Erreichbar` in `var(--color-accent-700)`; an unreachable mint takes
`var(--color-accent-2-700)`).

**Verlauf** — `margin-top: 26px`. `<h3>` **Verlauf** with type filter tags beside it
(`gap: 20px` from the heading, `gap: 8px` between): **Alle** selected — a `.tag`
with `background: var(--color-accent); color: var(--color-bg); border: 1px solid
var(--color-accent)` — then `.tag.tag-outline` **Aufladen**, **Nutzap**, **Export**.

Table: `grid-template-columns: 120px 120px 180px minmax(0,1fr) 190px; gap: 0 24px`.
Columns **Betrag** (tabular, signed) · **Wann** (65%) · **Art** ·
**Podcast · Episode** (`—` at 65% when not tied to an episode) · **Mint** (65%).
Rows `15px`, `padding: 11px 0`, bottom hairline except the last.

The three transaction types, and only these three:
`Nutzap gesendet` (negative, carries podcast + episode), `Token exportiert`
(negative, no episode), `Aufgeladen` (positive, no episode).

### 4b — Nutzap senden (dialog)

`.dialog`, `width: 680px; padding: 32px 34px; background: var(--color-bg);
box-shadow: var(--shadow-lg)`. Opened by the Boost button in the strip or the
full-screen player.

- Kicker: `Signal & Noise · Folge 118`.
- `<h3>` **Nutzap senden**, `25px`; explainer `15px/1.6` at 78%: the amount goes as
  a Cashu token to this episode's recipients, locked to their keys; the comment is
  published publicly on nostr.
- **Amount chips**: `.tag` row, `gap: 10px`. Preset values `100`, `500`, `2.100`,
  `10.000` at `14px`. The **selected** chip is filled
  (`background: var(--color-accent); color: var(--color-bg); border: 1px solid
  var(--color-accent); font-weight: 600`); the rest are `.tag-outline`. Trailing
  label `Sat · frei wählbar` at 62%.
- **Comment**: `.input`, `height: 64px`, placeholder `Kommentar (öffentlich)`.
- **Aufteilung** (the value split, read from `<podcast:value>`): kicker, then rows
  `grid-template-columns: minmax(0,1fr) 90px 150px; gap: 0 18px; padding: 11px 0`
  with top hairlines. Per row: recipient name at `16px` with role at 62%
  (`· Host`, `· Gast`, `· App`), amount `15px` tabular, and a status —
  `Nutzap möglich` in `var(--color-accent-700)` when the recipient publishes a
  nutzap address, `Keine Adresse` in `var(--color-accent-2-700)` when not.
- Below the split, two `14px` notes at 72%: the share for a recipient without an
  address stays in the wallet (or goes by Lightning), and which mint the token is
  minted at, confirmed as accepted by the recipients.
- Actions, `gap: 14px; margin-top: 26px`: `.btn.btn-primary`
  **475 Sat senden** (`ph-lightning`, `15px`, `padding: 9px 20px`),
  `.btn.btn-secondary` **Abbrechen**, then `Verbleibend: 12.005 Sat` at 62%.

**Note:** the amount sent (475) is the sum of the shares that *can* be paid, not the
chip value (500) — the unaddressed 25 Sat share stays put. Compute the button
label from the payable split.

### 4b — Gesendet (confirmation)

Same dialog shell. Accent kicker `Gesendet`, `<h3>` **475 Sat unterwegs**, an
explainer that the tokens are locked to the recipients' keys and held at the mint
until redeemed — the payment is its own receipt, nothing to confirm. Then a
`grid-template-columns: 200px minmax(0,1fr); gap: 8px 24px` detail list at `15px`:
Empfänger · Mint · Veröffentlicht auf (relays) · In deiner Wallet geblieben.
Actions: `.btn.btn-secondary` **Fertig**, `.btn.btn-ghost` **Im Verlauf ansehen**.

---

## Interactions & behavior

- **Shows ⇄ Episodes** — the segmented control swaps the whole content pane. It is
  page state, not a filter; it persists across navigation and is present on the
  show page too.
- **Search** — the icon expands into the full head row, replacing the wordmark and
  toggle; `Esc` or the `ph-x` collapses it. Filters (`All`/`Shows`/`Episodes`/
  `Unplayed`) replace the dateline strip. Search is scoped to subscriptions.
- **Player strip ⇄ full screen** — `ph-caret-up` in the strip expands to `3a`;
  `ph-caret-down` in `3a` collapses back. The strip stays mounted; audio never
  restarts.
- **Episode row** — clicking the title plays and opens the full-screen player;
  clicking the play button plays in place, leaving the list up.
- **Boost** — opens `4b` over the current view. On send, show the Gesendet state,
  then return to where the user was; the transaction appears in Verlauf as
  `Nutzap gesendet`.
- **Aufladen** — paste or clipboard-read a token, then Aufladen. A token from a mint
  not in the Mints table has to be accepted (trusting the mint) before it can be
  redeemed; that mint then joins the table.
- **Export** — irreversible; the token leaves the wallet. Worth a confirmation the
  mockup does not show.
- **Verlauf filters** — the four tags filter the table by type; `Alle` is default.
- **Hover** — episode titles go `var(--color-accent-700)` + underline. All other
  hovers/pressed/focus states come from the design system's own rules; don't
  restyle them. Focus is `2px solid var(--color-accent)`, `outline-offset: 2px`.
- **Value rows are conditional** — the sats/min readout and the Boost button only
  render for feeds carrying `<podcast:value>`. Everything else must work without it.

## State

- `libraryView: 'shows' | 'episodes'` — the toggle.
- `searchOpen: boolean`, `searchQuery: string`, `searchFilter: 'all' | 'shows' |
  'episodes' | 'unplayed'`.
- `playerExpanded: boolean` — strip vs. full screen.
- Playback: current episode, position, duration, rate, sleep timer.
- Per-episode: `played`, `positionSeconds` (drives “42 min left” / “Played”).
- Per-show: `unplayedCount` (drives the magenta dot).
- Wallet: `balanceBySat` per mint, `mints[] { url, balance, unit, keysetId,
  reachable, isDefaultSender }`, `history[] { type: 'nutzap_sent' | 'export' |
  'deposit', amount, timestamp, podcast?, episode?, mint }`.
- Boost sheet: `amount`, `comment`, `split[] { name, role, amount, hasNutzapAddress }`,
  derived `payableTotal`.

## Design tokens

From `mockups/_ds/broadsheet-…/styles.css` — take them from there, not from this
list, if the two ever disagree.

| Token | Value | Used for |
| --- | --- | --- |
| `--color-bg` | `#f3f2f2` | page ground |
| `--color-text` | `#201e1d` | all text, masthead rule |
| `--color-accent` | `#0088b0` | active toggle fill, progress bar, selected chip, caret |
| `--color-accent-700` | `#006786` | accent text/icons (active route, play icon, links) |
| `--color-accent-600` | `#1186ac` | link hover |
| `--color-accent-2` | `#d6006c` | the new/unplayed dot — nothing else |
| `--color-accent-2-700` | `#aa0b56` | warning text (`Keine Adresse`) |
| `--color-neutral-100` | `#f8f4f4` | player strip ground |
| `--color-neutral-300` | `#d7d3d3` | unplayed portion of progress bars |
| `--color-divider` | `#201e1d` at 16% | every hairline |
| `--shadow-md` | `0 3px 10px #2d2b2b @16%` | screen frames (mockup only) |
| `--shadow-lg` | `0 12px 32px #2d2b2b @22%` | dialogs |
| `--font-heading` / `--font-body` | `"Source Serif 4"` | everything — no sans anywhere |

Muted text is written as `color-mix(in srgb, var(--color-text) N%, transparent)`
with N = 84 (body), 78, 72, 70, 68, 65, 62, 60, 55 (faintest labels). Map these to
the app's own scale if it has one.

Type scale in use: `72` (balance) · `32` (show title) · `28` (player title, search
query) · `26` (wordmark) · `25` (h3) · `24` (wallet wordmark) · `20` · `19` (episode
title) · `18` (show tile) · `16` (body) · `15` · `14` (meta, buttons) · `13` ·
`12` (dateline/kickers, uppercase `.12em`) · `11` (row kickers, uppercase `.1em`).

Numbers that sit in columns or change live use `font-variant-numeric: tabular-nums`.
German number formatting throughout the wallet (`12.480`, `2.100`).

## Icons

Phosphor, **duotone weight only** (`ph-duotone ph-*`): `caret-up`, `caret-down`,
`magnifying-glass`, `x`, `arrow-left`, `check`, `dots-three`, `play`, `pause-circle`,
`skip-back`, `skip-forward`, `arrow-counter-clockwise`, `arrow-clockwise`, `moon`,
`download-simple`, `queue`, `lightning`, `clipboard`.

## Assets

- No bitmap assets. Cover art is a placeholder; the `.halftone` class (a 3px
  radial-gradient dot screen at `mix-blend-mode: multiply` over a
  `grayscale(0.35) contrast(1.15)` image) is the treatment to keep.
- `image-slot.js` in `mockups/` is a prototype-only drag-and-drop placeholder — do
  not port it.

## Files

- `mockups/Podcast Nav.dc.html` — every screen. Search it by the `data-screen-label`
  attributes: `2a Shows`, `2a Episodes`, `2a Show`, `2a Search`, `2b Shows`,
  `2b Episodes`, `3a Player`, `4a Wallet`.
- `mockups/_ds/broadsheet-…/styles.css` — the token sheet and component classes
  (`.btn`, `.tag`, `.seg`, `.input`, `.dialog`, `.halftone`).
- `mockups/_ds/broadsheet-…/readme.md` — the design system's own guide.
- `mockups/support.js`, `mockups/image-slot.js` — prototype runtime. Reference only.

## Screen map

| Screen | Build in |
| --- | --- |
| 2a Shows / Episodes | library route under `src/ui/` |
| 2a Show | show detail route |
| 2a Search | library route, search state |
| 3a Player | `src/player/` + its UI |
| 4a Wallet | wallet route, `src/wallet/` |
| 4b Nutzap senden / Gesendet | `src/payments/` + dialog UI |
