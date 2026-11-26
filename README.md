# SUB

Sub is a framework-neutral library of Web Components built for accessibility, simplicity and reusability.
Components ship **raw**: square, high contrast, big targets, a double-ring focus indicator, native elements
first. Nothing is decorative by default, everything is configurable, and the library can measure how
accessible each component is **as you configure it**.

## Packages

| Package | What |
|---|---|
| [`@sub/tokens`](packages/tokens) | Design tokens in three tiers (palette -> semantic -> component), light/dark themes, Atkinson Hyperlegible fonts |
| [`@sub/core`](packages/core) | The components (Lit), shared building blocks, `audit()`, focus/announce utilities, Material Symbols icons |
| [`playground`](playground) | **Studio** (a complete app + theme editor), then one page per component: live example on the left, **Configure** and **Accessibility** on the right |

## Quick start

```ts
import '@sub/tokens/fonts.css'   // optional, self-hosted Atkinson Hyperlegible
import '@sub/tokens/theme.css'   // palette + scales + light/dark + component tokens
import { defineButton } from '@sub/core/button'

defineButton()
```

```html
<sub-button>Save changes</sub-button>
```

Every component has its own entry (`@sub/core/<name>`), so you only ship what you use. `@sub/core` also
exports everything and `defineAll()`. Set `data-sub-theme="dark"` on any ancestor for the dark theme.

## Principles

- **Native first.** `button`, `a`, `input`, `fieldset/legend`, `dialog`, `nav`, headings. ARIA only to fill gaps.
- **Raw by default, W3C-compliant if you change nothing.** Defaults meet WCAG 2.2 AA (and AAA target size, 3:1 focus).
- **Measured, not claimed.** `audit()` reads computed styles, real sizes and a real focus ring.
- **Tokens, not overrides.** Every visual property of every component is a CSS custom property.
- **Keyboard 100%.** Each component documents its keys; Playwright tests press them.

## Components (80+)

| Group | Components |
|---|---|
| Actions | `sub-button`, `sub-button-group`, `sub-icon-button`, `sub-float-button`, `sub-link`, `sub-menu`, `sub-dropdown` |
| Forms | `sub-input`, `sub-input-number`, `sub-textarea`, `sub-select` (single, multiple, searchable, grouped; our own panel), `sub-tree-select`, `sub-mentions`, `sub-checkbox` (+group), `sub-radio-group`, `sub-segmented`, `sub-switch`, `sub-slider`, `sub-rate`, `sub-color-picker`, `sub-date-picker`, `sub-time-picker`, `sub-upload`, `sub-autocomplete`, `sub-cascader`, `sub-transfer`, `sub-form`, `sub-error-summary`, `sub-stepper`, `sub-option` |
| Navigation | `sub-nav-menu`, `sub-anchor`, `sub-breadcrumbs`, `sub-pagination`, `sub-load-more`, `sub-tabs`, `sub-skip-link` |
| Disclosure and overlays | `sub-accordion`, `sub-dialog`, `sub-modal` (dialog + its own button), `sub-drawer`, `sub-confirm-dialog`, `sub-popconfirm`, `sub-popover`, `sub-tooltip`, `sub-tour` |
| Feedback | `sub-alert`, `sub-toaster`, `sub-result`, `sub-empty-state`, `sub-skeleton`, `sub-spinner`, `sub-progress`, `sub-badge`, `sub-chip` |
| Data display | `sub-table` (sort, select, sub-rows), `sub-list`, `sub-tree`, `sub-descriptions`, `sub-statistic`, `sub-timeline`, `sub-calendar`, `sub-carousel`, `sub-card`, `sub-avatar`, `sub-qrcode`, `sub-watermark` |
| Content | `sub-text`, `sub-heading`, `sub-icon`, `sub-image`, `sub-truncate`, `sub-divider`, `sub-border-beam` (decorative) |
| Layout | `sub-container`, `sub-stack`, `sub-prose`, `sub-flex`, `sub-space`, `sub-grid`, `sub-masonry`, `sub-shell` (layout + sider), `sub-splitter`, `sub-affix` |
| Patterns and app | `sub-sortable-list`, `sub-chat` (+message), `sub-app` (theme and locale provider) |

Every component of the Ant Design list now exists (the library is not a port: each one follows the ARIA pattern and the SubUX guides).

## Theme SDK and Studio

The **Studio** (first page of the playground) is a complete, working application built only from these
components. Pick a preset or a primary colour on the right and the whole app re-themes live; the editor
reports WCAG contrast and can fix failing colours. Export the result and import it into any project.

