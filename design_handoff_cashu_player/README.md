# Handoff: Cashu Player — Listen, Wallet, Boost, and empty/blocked states

## Overview

Cashu Player is a Podcast 2.0 web player that streams Cashu ecash (nutzaps) to a
podcast while the listener listens, and sends one-time boosts on demand. This
bundle is the UI design for the MVP: the Listen route, the Wallet route, the Boost
dialog, and the four states where payment can't run.

Repository this was designed against: `actionsslave/cashu-player`, branch `main`.
The mockups were built from `README`,
`docs/anforderungen-cashu-podcast-player-web-mvp.md` and `src/ui/` (see Screen map
at the end of this file). The app's own copy is German; **the mockups are in
English at the designer's request** — when implementing, keep the app's existing
German strings and treat the English text here as the meaning, not the wording.

## About the design files

The files in `mockups/` are **design references created in HTML** — prototypes
showing intended look, hierarchy and states. They are not production code to copy.
The task is to **recreate these designs in this codebase's existing environment**
(React + TypeScript under `src/ui/`), using its established components, hooks and
state. Do not import the HTML, the `support.js` runtime, or the design-system
bundle into the app; read the values out of them and express them in the app's own
styling layer.

Open `mockups/Cashu Player Mockups.dc.html` in a browser. It is one long canvas
containing every screen, newest work at the top:

- **Turn 3** — the states: `3a` blocked, `3b` low balance, `3c` no key, `3d` empty.
- **Turn 2** — three Boost-button treatments; `2a` (solid black) was chosen and is
  already folded into `1a`. `2b`/`2c` are rejected, kept for reference only.
- **Turn 1** — `1a` Listen (single column, **the approved layout**), `1b` Listen
  two-column with a live ledger rail, `1c` Listen press-sheet variant,
  `1d` Wallet route, `1e` Boost dialog.

**Which variants to build:** `1a` + `1d` + `1e` + all of turn 3. `1b` and `1c` are
alternates that were explored and not chosen — do not implement them.

## Fidelity

**High-fidelity.** Colors, type sizes, spacing and copy are final and come from the
bound Broadsheet design system. Recreate the UI to match. Every value in the
mockups is either a design-system token (`var(--color-*)`, `var(--font-*)`,
`var(--space-*)`, `var(--radius-*)`) or an explicit px value listed below; the exact
hex values for the tokens used are in **Design tokens** at the end.

Two things are deliberately *not* final:

- Cover art and show art are grey placeholders labelled "Cover"/"Art" — real
  artwork comes from the feed's `<itunes:image>`.
- The QR code in `1d` is a CSS stand-in. Render a real QR of the exported token.

## Layout frame shared by every screen

All screens are drawn at **1280px** wide on the paper ground `#f3f2f2`. The page is
an open broadsheet: **no cards, no boxed panels, no section borders.** Structure
comes from the serif scale and whitespace. The only rules that print are the ones
listed here.

Top of every screen, in order:

1. **Masthead rule** — `height: 3px; background: var(--color-text)`, full bleed.
2. **Nav** — design system `.nav`, `padding: 13px 44px`, `display: flex`,
   `align-items: center`, `gap: 20px`:
   - `.nav-brand` "Cashu Player" at `font-size: 19px` (a hair-space between the two
     words in the mockup; a normal space is fine).
   - Route links `Listen` / `Wallet` / `Settings` in a `flex` row, `gap: 24px`,
     `margin-right: auto`. Active route carries `aria-current="page"`.
   - Balance, right-aligned: `font-size: 13px`, `var(--color-neutral-700)`.
   - Identity, right-aligned: truncated npub `npub1n0dev…u02cy`, `font-size: 13px`,
     `var(--color-neutral-700)`, `font-variant-numeric: tabular-nums`.
3. **Hairline** — `height: 1px; background: var(--color-divider)`.

Horizontal page padding is **44px** everywhere.

## Screens

### 1a — Listen (approved)

**Purpose.** The default route. Listener plays an episode, watches sats stream out
per minute, boosts, and manages subscriptions.

**Layout.** Masthead + nav, then two stacked blocks:

**Now-playing block** — `padding: 34px 44px 30px`, `display: flex`, `gap: 32px`,
`align-items: flex-start`:

