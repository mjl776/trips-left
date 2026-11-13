# Trips Left v4 — Implementation plan

Revised 2026-11-13 against `main` (`22fab91`). Most of v4 is already built, so this plan lists only the remaining gaps against `v4-redesign-design-spec.md`. Code not named here already matches the spec; leave it alone (`frontend/CLAUDE.md` checklist item 7).

Each step is one PR. Follow `frontend/CLAUDE.md`: CSS Modules only, no Tailwind, no new dependencies, no new hex values, no invented endpoints.

**Done means:**
- `npm run lint` and `npm run test:run` pass.
- Component tests are updated.
- The screen works at 375, 768 and 1280px, and with the keyboard only.
- Empty states render.
- No new `console.log`.

**Every step that touches a page** also moves that page onto the spec's container: `max-width: 1240px` with `28px` side padding. Each page currently sets its own width.

---

## Decisions needed

| # | Question | Blocks |
|---|---|---|
| D1 | Do K and DEF show point totals or `—`? The code and `frontend/CLAUDE.md` say they're scored; the spec says they aren't. | Steps 4 and 5 (footnote and player-card copy) |
| D2 | Season label: the code uses `CURRENT_SEASON = 2026`, the spec says 2025. Recommend keeping the code and updating the spec. | — |
| D3 | Where can magenta appear? `frontend/CLAUDE.md` limits it to the worst player and drop actions. The code also uses it for swap mode and the close-button hover. The spec adds low point totals. | Step 4 |
| D8 | Keep the Trade Simulator nav link? The spec's switcher has only three items. Recommend keeping it. | Step 2 |

## Fast follows (after step 6)

| Item | Needs |
|---|---|
| Fill top scorers (create step 2) | A bulk stats endpoint, since `GET /view-player` is one request per player |
| Points in add-player rows | The same endpoint |
| Replace an occupied slot in one step through `POST /add-drop-player` | Product sign-off; the endpoint exists |
| Add-to-bench button: keep or remove | A decision, then an update to `frontend/CLAUDE.md` to match |
| Best-player position rank ("WR rank #4 of 41") | `GET /lineup-insights` to return a rank for `bestPlayer` |

Until these ship, keep the current behavior.

---

## Step 1 — Tokens and focus ring · done

Branch `v4-t1-tokens-and-fonts`. Adds `--highlight`, `--on-accent` and a global `:focus-visible` ring. Three inputs still suppress the ring; steps 3 and 5 fix them.

## Step 2 — Navbar, Home, About

**Files:** `Navbar/`, `Icons/LogoIcon.tsx`, `Homepage/`, `AboutPageComponent/`. Spec §4, §5, §7.1, §7.8. Mostly CSS and copy.

**Navbar and logo**
- Replace `LogoIcon` with the 24×24 goalpost (stroke 2). Drop its Tailwind `h-7 w-7` default.
- Wordmark: one line, `TRIPS LEFT`, 700, 15px, +0.06em, with `LEFT` in cyan.
- Give the home link the accessible name "Trips Left, home".
- Nav: 74px min-height, with a pill switcher. The active pill is a cyan fill with `--on-accent` text.
- **Bug:** "Lineup" isn't active on `/lineup-management/*` routes. Match on prefix.
- Remove the unused `Fragment` import.

**Home**
- Headline: "Your worst starter is costing you the week."
- Hero: up to 72px, 700, −0.04em. Keep the `clamp()`.
- Make the Best Player tag `--highlight`.
- Primary button text uses `--on-accent`, and hover changes the background instead of the opacity.
- Padding: 118px top, 120px bottom.

**About**
- Spacing and type pass only. Keep the copy.

**Accept:**
- The uprights look centered at 24px and at 48px.
- "Lineup" is active on every nested route.
- Yellow appears only on the Best tag.

## Step 3 — My lineups and the create flow

**Files:** `LineupBox/`, `CreateLineupBox/`, `LineupManagementLandingPage/`, `CreateLeagueStep/`, `CreateLineupFlow/`, `CreateLineupSlotsPanel/`. Spec §7.2–7.4.

**My lineups** (CSS only)
- Card radius 1rem, down from 1.125rem.
- Check the 46px `+` ring and the grid against the prototype.

**Create, step 1**
- Remove the endpoint-name pills.
- Add a `<label>` to the Sleeper ID input.
- Announce the hint and error line (`aria-live`, `aria-describedby`).
- Restore the input's focus ring.
- Chip copy: `10 × BN`.

**Create, step 2**
- **Bug:** Change league loses the lineup name, because the panel unmounts. Lift `name` into `CreateLineupFlow`.
- Add a `<label>` to the name input and restore its focus ring.

**Accept:**
- With no saved lineups, only the create tile shows.
- An invalid ID never hits the network, and the error is announced.
- Change league keeps the name.

## Step 4 — View lineup and verdicts

**Files:** `Labels/SquareLabel/`, `LineupSlot/`, `LineupInsightsPanel/`, `BenchRow/`, `ViewLineupPanel/`, `frontend/CLAUDE.md`. Spec §6, §7.5. **Depends on** D1 and D3.

- **Best Player is yellow.** Add a `"highlight"` tone to `SquareLabel`. Use it for the slot badge and the insights card (tag, value, 35% ring, 8% tint). Update the `SquareLabel` rule in `frontend/CLAUDE.md`.
- Give the dark-horse and worst-player cards the same ring and tint, in their own colors.
- Fix "91TH": use `lib/formatOrdinal.ts`, which exists but is unused.
- Add the footnote card under insights. Its copy depends on D1.
- Bench dark-horse row: 40% cyan border.
- Remove-button `aria-label`: "Remove {name} from {slot}".
- Fix the existing `exhaustive-deps` warning in `ViewLineupPanel`.

**Accept:**
- All four null/empty combinations of the insights render.
- Yellow appears only on Best Player.
- Ordinals are correct (1st, 2nd, 3rd, 11th, 91st).

## Step 5 — Overlay accessibility

**Files:** `AddPlayerOverlay/`, `IndividualPlayerCardOverlay/`. Spec §7.6, §7.7, §8. This step is mostly logic.

- Add `role="dialog"`, `aria-modal` and `aria-labelledby` to both overlays.
- Trap focus inside the modal and return it to the opener on close.
- Add a `<label>` to the search field and restore its focus ring.
- Add-player title: "Fill the {slot} slot".
- Player-card percentile: use `formatOrdinal`.
- K/DEF note copy depends on D1.

**Accept:**
- Tab never leaves the modal.
- Esc closes it.
- Focus returns to the opener.

## Step 6 — QA pass

- Walk every screen with the keyboard.
- Test at 375, 768, 1280 and 1920px.
- Check the 45% captions against WCAG AA and raise any that fail.
- Compare each screen with the prototype, and list intentional deviations in the PR. Known so far: already-rostered players are hidden in the add list instead of disabled, and the mobile nav menu is kept.

---

## Open product questions

1. Point-color thresholds: fixed cut-offs or position-relative? (See D3.)
2. Should My lineups cards show best and worst names, or only the total?
3. Is a light theme in scope?
4. Final About copy.
