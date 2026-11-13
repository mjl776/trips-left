# Trips Left v4 — Design spec

Source of truth for visuals and behavior of the redesign. The prototype in `reference/Trips Left v4.dc.html` is a single-file React mock with inline styles and a fake player pool: read it for exact values, but build with the repo's CSS Modules, real endpoints, and the conventions in `CLAUDE.md`.

Where this spec and the prototype disagree, this spec wins. Where this spec and `CLAUDE.md` disagree on repo conventions, `CLAUDE.md` wins.

---

## 1. What changed from the current app

| Area | Current app | v4 |
|---|---|---|
| Home | Centered title | Left-aligned hero, two CTAs, three verdict cards |
| Lineups landing | List | Card grid with a dashed "create" tile first |
| Create flow | One panel | Two steps: attach a league, then build the roster |
| View lineup | Slots list | Starters card + bench grid + sticky insights column |
| Verdict colors | Cyan / magenta | Best = yellow, Dark Horse = cyan, Worst = magenta |
| Logo | — | Goalpost mark + wordmark (see §4) |
| Numerals | Space Grotesk | Orbitron for points, ranks, totals |

Palette is unchanged except one addition: `--highlight` (`#f0c31c`).

---

## 2. Tokens

Existing (do not change): `--background #0B1D3A`, `--foreground #00E5FF`, `--tertiary-color #E84393`, `--secondary-text-color #FFFFFF`, `--medium-bold 600`.

New: `--highlight #f0c31c`, `--on-accent #06253C`. Derived variables are in `tokens/design-tokens.css`. **Never add another hex.**

### Surface and text recipes

| Role | Recipe |
|---|---|
| Page | `--background` |
| Card / row / input | `color-mix(--foreground 3%)` fill, `1px` border `--foreground 15%` |
| Hover | fill `--foreground 8%` (7–8% in rows) |
| Hairline (nav edge, table rules) | `--foreground 10%` |
| Control edge (inputs, outline buttons) | `--foreground 30%` |
| Body text | `--secondary-text-color` |
| Secondary text | `--secondary-text-color 62%` |
| Captions, meta, micro labels | `--secondary-text-color 45%` |
| Primary button | fill `--foreground`, text `--on-accent` |
| Secondary button | fill `--foreground 10%`, border `--foreground 22%`, white text |
| Modal | solid `--background`, border `--foreground 25%`, scrim `--background 82%` |

### Radii

`1rem` cards, rows, modals. `0.75rem` buttons, inputs, banners, chips (`0.5rem` for small slot chips). `999px` pills and the nav switcher. `50%` icon buttons.

### Flat rules

No gradients, glows, backdrop blur, hover lift, or hover scale. Transitions: `0.15s ease` on background/border/color only. The only motion in the prototype is a one-time fade/rise when a screen or banner mounts (`opacity` 0→1, up to 8px translate, 160–600ms). Respect `prefers-reduced-motion`.

---

## 3. Typography

Space Grotesk for everything; Orbitron for numbers only (both already loaded in `app/layout.tsx`).

| Role | Size / weight / tracking | Color |
|---|---|---|
| Home hero | 72px (clamp down on mobile) / 700 / −0.04em, line-height 1.0 | white |
| Create step title | 42px / 700 / −0.035em | white |
| Lineup title | 38px / 700 / −0.03em | white |
| Lead paragraph | 19px / 400, line-height 1.6 | white 62% |
| Card title | 19–20px / 600 / −0.02em | white |
| Body | 14–16px / 400, line-height 1.6 | white 62% |
| Eyebrow | 12px / 600 / +0.18em, uppercase | cyan |
| Verdict tag | 11–12px / 600 / +0.14em, uppercase | verdict color |
| Micro label | 10–11px / 600 / +0.06–0.18em, uppercase | white 45% |
| Numerals | Orbitron 500–600: lineup total 34px, saved-card points 24px, row points 15px, stat tiles 20px | see §6 |

Numerals are right-aligned in rows.

---

## 4. Logo

Top-left of the sticky nav, `gap: 12px`, links home.

- **Mark**: 24×24 goalpost. Crossbar from x=1 to x=23 at y=8; uprights at x=1 and x=23 rising from the crossbar to y=1; stem at x=12 from y=8 to y=23. Stroke 2, round caps, `currentColor` (cyan). Both uprights are **centered on the ends of the crossbar** — this was a bug in an earlier mock, do not regress it.
- **Wordmark**: `TRIPS LEFT`, Space Grotesk 700, 15px, letter-spacing +0.06em. `LEFT` is cyan, `TRIPS` is white.
- Assets: `assets/goalpost-mark.svg`, `assets/GoalpostMark.tsx`.
- Give the home link an accessible name ("Trips Left, home").