- **Cover** — 196×196px, `flex: none`, halftone-screened image.
- **Centre column** — `flex: 1; min-width: 0`:
  - Kicker "Now playing · Nodesignal" — `font-size: 11px`,
    `letter-spacing: .1em`, `text-transform: uppercase`, `var(--color-accent)`,
    `margin-bottom: 7px`.
  - `h1` episode title — `font-size: 46px`, `margin: 0 0 4px`.
  - Meta line "Episode 412 · 1:12:40 · streaming 10 sat/min" — `font-size: 14px`,
    muted (`.text-muted`), `margin-bottom: 22px`.
  - **Progress bar** — track `height: 4px; background: var(--color-neutral-300)`;
    fill `background: var(--color-accent)`, width = played fraction (19.4% shown).
    `margin-bottom: 8px`. Clickable for seek.
  - **Time row** — elapsed left, remaining right with a minus sign (`00:14:07` /
    `−00:58:33`), `font-size: 12px`, tabular nums, `var(--color-neutral-700)`,
    `margin-bottom: 20px`.
  - **Transport row** — `display: flex; align-items: center; gap: 10px`:
    `−15 s` (`.btn.btn-secondary`), `Pause` (`.btn.btn-primary`,
    `padding-inline: 26px`), `+30 s` (`.btn.btn-secondary`), a rate `select.input`
    (`width: auto; margin-left: 6px`, options `1× / 1,2× / 1,5× / 2×`), then the
    **Boost** button pushed right with `margin-left: auto`.
  - **Boost button (variant 2a, approved)** — `.btn` with
    `background: var(--color-text); color: var(--color-bg); padding-inline: 24px`.
    Solid black ink, the loudest element on the page. Hover: darken to
    `var(--color-neutral-900)`. Disabled: 45% opacity (system default).
- **Session column** — `width: 212px; flex: none; padding-left: 28px;
  border-left: 1px solid var(--color-divider)` (the one vertical rule in the design):
  - Label "This session" — `font-size: 11px`, `.1em` tracking, uppercase,
    `var(--color-neutral-700)`, `margin-bottom: 10px`.
  - Counter — `font-family: var(--font-heading); font-weight: 600;
    font-size: 38px; line-height: 1`, tabular nums. Value then a `17px`,
    weight-400 "sat". Plain serif — an earlier misregistered-plate treatment was
    rejected for the numerals.
  - "sent in 4 nutzaps" — `font-size: 13px`, muted, `margin: 8px 0 14px`.
  - Pending line "6 sat pending" — `font-size: 13px`, tabular nums,
    `var(--color-accent-2)` (magenta; this is the one magenta on the screen).
  - Footnote "Below 1 sat carries into the next minute." — `font-size: 12px`, muted.

**Subscriptions block** — `padding: 0 44px 44px`:

- `h2` "Subscriptions" — `font-size: 26px`, `margin-bottom: 3px`.
- Sub-line "Three newest episodes each. Titles only — feed descriptions are raw
  HTML." — `font-size: 13px`, muted, `margin-bottom: 20px`.
- **Add-feed row** — `display: flex; gap: 16px; max-width: 520px;
  margin-bottom: 26px`: `input.input[type=url]` placeholder `https://…/rss`, plus
  `.btn.btn-primary` "Subscribe" (`white-space: nowrap`).
- **Feed grid** — `display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 34px`.
  Each cell: a 52×52px art placeholder + `h4` show name (`19px`) + episode count
  (`12px` muted, may carry a `.tag.tag-neutral` "via proxy"), then a
  `flex-direction: column; gap: 9px` list of the three newest episode titles as
  links (`.ep`: `font-size: 15px`, `color: var(--color-accent-700)`, no underline;
  hover `var(--color-accent-800)` + underline). The currently-playing episode is
  `color: var(--color-text); font-weight: 600`.

### 1d — Wallet route

**Purpose.** See the balance, top up from a Cashu token, export the balance as a
token, review history.

**Layout.** Masthead + nav (Wallet active, no balance in the chrome — the balance
*is* the page), then:

- **Balance block** — `padding: 38px 44px 20px`, `display: flex;
  align-items: flex-end; gap: 26px`:
  - Amount — heading serif, weight 600, `font-size: 96px`, `line-height: .9`,
    `letter-spacing: -.02em`, tabular nums.
  - Unit stack (`padding-bottom: 12px`): "sat" at `24px` weight 600, then two tags
    `.tag.tag-accent` "Storage: persistent" and `.tag.tag-neutral`
    "mint.minibits.cash" in a `gap: 8px` row.
  - Warning, pushed right (`margin: 0 0 14px auto; max-width: 330px`):
    "Clearing this site's data destroys the balance. Export a token before you
    close the browser." — `font-size: 13px`, `var(--color-accent-2-700)`.
