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
| `@sub/react` `@sub/vue` `@sub/angular` `@sub/preact` `@sub/solid` `@sub/svelte` | The same components for each framework, **generated** from the components' contract (see [Frameworks](#frameworks)) |
| [`examples`](examples) | Every component rendered by each of the six frameworks (a grid to look at and to test) |

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

## Frameworks

The Web Components are the only implementation. Their contract (properties, attributes, typed events, methods)
is `packages/core/custom-elements.json`, produced on every build by the Custom Elements Manifest analyzer; a
plugin there fails the build if a component fires an event its JSDoc does not declare (`@fires {Type} name`).
`scripts/gen-frameworks.mjs` turns that contract into one package per framework: **never edit `generated/`**,
change the component or the generator (`pnpm generate`). Why this approach: [docs/integracion-frameworks.md](docs/integracion-frameworks.md).

| Package | You write |
|---|---|
| `@sub/react` | `<SubSelect label="Plan" options={opts} onSubSelect={(e) => e.detail.value} ref={el} />` (React 18 and 19), `useSubNavigate(navigate)` |
| `@sub/vue` | `<SubSelect v-model="plan" label="Plan" @sub-select="..." />`, `app.use(subRouter(router))` |
| `@sub/angular` | `imports: [SUB]`, then `<sub-select [options]="opts" (sub-select)="..." [(ngModel)]="plan">` (or `formControl`) |
| `@sub/preact`, `@sub/solid`, `@sub/svelte` | `<sub-select>` itself, fully typed (`onsub-select`, `on:sub-select`), and `registerAll()` |

Every control is form-associated, so a native `<form>` submits it in any framework. Links that components draw
inside their shadow root (button `href`, link, pagination, menu, breadcrumbs, nav menu) go through your router:
`configure({ navigate: (href) => router.push(href) })`, or cancel the `sub-navigate` event; a framework link
component you put inside breadcrumbs or a nav menu keeps its own click handler.

`examples/<framework>` renders every component through its package, plus two-way binding, a form and a router
(`pnpm build`, then `pnpm --filter @sub/example-vue dev`: React 4301, Preact 4302, Solid 4303, Vue 4304, Svelte 4305,
Angular 4306). `pnpm test:frameworks` runs one conformance suite against the six. `@sub/angular` ships TypeScript
sources compiled by the app's Angular compiler; publishing it needs ng-packagr (partial compilation).

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

## Moving around the playground

Pages change in place (`playground/src/router.ts`): no reload, the header and the component list stay put, a short
crossfade (none with reduced motion), Back/Forward restore each page's scroll position, and focus lands on the new
`h1` with an announcement (`afterNavigation()`), as after a real page load. Only the page you open is downloaded:
the navigation reads an index built from the demo files (`virtual:demo-index`), and pointing at a link starts
loading its page. Ctrl/Cmd+K finds a component, every page has its **Code** (with Copy) and Previous / Next links.

## The example in every framework

A page's **Code** block has one tab per framework: HTML, React, Vue, Angular, Svelte, Solid and Preact, each with its
logo (`playground/src/code/`). The demo's markup is the single source: it is parsed once and written by each
framework's rules, with the names of the real packages read from the same contract as the generator
(`scripts/contract.mjs`, served to the page as `virtual:sub-elements`). So React gets `<SubButton>`, `className`,
`style={{ … }}` and camelCase props; Vue gets `<script setup>` and `:max="5"`; Angular a standalone component with the
directives; Svelte, Solid and Preact the elements with `defineButton()`. Attributes become the property each
framework sets (`static` is `inline`) and numbers stay numbers (`max={5}`). The code is coloured like an editor (light
and dark, every colour at least 4.5:1), the tabs follow the WAI-ARIA pattern (arrows, Home/End), Copy copies the
tab you are reading, and the framework you pick is remembered. `pnpm test:snippets` reads every example of every
page and compiles it with each framework's own compiler (tsc, ngc with `strictTemplates`, Svelte, Vue).

## Responsive and mobile

Every component reflows to 320px without page-level horizontal scrolling (a Playwright spec checks all of them),
and on a 375px touch phone every overlay stays inside the screen (another one opens each of them).

Below 40rem of screen (one breakpoint for the whole library, `shared/sheet.ts`):

| Component | On a phone |
|---|---|
| `<sub-dialog>`, `<sub-modal>`, `<sub-drawer>` | cover the screen (`mobile="sheet"` for a bottom sheet, `mobile="dialog"` to keep the box); full-width buttons above the home indicator |
| `<sub-select>`, `<sub-tree-select>`, `<sub-cascader>` | full-screen sheet with the field's name and Done |
| `<sub-date-picker>` | the calendar is a bottom sheet (field name + Done, full-size days); focus returns to the button, so no keyboard pops up; digits alone (`20261126`) are a date, since phone number pads have no "-" |
| `<sub-menu>`, `<sub-dropdown>` | action sheet docked to the bottom edge, full-width items within thumb reach |
| `<sub-tour>`, `<sub-toaster>`, `<sub-float-button>` | docked to the bottom edge, clear of the notch and the home indicator (`env(safe-area-inset-*)`) |

Tapping the dimmed page around a sheet closes it and never activates what is underneath.

Components that are containers answer to their **own** width (container queries), so they adapt in a sidebar too:
`<sub-layout>` folds its navigation behind a **Menu** button below 40rem (Esc or following a link folds it again),
`<sub-carousel>` shows "2 / 5" in one row of controls below 24rem and changes slide with a swipe (the buttons do the
same, WCAG 2.5.1), `<sub-splitter>` stacks its panes below 24rem, `<sub-transfer>` stacks its lists with full-width
buttons whose arrows point up and down, `<sub-descriptions>` stacks label over value. Touch screens are not offered
"drag and drop" (`<sub-upload>`). Wide tables scroll inside their own keyboard-focusable region.

## Popups stay attached

Everything that hangs from a component (menu and dropdown, date picker calendar, popover and popconfirm, the option
panels of select / autocomplete / mentions / tree select / cascader, tooltip, the tour's highlight and step) is
attached to what it came from (`shared/position.ts`): it follows every scroll of the page or of any scroll container
in the same frame (never lagging), a resize, the phone keyboard and pinch zoom; it moves above its anchor when there
is no room below (and keeps its side while it still fits, so it does not jump while you scroll); when it fits on
neither side it keeps to the larger room and scrolls inside; and when its anchor leaves the screen, it leaves with
it instead of sticking to the edge. `data-placement="top|bottom"` on the popup says where it went. The tour's highlight
and step glide only to a NEW step (placed by where the highlight ends, not where its glide is); while you scroll
they stay pinned to the target, animations on or off.

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
`pnpm --filter @sub/core icons`, commit `src/shared/material-icons.ts`. Names in `directional` are mirrored right-to-left.

Each icon is its own export, so an app ships only the icons of the components it uses (an app with
`<sub-breadcrumbs>` and `<sub-input>` went from 25.2 to 13.6 kB gzip). Only `<sub-icon>` and `<sub-icon-button>`, which
take a name at runtime, include the whole set. A unit test keeps it that way.

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
pnpm test:frameworks   build + the same conformance suite against the six framework example apps
pnpm test:snippets     build + every Code example of every page, compiled by its framework's own compiler
```

Playwright needs a browser: `SUB_BROWSER_CHANNEL=chrome pnpm test` uses the installed Chrome. `SUB_FIREFOX=1` adds the
cross-browser specs (what you see follows the state) in the installed Firefox; `SUB_FIREFOX=all` runs every spec there.
