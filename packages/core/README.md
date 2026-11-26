# @sub/core

Lit-based Web Components, one entry per component (`@sub/core/<name>` -> `dist/<name>.js` + `.d.ts`).
`lit` is external. Nothing registers itself: call `defineX()` (idempotent, also defines its dependencies).

## Layout

```
src/
  <component>.ts      one file per feature (e.g. tabs.ts defines sub-tabs AND sub-tab-panel + defineTabs())
  ../index.ts         barrel + defineAll()  (one line per module, keep in sync when adding a component)
  theme.ts            theme SDK: generateTheme, applyTheme, export/import, contrast check + fix, deriveTokens
  auto.ts             `import '@sub/core/auto'`: finds and applies a theme with no code (side effect)
  app.ts              <sub-app>: scoped theme + mode + messages provider
  a11y.ts             audit()/auditAll(): opt-in accessibility measurement, imported by no component
  focus.ts            moveFocus, afterNavigation, rememberFocus, focusFirstInvalid, RovingFocus, inertOutside...
  announce.ts         announce(): shared polite/assertive live regions
  shared/
    styles.ts         baseStyles, focusStyles (double-ring), focusInset(), visuallyHidden, iconStyles
    form-control.ts   SubFormControl: form-associated base (value, validity, label/hint/error, required marker)
    text-field.ts     SubTextField: shared by input / textarea / autocomplete
    children.ts       ChildrenController: enhance plain light-DOM children (li, a, sub-option)
    messages.ts       every user-facing string (translate with setMessages)
    config.ts         configure({ requiredIndicator })
    icons.ts          Material Symbols registry + renderIcon; material-icons.ts is GENERATED
    position.ts       placeNear(): flip/clamp for tooltip and menu
    listbox.ts        option panel for select/autocomplete: Popup (top-layer popover, light dismiss, sheet on phones), filterItems, listboxStyles
    utils.ts          define, emit, warn, uid, focusElement, debounce
scripts/gen-icons.mjs icons.config.json -> src/shared/material-icons.ts
scripts/gen-theme-defaults.mjs  tokens CSS -> src/shared/theme-defaults.ts (default colours, component tokens, density) AND packages/tokens/density.css
bin/sub-theme.mjs     CLI: init | check | fix | build
tests/theme.test.mjs  `pnpm --filter @sub/core test:unit` (node --test)
```

## Conventions (follow them when adding a component)

1. **Native first.** Render the native element (`button`, `a`, `input`, `fieldset`, `dialog`...). ARIA only to fill gaps.
2. **Self-contained shadow DOM.** `aria-labelledby`/`for`/`aria-controls` cannot cross shadow roots, so a component
   renders label and control in the same root. Where the content must stay in the light DOM (tab panels), name it
   with a string (`aria-label`), not an id.
3. **Form controls extend `SubFormControl`**: implement `formValue`, `control`, `resetValue`, `restoreValue` and
   `nativeControl` (or `customFlags`). You get FormData, reset, restore, `fieldset[disabled]`, validity, blur
   validation, friendly messages and the label/hint/error markup.
4. **Declarative children** (`<sub-option>`, `<li>`, `<a>`) are read with `ChildrenController`; authors write valid HTML that
   still reads without JavaScript.
5. **Styling only through tokens.** Add `packages/tokens/components/<name>.css` (annotated `@length|@number|@color`),
   reference `var(--sub-<name>-*)` in the component, no fallbacks, no hard-coded values. `pnpm check` fails on any
   undefined or unused token.
6. **Focus.** Use `focusStyles` (outer + inner ring). For items flush against a clipping container use `focusInset('selector')`.
   Never `outline: none`.
7. **Text** goes in `shared/messages.ts`. **Events** are `sub-<name>` custom events (bubbling and composed unless noted);
   native-like ones (`change`, `input`, `close`) keep their names.
8. **Dev warnings** (`warn()`) for broken accessibility contracts: missing label, vague link text, `<sub-icon-button>` without `label`.
9. **Motion** uses `--sub-duration-*` (0ms under `prefers-reduced-motion`); long-running animation must slow down, not stop.
10. **Derived tokens.** If a component token points at a shared one (`--sub-x-radius: var(--sub-control-radius)`), a theme scoped
    to a subtree must re-declare it: `deriveTokens()` handles the ones listed in `theme-defaults.ts` (rerun `pnpm --filter @sub/core theme-defaults`).
11. **Density.** Size targets from `--sub-control-min-size` / `--sub-target-size` and spacing from `--sub-control-padding-*`,
    `--sub-control-gap`, `--sub-surface-padding` and the compact density follows for free (`density.css` is generated).
12. **Corners.** Controls use `--sub-control-radius`; panels `--sub-surface-radius`; items inside panels `--sub-item-radius`
    (the last two are capped so a pill-shaped theme never makes a menu or an option a circle).
13. **Motion.** Use `--sub-duration-*` / `--sub-motion-distance` (never literal ms); popups use `popupMotion()`; the
    durations are 0 under `data-sub-motion="off"` and reduced motion.
14. **A host with `container-type: inline-size` must also set `inline-size: 100%`** or it collapses to 0px inside a flex row.
15. Panels (select, autocomplete, menu, popover) live in the top layer (`popover`): nothing clips them, Esc stacks above a dialog.
16. Add a demo in `playground/src/demos/<name>.ts` (with `keyboard`, `props`, `tokens`) and a keyboard spec when it has behaviour.
    The audit and axe specs pick the demo up automatically.

## Build

`vite build` creates one ES module per `src/*.ts` (shared code lands in `dist/chunks/`) and `tsc` emits declarations.
`exports` uses a wildcard, so a new `src/foo.ts` is importable as `@sub/core/foo` without touching `package.json`.
