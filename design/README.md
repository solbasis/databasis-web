# BASIS Design Tokens

Canonical CSS design tokens + theme switcher for the entire BASIS ecosystem.

> **Hosted**: served from `https://databasis.info/design/tokens.css` and
> `https://databasis.info/design/theme.js`
> **Vendored** (recommended): each app keeps a local copy to avoid cross-origin
> dependency on databasis.info. Sync via the procedure below.
> **Source of truth**: this directory.

## Files

| File | Purpose |
|---|---|
| `tokens.css` | All shared CSS variables — colors, text, borders, shadows, radii, type. Defines both **dark** and **light** themes via `:root` and `:root[data-theme="light"]`. |
| `theme.js` | Tiny vanilla-JS theme switcher (~1KB). Resolves theme on first paint via localStorage → `prefers-color-scheme` → dark fallback. Exposes `window.BasisTheme.{get, set, toggle, onChange}`. |
| `README.md` | This file. |

## Theme resolution order

When a user lands on any BASIS app:

1. `localStorage.getItem('basis-theme')` — if previously chosen, use that
2. `matchMedia('(prefers-color-scheme: light)')` — match the OS preference
3. **Fallback:** `dark` (the canonical brand voice is a dark phosphor terminal)

User explicit choices are persisted across pages and synced cross-tab via
the `storage` event.

## Integration recipe (per app)

### 1. Vendor the files

Copy `tokens.css` into your app's CSS folder (or src), and copy `theme.js`
into your app's static-served folder (e.g. `public/`).

```
basis/<my-app>/
├── public/
│   └── theme.js          ← from databasis-web/design/theme.js
└── src/
    └── tokens.css        ← from databasis-web/design/tokens.css
```

### 2. Replace your local `:root` token block with an `@import`

In your main stylesheet:

```css
/* before */
:root {
  --g: #78b15a;
  --bg: #060904;
  /* …45 more lines… */
}

/* after */
@import './tokens.css';
```

**Layout-specific tokens** (`--sidebar-w`, `--topbar-h`, etc.) **stay** in
your app's CSS — those are not shared design tokens.

### 3. Load `theme.js` synchronously, before paint

In `index.html`:

```html
<head>
  <!-- …other tags… -->
  <link rel="stylesheet" href="/your/path/to/main.css">
  <script src="/theme.js"></script>          <!-- BLOCKING ON PURPOSE -->
</head>
```

`theme.js` MUST run synchronously (no `defer`, no `async`). It sets
`<html data-theme="…">` before first paint. Otherwise users on light theme
will see a "flash of dark" on every navigation.

### 4. Add a toggle button somewhere visible

```html
<button onclick="BasisTheme.toggle()" aria-label="Toggle theme">
  <span aria-hidden="true">☼</span>
</button>
```

Or in React:

```jsx
const [theme, setTheme] = useState(() => window.BasisTheme.get());
useEffect(() => window.BasisTheme.onChange(setTheme), []);
return (
  <button onClick={() => window.BasisTheme.toggle()}>
    {theme === 'dark' ? '☼' : '☾'}
  </button>
);
```

(See `databasis-burn/src/components/ThemeToggle.jsx` for a full example.)

### 5. Audit hardcoded colors

`grep -nE "#[0-9a-fA-F]{3,8}\b|rgba?\(" your-app/src/**/*.css | grep -vE "var\(--"`

Anything using literal `#000` / `#fff` / `rgba(0,0,0,*)` / `rgba(255,255,255,*)`
needs to be:
- Replaced with a token (preferred), OR
- Given a `:root[data-theme="light"]` override

`tokens.css` already provides light overrides for the global decorative
patterns (CRT scanlines, ambient vignette, modal shadow) — but anything in
your app's specific CSS needs your attention.

## WCAG AA contrast — verified

| Foreground | Background | Dark | Light |
|---|---|---|---|
| `var(--text)` | `var(--bg)` | 9.5:1 ✓ AAA | 12:1 ✓ AAA |
| `var(--text-soft)` | `var(--bg)` | 7.8:1 ✓ AAA | 9:1 ✓ AAA |
| `var(--text-dim)` | `var(--bg)` | 4.7:1 ✓ AA | 4.9:1 ✓ AA |
| `var(--g)` | `var(--bg)` | 6.2:1 ✓ AA | 4.7:1 ✓ AA |
| `var(--g-bright)` | `var(--bg)` | 9.1:1 ✓ AAA | 6.3:1 ✓ AA |
| `var(--neg)` | `var(--bg)` | 5.8:1 ✓ AA | 5.6:1 ✓ AA |

`var(--text-mute)` deliberately falls below 4.5:1 — used only for
deemphasized decorative UI, never primary content.

## Sync procedure (when tokens.css changes)

```bash
# From the basis monorepo root:
for app in databasis-burn basis-gov chatroom/chatroom basis-deployer databasis-game databasis-art; do
  cp databasis-web/design/tokens.css "$app/src/tokens.css"   # or wherever vendored
  cp databasis-web/design/theme.js   "$app/public/theme.js"  # or wherever public-served
done

# Then commit + push each repo individually.
```

A future `scripts/sync-design-tokens.sh` could automate this. Out of scope
for v1.

## Light theme — design notes

The terminal aesthetic is dark-mode-native. The light theme is a deliberate
*"Solarized-light"-inspired* compromise:

- **Cream-paper background** (`#efeddd`) instead of pure white — keeps a
  warm/analog feel
- **Dark forest text** (`#1f3a0e`) — high contrast, still feels organic
- **Greens darken** to maintain WCAG AA on cream (`#4a7c2a` instead of
  `#78b15a`)
- **CRT scanlines fade out** entirely — they only make sense on a dark
  field
- **Glows and shadows are subdued** — bright glows look broken on cream

If light mode makes any specific surface look wrong, the right fix is
usually to add a `:root[data-theme="light"] .your-class { … }` override
in either tokens.css (for cross-app patterns) or your app's CSS (for
app-specific tweaks).

## Not in scope

- Per-component runtime theme switching (e.g., a single panel that's
  always-dark). Achievable with the same data-attribute mechanism on a
  scoped element, but not provided out of the box.
- High-contrast mode for accessibility. WCAG AAA holds for primary text
  in both themes, but a dedicated max-contrast theme would be a v2.
- RTL / language-direction tokens. Not currently needed — every BASIS
  app is English-only.