```ts
import { generateTheme, applyTheme, exportTheme, importTheme, themeToCss, fixThemeContrast } from '@sub/core/theme'

const theme = generateTheme({ name: 'Ocean', primary: '#0e7490', radius: 0.5 }) // WCAG-safe by construction
applyTheme(theme)                       // inline custom properties on :root (or any element) + data-sub-theme
const json = exportTheme(theme)         // "sub-theme/1" JSON: the file you commit
applyTheme(importTheme(json))           // validates; throws readable errors
```

Zero code: add `<link rel="sub-theme" href="/sub-theme.json">` (or an inline `<script type="application/sub-theme+json">`,
`window.SUB_THEME`, or `<meta name="sub-theme" content="Ocean">` for a preset) and `import '@sub/core/auto'`; the theme is found
and applied automatically (`data-sub-mode="light|dark|auto"` on `<html>` picks the mode). `<sub-app theme-src="/sub-theme.json">`
does the same for a subtree. Build-time alternative:

```
npx sub-theme init --primary #0e7490 --radius 0.5 > sub-theme.json
npx sub-theme check sub-theme.json          # WCAG report, exit 1 on failures
npx sub-theme fix sub-theme.json            # nudges failing colours
npx sub-theme build sub-theme.json --out sub-theme.css
```

Gotcha: a custom property resolves where it is declared. Component tokens such as `--sub-button-radius`
point at `--sub-control-radius`, so a theme scoped to a subtree must re-declare the dependent ones.
`applyTheme` does it for you (`deriveTokens()`); do the same if you override shared tokens in a scope.

## The playground remembers

Dark theme and compact density are saved in the browser (`localStorage`, with a safe fallback when storage is blocked),
survive page changes and reloads, are painted before the first frame (no flash) and follow changes made in another tab.

## Responsive and mobile

Every component reflows to 320px without page-level horizontal scrolling (a Playwright spec checks all of them).
Below 40rem: `<sub-dialog>` / `<sub-modal>` cover the whole screen (`mobile="sheet"` for a bottom sheet,
`mobile="dialog"` to keep the box), `<sub-select>` opens its options as a full-screen sheet with a Done button, and
dialog buttons become full width. Wide tables scroll inside their own keyboard-focusable region.

## Corners: controls, panels, items

Three tiers, so "fully rounded" never turns a menu into a circle:

```
--sub-control-radius   buttons, fields, chips, tabs     any value, e.g. 9999px (pill)
--sub-surface-radius   dialogs, drawers, menus, popups, cards, tables   = min(control, --sub-surface-radius-max: 1rem)
--sub-item-radius      options, menu items, nav items, calendar days   = min(control, --sub-item-radius-max: 0.5rem)
```

## Animations

Popups, dialogs, drawers, sheets, sub-rows and chevrons animate with `--sub-duration-*` and `--sub-motion-distance`.
They are 0 for users who ask the OS for reduced motion and whenever you switch them off:
`<html data-sub-motion="off">`, `<sub-app motion="off">`, `configure({ motion: 'off' })`, or `"motion": "off"` in a theme.

## Density: comfortable or compact