- **Top up / Export** — `padding: 24px 44px 40px`, `display: grid;
  grid-template-columns: 1fr 1fr; gap: 52px`:
  - **Top up**: `h3` (`22px`), sub-line "Paste a Cashu token from an allowed mint,
    denominated in sat." (`13px` muted), a `textarea.input`
    (`min-height: 96px`, monospace `12px`) holding the pasted token, an error line
    in `var(--color-accent-2-700)` ("Rejected: mint.example.com is not in the
    allowed list. The token stays here for another try."), then
    `.btn.btn-primary` "Top up". **The textarea keeps its content on rejection.**
  - **Export**: `h3`, sub-line with amount and mint, then `display: flex; gap: 20px`
    — a 126×126px QR (real QR in implementation) beside the token string
    (monospace `11.5px`, `line-height: 1.5`, `word-break: break-all`,
    `var(--color-neutral-800)`) and a `gap: 8px` button row:
    `.btn.btn-secondary` "Copy token", `.btn.btn-ghost` "Regenerate".
- **History** — `padding: 0 44px 44px`. `h3` "History" then a design-system
  `.table`. Columns: Amount (96px), When (170px), Podcast · Episode (flexible),
  Kind (120px), Status (130px). Amounts and timestamps use tabular nums; amounts
  are signed (`−10 sat`, `+512 sat`). Kind is muted text: `streaming` / `boost` /
  `top-up`. Status is a tag: `.tag-accent` "sent", `.tag-neutral` "pending",
  `.tag-accent-2` "failed".

### 1e — Boost dialog

**Purpose.** Send a one-time boost with an optional message, timestamped.

**Layout.** Over a dimmed Listen route: backdrop
`background: color-mix(in srgb, var(--color-neutral-900) 50%, transparent)`,
content behind it blurred 1px. Dialog is the design-system `.dialog`,
`width: 492px`, centred, `role="dialog"`, `aria-label="Send a boost"`. Contents,
top to bottom:

1. `.dialog-title` "Boost this episode" + a muted `13px` tabular-nums line
   "Nodesignal · Keine Angst · 00:14:07".
2. **Amount presets** — label "Amount", then `display: flex; gap: 8px` of four
   equal `flex: 1` buttons: **210 / 2 100 / 4 200 / 21 000**. Selected preset is
   `.btn` with `background: var(--color-accent-2); color: var(--color-bg)`;
   unselected are `.btn.btn-secondary`. **Presets above the balance are `disabled`**
   (45% opacity). Caption: "412 sat available — larger presets stay disabled until
   you top up." (`12px` muted).
3. **Custom amount** — `.field` with `label` "Custom amount in sat" and
   `input.input[type=number]`, kept in sync with the preset selection.
4. **Message** — `.field` with `label` "Message" and a `textarea.input`
   (`min-height: 74px`). Under it, a `12px` muted row: characters left
   ("266 characters left", limit **280**) on the left, and on the right a preview of
   the string that will be sent: `Sent as: "Strong episode 00:14:07"` — **the
   timecode is appended to the message automatically.**
5. `.dialog-actions`: `.btn.btn-secondary` "Cancel" and the send button
   (`background: var(--color-accent-2); color: var(--color-bg)`) labelled
   **"Send 210 sat"** — the label carries the live amount.

Preset amounts are Bitcoin-culture multiples of 21 and are intentional; keep them.

### 3a — Blocked: feed has no value block

Same frame and now-playing block as `1a`, with:

- Meta line ends "· not streaming".
- **Boost button is `disabled`** (45% opacity, still black ink).
- Session column replaced by:
  - Label "No payment address" in `var(--color-accent-2)` (uppercase `11px`).
  - Heading-serif statement, `font-size: 19px`, `line-height: 1.25`: "This feed
    publishes no value block."
  - Muted `13px`: "Playback works. Nothing is streamed and boosts are off until the
    show adds a nutzap or Lightning address."
  - Link "What is a value block?" — `13px`, `var(--color-accent-700)`.

Rule: **playback never depends on payment.** Audio plays; only the money stops.

### 3b — Low balance

Same frame as `1a`, with:

- Nav balance turns `var(--color-accent-2)` at `font-weight: 600` ("18 sat").
- Session column:
  - Label "Running out" in magenta.
  - Counter `38px` in `var(--color-accent-2)`: "18 sat".
  - Muted `13px`: "Streaming stops at 00:15:55. Playback continues." — the app
    computes the stop time from balance ÷ rate.
  - `.btn.btn-primary.btn-block` "Top up" linking to the Wallet route.
  - Muted `12px`: "Boosts above 18 sat are unavailable."
- Boost button stays enabled (a boost within balance is still possible).

Threshold for entering this state: fewer than ~2 minutes of streaming left.

### 3c — No nostr key

Same frame as `1a`, with:

- Nav: no balance and no npub; instead a `.btn.btn-secondary` "Connect nostr key"
  (`padding: 5px 14px; font-size: 13px`) as the last item.
- Meta line ends "· listening only".
- **Boost button is `disabled`.**
- Session column:
  - Label "Not signed in" (neutral, not magenta — nothing is wrong).
  - Heading-serif `19px`: "Connect a nostr key to pay shows."
  - Muted `13px`: "The key holds your Cashu wallet and signs each nutzap.
    Subscriptions stay on this device either way."
  - `.btn.btn-primary.btn-block` "Connect key", then `.btn.btn-ghost.btn-block`
    "Create one".

### 3d — Empty library

Same frame, then a single left-aligned block, `padding: 64px 44px 84px;
max-width: 640px`:

- Kicker "Nothing playing" — `11px`, `.1em`, uppercase, `var(--color-accent)`.
- `h1` — `font-size: 52px`, `line-height: 1.05`, `text-wrap: pretty`: "Paste a feed
  to start listening."
- Muted `15px`, `text-wrap: pretty`: "Any RSS address works. Shows that publish a
  value block are paid per minute from your wallet; the rest just play."
- Add-feed row (same control pair as `1a`), `margin-bottom: 20px`.
- A `13px` row: muted "or" + link "import an OPML file"
  (`var(--color-accent-700)`).

No transport controls, no session column, no empty-state illustration.

## Interactions and behavior

**Playback**
- `Pause` toggles to `Play`; label changes, nothing moves.
- `−15 s` / `+30 s` seek relative; clamp at 0 and duration.
- Rate select applies immediately. **Streaming rate is per wall-clock minute of
  audio played, so a 2× rate spends sats twice as fast** — the meta line's
  "streaming 10 sat/min" refers to audio minutes.
- Progress bar is seekable; the elapsed/remaining pair updates every second.

**Streaming payments**
- One nutzap per elapsed minute of playback at the show's configured rate
  (10 sat/min in the mockups).
- Sub-sat remainders accrue and carry into the next interval — surfaced as
  "6 sat pending" in `1a` and "Below 1 sat carries into the next minute."
- Session counter increments only on confirmed sends; pending is shown separately.
- Pausing playback pauses accrual.
- A failed nutzap surfaces as a `failed` tag in Wallet history and does not
  decrement the balance.

**Boost**
- The Boost button opens the `1e` dialog. Escape and Cancel close it; focus is
  trapped while open and returns to the Boost button on close.
- Preset selection writes the custom-amount field; typing in the custom field
  deselects the presets.
- Presets and the send button disable when the amount exceeds the balance.
- Message limit 280 characters, counter counts down; the timecode is appended to
  the sent string, not typed by the user.
- Sent as a `kind:9321` nutzap to the podcast's relays.

**Wallet**
- "Top up" validates the token's mint against the allowed list before accepting.
  On rejection: inline magenta error, textarea content preserved.
- "Copy token" copies to clipboard; give it a transient confirmation in the app's
  existing pattern. "Regenerate" mints a fresh export token for the full balance.
- History is newest-first.

**States**
- Interactive states are the design system's, unchanged: accent-ramp hover and
  pressed tints, `:focus-visible { outline: 2px solid var(--color-accent);
  outline-offset: 2px; }`, disabled at 45% opacity. Do not restyle them.

**Responsive**
- The mockups are desktop-only at 1280px. Below roughly 900px, collapse the
  now-playing row to a stacked column (cover above text), move the session column
  under the transport row as a full-width block, and reduce the subscriptions grid
  to one column. Nothing else changes.

## State the UI needs

- `player`: current episode ref, `playing`, `positionSeconds`, `durationSeconds`,
  `rate`.
- `payments`: `ratePerMinute`, `sessionSentSat`, `pendingSat`,
  `sessionZaps[] {amountSat, atTimecode, status: confirmed|pending|failed}`.
- `wallet`: `balanceSat`, `mint`, `storage: persistent|session`,
  `history[] {amountSat, timestamp, podcast, episode, kind, status}`.
- `identity`: `npub | null` (drives `3c`).
- `feed`: subscriptions list, and per-feed `recipient: nostr | lightning | none`
  (drives `3a` and the "no recipient" tag).
- `boostDialog`: `open`, `amountSat`, `message`.

Derived: streaming-stop time (`balance / rate`), preset affordability, characters
remaining, whether the low-balance state applies.

## Design tokens (Broadsheet)

Take these from the design system's `styles.css` (copied into
`mockups/_ds/broadsheet-.../styles.css`) rather than hard-coding hex where the app
already has the tokens.

