# Toast Notifications — PRD

Revision 2: the toast is a corner rectangle (bottom-right), replacing the
centered square of revision 1. Design reference: `Toast Corner.html`.

## Context

The frontend reports the outcome of every mutation with a native `alert()`.
There are six, and no other notification mechanism exists (no toast, modal or
snackbar component, and no UI library):

| Where | When | Message |
|---|---|---|
| `CreateLineupSlotsPanel/index.tsx:94` | `POST /create-lineup` succeeded | "Lineup created!" |
| `CreateLineupSlotsPanel/index.tsx:97` | create-lineup failed | "Failed to create lineup" |
| `CreateLeagueStep/index.tsx:28` | `POST /create-mock-league` failed | "Failed to create mock league" |
| `ViewLineupPanel/index.tsx:183` | add-player failed | "Failed to add player" |
| `ViewLineupPanel/index.tsx:201` | remove-player failed | "Failed to remove player" |
| `ViewLineupPanel/index.tsx:220` | swap-players failed | "Failed to swap players" |

Problems with this:

- **It blocks.** After a lineup is created, `router.push("/lineup-management")`
  cannot run until the user dismisses the browser dialog.
- **It's off-brand.** The dialog is browser chrome: none of the design tokens
  in `frontend/app/globals.css` apply and it shows the page origin.
- **It's not reusable or accessible in a way we control.** There is no shared
  way to say "this worked" or "this failed", so each new feature would add
  another `alert()`.
- **The create-lineup error hides the reason.** `CreateLineupSlotsPanel:82`
  throws a hardcoded "Failed to create lineup", although `frontend/CLAUDE.md`
  says a 400 from `POST /create-lineup` "is a real user error, surface the
  message".

## What changed from revision 1

| | Revision 1 | Revision 2 |
|---|---|---|
| Shape | 12rem square, centered stack | 22rem rectangle, icon left and text right |
| Position | centered, `bottom: 15vh` | bottom-right, `1.5rem` inset |
| Narrow (< 640px) | 12rem square, `bottom: 1.5rem` | full width, `1rem` gutters |
| Radius | 1.5rem | 1rem |
| Message clamp | 3 lines | 2 lines |
| Entrance | `translateY(0.5rem)` | `translateX(0.75rem)`, or `translateY` below 640px |
| Icon | bare glyph | glyph in a 2.25rem tinted circle |

Context, problems, non-goals and Part B are unchanged.

## Goals

1. One reusable toast that any client component can trigger with a single call,
   in a `success` or `error` variant.
2. A rounded rectangle pinned to the bottom-right of the viewport, built only
   from existing design tokens.
3. Creating a lineup shows the toast and navigates immediately; the toast stays
   visible across the route change.
4. No `alert()` calls remain in `frontend/`.

## Non-goals

- A toast library (`sonner`, `react-hot-toast`, etc.). The frontend's
  no-new-dependencies rule applies; this is hand-rolled.
- Stacking or queueing several toasts. One toast is shown at a time (see A3).
- Action buttons inside a toast (Undo, Retry). Retry already lives on the
  inline error cards.
- Replacing the inline error cards in `ViewLineupPanel` and
  `LineupInsightsPanel`. Those report a *load* failure in place; toasts report
  the result of a *user action*.
- Confirmation dialogs. Nothing uses `confirm()` today.
- A magenta error style. Error toasts are neutral muted, consistent with the
  existing error cards and the CLAUDE.md magenta rule.

---

## Part A: The toast (frontend)

### A1. `Toast` presentational component: `frontend/components/Toast/`
- `index.tsx` + `page.module.css` + `index.test.tsx`, default export,
  `const Toast: FC<ToastProps>`. It holds no state; it renders what it is
  given.
- Props:
  ```ts
  type ToastVariant = "success" | "error";

  type ToastProps = {
    variant: ToastVariant;   // explicit, no default (same rule as SquareLabel's tone)
    title: string;           // "Lineup created"
    message?: string;        // one short supporting line
    onDismiss: () => void;
  };
  ```