Every component follows one switch. Comfortable (default) keeps 44px targets; compact uses 32px targets (still above
WCAG 2.5.8's 24px) with tighter padding and gaps. Text size does not shrink.

```html
<html data-sub-density="compact">             <!-- the whole page -->
<section density="compact"> ... </section>   <!-- any element: only what is inside -->
<sub-app density="compact"> ... </sub-app>
```
```ts
configure({ density: 'compact' })             // same as the attribute on <html>
generateTheme({ primary: '#0e7490', density: 'compact' })   // or "shape": { "density": "compact" } in a theme file
```
`@sub/tokens/density.css` (imported by `theme.css`, generated from the tokens) re-declares the shared tokens and every
component token derived from them, so the switch also works on a subtree.

## Tokens: three tiers

```
palette.css      raw colours (never used by components)
primitives.css   scales: type, space, radius, border, icon, easing
semantic.css     decisions: focus, target size, shared control/surface shape, form rhythm, motion
themes/*.css     semantic colours for light and dark (same names)
components/*.css one file per component: --sub-<component>-<property>, defaults point at the tiers above
```

Change a shared token (`--sub-control-radius`) and every component follows; change a component token
(`--sub-tabs-indicator-width`) and only that one does. `pnpm check` verifies WCAG contrast of every token pair
in both themes and that every `var(--sub-*)` used by a component is defined.

```css
:root {
  --sub-control-radius: 0.5rem;        /* all controls rounded */
  --sub-tabs-indicator-width: 6px;     /* thicker selected-tab bar */
  --sub-focus-width: 4px;
}
```

## Accessibility audit

```ts
import { audit, auditAll } from '@sub/core/a11y'

const report = audit(document.querySelector('sub-tabs')!)
report.score      // 0-100, weighted share of passing automated checks
report.compliant  // no failing WCAG A/AA check
report.strict     // no failing check at all (AAA and best practice too)
report.checks     // [{ id, title, ref, level, status: 'pass' | 'fail' | 'manual', detail, nodes }]
```

It measures target size, text and control-boundary contrast, a real `:focus-visible` indicator, accessible
names, ARIA validity, id references, spacing, plus per-component structure (tabs roles, dialog name...).
Meaning (is the label clear? is the order logical?) is listed as `manual`. In the playground the score moves
live as you change tokens: set `--sub-button-min-size` to `1rem` and watch the target-size check fail.

## Utilities

All of them see through open shadow roots. Each has its own entry (`@sub/core/<name>`).

```ts
import { announce } from '@sub/core/announce'
import { afterNavigation, moveFocus, rememberFocus, focusFirstInvalid, RovingFocus, trapFocus, lockScroll, isFocusable } from '@sub/core/focus'
import { Typeahead, matchesShortcut, isActivationKey, isPrintableKey, arrowDirection } from '@sub/core/keys'
import { getPreferences, watchPreferences, applyPreferences } from '@sub/core/prefs'
import { accessibleName, checkContrast, targetSize, tabOrder, lintA11y, srOnly, addAriaId, removeAriaId } from '@sub/core/a11y-tools'

announce('Settings saved')                              // polite live region (assertive for errors)
afterNavigation({ title: 'Pricing', focus: 'heading' }) // SPA route change: title + focus + announcement
const restore = rememberFocus(); /* ...overlay... */ restore()
const release = trapFocus(panel); /* ... */ release()   // Tab stays inside, focus returns on release
const unlock = lockScroll()                             // no page scroll behind an overlay (counted, no layout jump)
focusFirstInvalid(form)

new Typeahead<Item>((i) => i.label).match(items, event.key, currentIndex)   // type "mad": jumps to Madrid
matchesShortcut(event, 'Mod+K')                         // Ctrl on Windows/Linux, Cmd on Apple
getPreferences()      // { reducedMotion, contrast, colorScheme, forcedColors, pointer: 'coarse', canHover, ... }
applyPreferences()    // mirrors them as data-sub-pointer, data-sub-contrast... so your CSS can react

accessibleName(button)                                  // "Save draft": what a screen reader will say
checkContrast('#767676', '#fff')                        // { ratio: 4.54, required: 4.5, passes: true, level: 'AA' }
targetSize(button)                                      // { width, height, aa: >=24px, aaa: >=44px }
tabOrder(form)        // every Tab stop in order, with role, name and problems (positive tabindex, no name...)
lintA11y(document)    // img without alt, control without name, duplicate ids, heading jumps, dead aria-* ids...
```

The playground page "Developer tools" runs each of them live.

## Icons

Material Symbols (<https://fonts.google.com/icons>) as inline SVG, decorative by default. Only the icons in
[`packages/core/icons.config.json`](packages/core/icons.config.json) ship. Add a name, run
`pnpm --filter @sub/core icons`, commit `src/shared/material-icons.ts`.

```html
<sub-icon name="search"></sub-icon>
<sub-icon name="warning" filled label="Warning"></sub-icon>
<sub-icon-button label="Close" icon="close"></sub-icon-button>
```

## Configuration

```ts
import { configure, setMessages } from '@sub/core'
configure({ requiredIndicator: 'optional' }) // or 'required' | 'both' (pick one per product)
setMessages({ close: 'Cerrar' })             // every user-facing string lives in shared/messages.ts
```

## Scripts

```
pnpm dev        playground with live reload (components from source)
pnpm build      tokens, core (one file per component + .d.ts), playground
pnpm check      build + type-check + token contrast + token usage + theme SDK unit tests
pnpm test       build + Playwright: axe on every demo and the Studio in both themes, audit per component, keyboard specs
```

Playwright needs a browser: `SUB_BROWSER_CHANNEL=chrome pnpm test` uses the installed Chrome.