**Colors**
- Ground `--color-bg` `#f3f2f2` · surface `--color-surface` `#eae9e9`
- Ink `--color-text` `#201e1d`
- Cyan accent `--color-accent` `#0088b0`; ramp `700` `#006786`, `800` `#004961`
  (paragraph-size text in the accent must use `700` or darker)
- Magenta accent `--color-accent-2` `#d6006c`; ramp `700` `#aa0b56`
- Divider `--color-divider` = `color-mix(in srgb, #201e1d 16%, transparent)`
- Neutrals used: `300` `#d7d3d3`, `400` `#bab6b6`, `500` `#9b9797`, `600` `#7d7979`,
  `700` `#605d5d`, `800` `#444141`, `900` `#2d2b2b`

**Type** — Source Serif 4 for both heading and body; heading weight 600. Serif is
the UI chrome too; **no sans-serif anywhere.** Body 15px/1.55. Sizes used in these
screens: 96 (wallet balance), 52 / 46 (page and episode titles), 38 (session
counter), 26 / 24 / 22 / 19 (section and show headings), 15 / 14 / 13 / 12 / 11.5 /
11 (body, meta, captions, kickers). Tabular numerals on every sat amount and
timecode. Uppercase `11px` with `.1em` tracking is the standard label.

**Spacing** — `--space-1..8` = 5 / 10 / 15 / 20 / 30 / 40px. Page padding 44px,
block gaps 26–52px. Do not tighten the scale.