- Markup: icon on the left, title and optional message on the right, close
  button in the top-right corner.
  ```tsx
  <div className={`${styles.toast} ${styles[variant]}`}>
    <span className={styles.icon}>{variant === "success" ? <CheckIcon/> : <AlertIcon/>}</span>
    <div className={styles.body}>
      <p className={styles.title}>{title}</p>
      {message && <p className={styles.message}>{message}</p>}
    </div>
    <button className={styles.close} aria-label="Dismiss" onClick={onDismiss}>×</button>
  </div>
  ```
  The close glyph is `×` (U+00D7), the same character the system's IconButton
  uses.
- `page.module.css`. Every value is a token or a `color-mix` of one; no new hex
  values, and no magenta on the error variant.
  ```css
  .toast{position:relative;display:flex;align-items:flex-start;gap:.875rem;
    width:22rem;max-width:calc(100vw - 2rem);box-sizing:border-box;
    padding:1rem 3rem 1rem 1.125rem;border-radius:1rem;border:1px solid;
    background:var(--background);
    box-shadow:0 1.5rem 3rem color-mix(in srgb, black 35%, transparent);
    pointer-events:auto;animation:enter .15s ease both}
  .success{border-color:color-mix(in srgb, var(--foreground) 15%, transparent)}
  .error{border-color:color-mix(in srgb, var(--secondary-text-color) 15%, transparent)}

  .icon{flex-shrink:0;width:2.25rem;height:2.25rem;border-radius:50%;
    display:flex;align-items:center;justify-content:center}
  .success .icon{color:var(--foreground);
    background:color-mix(in srgb, var(--foreground) 8%, transparent)}
  .error .icon{color:color-mix(in srgb, var(--secondary-text-color) 60%, transparent);
    background:color-mix(in srgb, var(--secondary-text-color) 5%, transparent)}

  .body{display:grid;gap:.2rem;min-width:0;padding-top:.45rem}
  .body:has(.message){padding-top:.1rem}
  .title{margin:0;font-size:1rem;font-weight:600;line-height:1.25;
    letter-spacing:-0.015em;color:var(--secondary-text-color)}
  .message{margin:0;font-size:.875rem;line-height:1.4;
    color:color-mix(in srgb, var(--secondary-text-color) 60%, transparent);
    display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}

  .close{position:absolute;top:.625rem;right:.625rem;width:2rem;height:2rem;
    border:none;border-radius:50%;background:transparent;cursor:pointer;
    color:color-mix(in srgb, var(--foreground) 60%, transparent);font-size:1.125rem;
    transition:background .15s ease}
  .close:hover{background:color-mix(in srgb, var(--foreground) 8%, transparent)}

  @keyframes enter{from{opacity:0;transform:translateX(.75rem)}to{opacity:1;transform:none}}
  @keyframes enterUp{from{opacity:0;transform:translateY(.5rem)}to{opacity:1;transform:none}}
  @media (max-width:639px){.toast{width:100%;max-width:none;animation-name:enterUp}}
  @media (prefers-reduced-motion:reduce){.toast{animation:none}}
  ```
- The `padding-top` offsets centre a one-line title on the 2.25rem icon, and
  align a title plus message to the icon's top.
- The message clamps to two lines so a long server message can't stretch the
  toast.
- Icons are inline SVG, 20×20, `stroke="currentColor"`, `aria-hidden="true"`:
  - **Check:** `M5 12.5l4.5 4.5L19 7.5`, stroke width 2.
  - **Alert:** a circle with `r=9`, plus a vertical stroke and a dot, stroke
    width 1.75.
- Motion: the toast slides in from the right (from below under `640px`) over
  `0.15s ease`. Only `opacity` and `transform` animate, and the animation is
  disabled under `prefers-reduced-motion: reduce`, as `Skeleton` does. There is
  no exit animation in this release; dismissal removes the toast immediately.