---

## 5. Layout

- Page container: `max-width: 1240px`, `28px` side padding, centered.
- Nav: sticky, min-height `74px`, solid `--background`, bottom hairline. Right side: pill switcher with Home / Lineup / About; active item = cyan fill with `--on-accent` text, inactive = white 65%.
- Vertical padding: home `118px 0 120px`; create `56px 0 110px`; view lineup `48px 0 110px`.
- Responsive: all multi-column areas are `auto-fit` grids or wrapping flex rows. Home cards `minmax(260px, 1fr)`, gap 14. League cards `minmax(320px, 1fr)`, gap 16. Sidebars (insights, league summary) are `flex: 1 1 300–320px; max-width 380–400px; position: sticky; top: 100px` and drop below the main column when the viewport is narrow. The prototype was only checked at desktop widths: verify 375px and 768px yourself.

---

## 6. Color semantics

### Verdicts

| Verdict | Color | Where |
|---|---|---|
| Best Player | `--highlight` yellow | Tag, value, ring `35%`, tint `8%` on the insight card; the home card tag |
| Dark Horse | `--foreground` cyan | Same four places; percentile bar fill |
| Worst Player | `--tertiary-color` magenta | Same four places; plus the row rail below |

Worst-player row: 2px magenta rail on the left edge, tint `6%`. Bench dark-horse border: cyan `40%`.

Empty states for any verdict are a neutral card (white-on-navy hairline, muted name text, `—` value). Never red, never an error style.

### Magenta is allowed in exactly these places

Worst Player verdict and row, drop actions (hover), the swap banner and swap-target row tint, low point totals, the Sleeper-ID validation error, and the "no advanced metrics" note on the player card. Nowhere else.

### Points color (prototype heuristic)

Total ≥ 200 cyan · 120–199 white · < 120 magenta · K, DEF and empty slots white 45%. These cut-offs were chosen for the mock pool, not derived from data. Confirm with the product owner or switch to a position-relative rule before shipping. Always show the number as text; color is never the only signal.

---

## 7. Screens

### 7.1 Home (`/`)

Eyebrow-less hero. Headline: **"Your worst starter is costing you the week."** Lead: "Build a lineup against your real league's scoring, then read the three verdicts that matter: your best player, your worst, and the dark horse whose advanced metrics already sit in the top 20% of his position."

CTAs: primary **Create a lineup** → `/lineup-management/create`; secondary **My lineups** → `/lineup-management`. Below, three cards (Best Player, Worst Player, Dark Horse), each: colored tag, title, body.

| Tag | Title | Body |
|---|---|---|
| BEST PLAYER | Who is actually carrying you | Every rostered player scored against your league's own scoring settings — not a generic average. |
| WORST PLAYER | The starter to cut loose | Kickers and defenses are held out, so the verdict lands on a player you can actually replace. |
| DARK HORSE | Top-20% metrics, quiet box score | A rostered player whose season EPA already clears the top-20% cutoff at his position. |

### 7.2 My lineups (`/lineup-management`)

Eyebrow `SAVED ON THIS DEVICE`, count label ("3 lineups" / "1 lineup"). Grid: first cell is a dashed "Create a lineup" tile (`+` in a 46px ring); then one card per `localStorage.savedLineups` entry: source tag (mock / Sleeper), name, id and date, starter total in Orbitron 24px with a label, and `Open →`. Whole card is the click target. Empty state: only the create tile.

### 7.3 Create — step 1 of 2: "Attach a league" (`/lineup-management/create`)

Eyebrow `STEP 1 OF 2`. Two cards side by side:

- **Mock league** — copy: "Sleeper's default scoring and a standard roster. Nothing to configure — settings are fixed once the league is created." Roster chips (`QB RB RB WR WR TE FLEX FLEX K DEF` in cyan outline, plus `10 × BN` in muted). Button **Create mock league** → `POST /create-mock-league`.
- **Import from Sleeper** — copy: "Pulls the real scoring settings and roster positions from your league. Read-only — nothing is written back to Sleeper." Input "Sleeper league ID" + **Import** → `POST /import-sleeper-league/:leagueId`. Client check first: `^[0-9]{6,}$`, else inline error in magenta: "That doesn't look like a Sleeper league ID — it's a long numeric string." Server errors use the same slot. Clear the error on edit.