**Radius** — `--radius-sm` 1px, `--radius-md` 2px, `--radius-lg` 4px. Effectively
square; buttons and inputs are `2px`.

**Shadows** — `--shadow-sm/md/lg`. Used only for the dialog; the page itself is flat.

## Assets

- No production images. Cover art (196×196), show art (52×52 and 64×64) are grey
  `--color-neutral-300` placeholders labelled "Cover"/"Art"; real art comes from
  the feed. Apply the design system's `.halftone` dot-screen treatment to feed
  imagery.
- Icons: Phosphor, duotone weight (https://phosphoricons.com). The mockups use
  text labels rather than icons; if the app adds icons, use that set.
- The QR block in `1d` is CSS, not a real code.

## Files in this bundle

- `screenshots/` — each screen to build, captured at 2× from the mockups:
  `1a-listen.png`, `1d-wallet.png`, `1e-boost-dialog.png`,
  `3a-blocked-no-value-block.png`, `3b-low-balance.png`, `3c-no-nostr-key.png`,
  `3d-empty-library.png`. The live HTML is authoritative where they disagree.
- `mockups/Cashu Player Mockups.dc.html` — all screens. Open in a browser.
- `mockups/support.js` — runtime needed for that file to render. Reference only;
  not for the app.
- `mockups/_ds/broadsheet-.../styles.css` — the design system's token sheet and
  component layer. This is the authoritative source for every color, size and
  component style referenced above.
- `mockups/_ds/broadsheet-.../readme.md` — the design system's own guide (direction,
  do/don't, component list).

## Screen map (design → repo)

| Screen | Built from |
|---|---|
| Listen `1a` | `src/ui/feed-view.tsx`, `src/ui/player.tsx`, `src/ui/payments-panel.tsx`, `src/ui/identity-bar.tsx`, FR-07–FR-14, FR-23–FR-30 |
| Wallet `1d` | `src/ui/wallet-panel.tsx`, `src/ui/qr-code.tsx`, FR-15–FR-19 |
| Boost dialog `1e` | `src/ui/boost-dialog.tsx`, FR-28, US-06 |
| States `3a`–`3d` | same files as `1a`, plus feed recipient detection and identity state |