### A2. Viewport container
The provider (A3) owns this container in `ToastProvider/page.module.css`:

```css
.viewport{position:fixed;right:1.5rem;bottom:1.5rem;z-index:60;pointer-events:none}
@media (max-width:639px){.viewport{left:1rem;right:1rem;bottom:1rem}}
```

- `z-index: 60` puts the toast above the Navbar and both overlays, which use
  `50`.
- `pointer-events: none` on the container means it never blocks clicks;
  `.toast` re-enables pointer events for itself.
- Bottom-right keeps the toast clear of the centered content column
  (64–72rem), so it doesn't cover the lineup it's reporting on.
- Below `640px` the toast goes full width with `1rem` gutters.

### A3. `ToastProvider` and `useToast`: `frontend/components/ToastProvider/`
- `index.tsx` (`"use client"`) + `page.module.css` + `index.test.tsx`. This is
  the first React context in the codebase; it is built-in React, not a state
  library.
- Exports the default `ToastProvider` and a named `useToast` hook:
  ```ts
  type ShowToastOptions = {
    variant: ToastVariant;
    title: string;
    message?: string;
    duration?: number;       // ms; defaults below
  };

  const { showToast, dismissToast } = useToast();
  ```
- State is `{ toast: (ShowToastOptions & { id: number }) | null }`. `id`
  (`Date.now()`) is the `key` on `<Toast>`, so replacing a toast remounts it
  and replays the entrance.
- `useToast` throws if called outside the provider, so a missing provider fails
  loudly in tests rather than silently dropping messages.
- **One toast at a time.** `showToast` replaces whatever is showing and restarts
  the timer. Every current trigger is a single user action.
- **Auto-dismiss:** 4000 ms for `success`, 6000 ms for `error`, unless
  `duration` is passed. Use a single `setTimeout` held in a `ref`:
  - Clear it on replace, on dismiss and on unmount.
  - `onMouseEnter` and `onFocus` on the toast clear it.
  - `onMouseLeave` restarts it at the full duration, and so does `onBlur` when
    focus leaves the toast (check `relatedTarget`).
- **Manual dismiss:** the close button, or `Escape`. Attach a `keydown`
  listener on `window` in an effect while a toast is showing, and remove it in
  cleanup.
- **Live regions:** always render both regions inside `.viewport`, and render
  the toast into the region that matches its variant:
  ```tsx
  <div className={styles.viewport}>
    <div role="status" aria-live="polite">{toast?.variant === "success" && el}</div>
    <div role="alert" aria-live="assertive">{toast?.variant === "error" && el}</div>
  </div>
  ```
  Both regions must exist before content arrives, or screen readers won't
  announce it. The toast never moves focus.

### A4. Mounting
`frontend/app/layout.tsx` stays a server component and wraps the body content:
```tsx
<body className="min-h-full flex flex-col">
  <ToastProvider>
    <Navbar />
    {children}
  </ToastProvider>
</body>
```
Because the provider lives in the root layout, a toast shown just before
`router.push` survives the navigation. Read `node_modules/next/dist/docs/` on
client providers in the root layout before touching this file (per
`frontend/AGENTS.md`).

---

## Part B: Replace the alerts

### B1. Create-lineup success and failure
`frontend/components/CreateLineupSlotsPanel/index.tsx`
- Success (L94): `showToast({ variant: "success", title: "Lineup created",
  message: roster.name })`, then `router.push("/lineup-management")` straight
  away. The toast is visible on the landing page.
- Failure (L97): `showToast({ variant: "error", title: "Couldn't create
  lineup", message })`. No navigation, as today.
- Surface the server's reason: when the response is not ok (L81), read the
  `message` field from the JSON error body and use it as `message`, falling
  back to "Something went wrong". Check the error shape against the controller
  in `backend/src/` before writing this; do not guess it. NestJS can return
  `message` as a string or a `string[]`, so join arrays with `"; "`.