Each card also shows its endpoint name as a small muted pill; **drop the pills in production** (they are annotations for developers).

### 7.4 Create — step 2 of 2: "Build the lineup"

Left: name input ("Name your lineup", 18px/600) + **Fill top scorers** (outline button). Below, STARTERS card with ten fixed-height rows (`4.5rem`): `[slot chip 48×44] [player name + meta] [points] [32px round +/− button]`. Empty row = muted "Empty" text and `+`; clicking the row opens the add overlay. Filled row: click opens the player card; `−` removes from the draft.

Right (sticky): "League attached" card — rows for Source, League ID, Season, Teams, Scoring, Slots — a hint line, the create button, and **Change league** (ghost). Hint copy differs for mock vs imported leagues.

Create button: disabled and muted until all ten starters are filled; label states progress ("7 of 10 slots filled"); enabled label **Create lineup** (cyan fill). Submit → `POST /create-lineup`; show server 400 messages verbatim.

### 7.5 View lineup (`/lineup-management/view-lineup`)

Header: eyebrow = league name (cyan), title = lineup name, right-aligned total in Orbitron 34px cyan with label "2025 SEASON TOTALS" (use `PROJECTION_BASE_SEASON`).

Swap banner (only in swap mode): magenta border `40%` + tint `10%`, text "Swapping {name} — pick a starter to swap him with.", **Cancel** pill. Eligible starter rows get a magenta `9%` tint.

Starters card (same rows as §7.4 plus verdict labels, rendered through `Labels/SquareLabel` before the points). Bench: grid below, `38px | 1fr | auto` rows with position, name + meta (team · pts), and `SWAP` (cyan pill) and `DROP` (muted pill, magenta on hover). The bench dark-horse row has a cyan 40% border.

Right (sticky, 320–400px): **Lineup insights** card with three verdict cards (§6), then a footnote card: "Points are realized 2025 totals recomputed under this league's scoring settings, not a forward projection. Kicker and defense stat lines aren't scored yet, so those slots read as —." Each verdict card states evidence: Best = position rank of count; Worst = lowest scorer, K/DEF excluded; Dark Horse = EPA value, the top-20% threshold, position rank, percentile bar and label (e.g. `WR RANK #4 OF 41 · 91ST PERCENTILE`).

### 7.6 Add-player overlay

Modal, max-width 560px, scrim. Header eyebrow + title: "Fill the {slot} slot" or "Replace {name}" (occupied → add & drop via `POST /add-drop-player`). Search field, then an eligible-only list (position eligibility via `lib/playerEligibility.ts`), each row: position, name, team, points, already-rostered rows disabled. Close `×` 32px ring (magenta on hover). Esc closes; focus is trapped and restored.

### 7.7 Player card overlay

Modal, max-width 520px. Header: name, position · team, close. Three stat tiles (Fantasy pts, Games, Position rank) in a hairline grid. Below: percentile bars for `RANKABLE_STATS` only. K/DEF show the magenta-tinted note: "No advanced metrics are ranked for {pos}s — the stats table has no field-goal or points-allowed columns yet, so kickers and defenses have no rankable production."

### 7.8 About

Eyebrow, title, two paragraphs (product + the formation the name comes from), three cards. Copy stays as in the repo unless product supplies new text.

---

## 8. Accessibility

- Real `<button>` and `<a>`; never click handlers on `div`. The prototype uses clickable rows and cards — implement them as a row container with a primary button/link and separate buttons for secondary actions, so tab order matches the visual order.
- Visible focus: 2px solid `--foreground` outline, 2px offset, on every interactive element. Do not remove default focus styles.
- Contrast: white 45% on navy is for short captions only (≥ 11px, not paragraphs). Verify the muted text against WCAG AA before shipping; raise to 55–60% where it fails.
- Verdicts and magenta states always carry a word ("Worst player", "Drop", an error sentence). Never color alone.
- Icon buttons need `aria-label` ("Remove {name} from {slot}", "Add a player to {slot}", "Close").
- Modals: `role="dialog"`, `aria-modal`, labelled by the title, focus trap, Esc to close, return focus to the opener.
- Respect `prefers-reduced-motion`.

---

## 9. Known gaps in the prototype

- Point-color thresholds are heuristic (§6).
- Mobile and tablet layouts were not reviewed.
- The percentile label in the prototype appends "TH" to every number ("91TH"). Use correct ordinals (1st, 2nd, 3rd, 11th, 91st).
- Pills showing endpoint names are annotations, not product UI.
- About page copy is unchanged placeholder structure.
- Dark mode only. There is no light theme.