### B2. Create-mock-league failure
`frontend/components/CreateLeagueStep/index.tsx:28` becomes
`showToast({ variant: "error", title: "Couldn't create mock league" })`.

### B3. Lineup mutation failures
`frontend/components/ViewLineupPanel/index.tsx:183, 201, 220` become error
toasts titled "Couldn't add player", "Couldn't remove player" and "Couldn't
swap players". The surrounding logic (`isMutating`, reloads) is unchanged.

### B4. Docs and guard rail
- `frontend/CLAUDE.md`, Component conventions: add a line saying user-action
  feedback goes through `useToast` and `alert()` is not used; note that toasts
  sit at `z-index: 60`, above the `50` used by Navbar and overlays.
- Enable ESLint's `no-alert` for the frontend once no calls remain, so they
  can't come back.

---

## Rollout order (reviewable chunks)

1. `Toast` component and its test (A1). Nothing uses it yet.
2. `ToastProvider` + `useToast` with the viewport, its test, and the root
   layout mount (A2–A4).
3. Create flow: `CreateLineupSlotsPanel` and `CreateLeagueStep`, with their
   tests updated (B1, B2).
4. `ViewLineupPanel` and its test (B3).
5. CLAUDE.md update and `no-alert` (B4).

## Testing / verification

**Frontend** (`npm run lint` and `npm run test:run` in `frontend/`)

- `components/Toast/index.test.tsx`
  - renders title and message; omits the message element when none is passed;
  - `success` and `error` apply their own variant class;
  - clicking "Dismiss" calls `onDismiss`.
- `components/ToastProvider/index.test.tsx` (uses `vi.useFakeTimers()`)
  - `showToast` renders a success toast inside `role="status"` and an error
    toast inside `role="alert"`;
  - the toast disappears after 4000 ms (success) and 6000 ms (error);
  - a second `showToast` replaces the first and restarts the timer;
  - hovering pauses the timer, leaving restarts it;
  - `Escape` and the close button dismiss it;
  - `useToast` outside the provider throws.
- `components/CreateLineupSlotsPanel/index.test.tsx` (L227-238, L267-273):
  drop the `window.alert` spies, render inside `ToastProvider`, and assert the
  "Lineup created" toast appears **and** `pushMock` was called with
  `/lineup-management`; on failure, assert the error toast shows the server
  message and `pushMock` was not called.
- `components/CreateLeagueStep/index.test.tsx` (L72-78) and
  `components/ViewLineupPanel/index.test.tsx` (L192-199, L458): replace the
  `alert` stubs with assertions on the error toast.
- `components/CreateLineupFlow/index.test.tsx` mocks both children and needs no
  change.

**End-to-end manual check** (`npm run dev`)

- Create a lineup: no browser dialog; the page goes to `/lineup-management`
  at once and a "Lineup created" toast slides in from the right at the
  bottom-right corner, then disappears after about four seconds.
- Hover the toast: it stays until the pointer leaves.
- Narrow the window below `640px`: the toast goes full width with `1rem`
  gutters and slides up instead.
- Force a failure (stop the backend, then add/remove/swap and create): each
  shows a neutral, non-magenta error toast and the page stays usable.
- Open `AddPlayerOverlay` and trigger a toast: the toast shows above it.
- With a screen reader on, success is announced politely and errors
  immediately; focus does not move.
- With "reduce motion" on, the toast appears without the slide.
- `grep -rn "alert(" frontend --include=*.tsx --exclude-dir=node_modules`
  returns only test or role references, no calls.

## Future work

- Exit animation on dismiss.
- An `info` variant and an optional action button (Undo after a drop).
- A countdown hairline (explored in the design file).
- A queue or stack, if a feature ever fires several toasts in quick
  succession.
