# @sub/tokens

Design tokens as plain CSS custom properties, in tiers so each decision lives in exactly one place.

| File | Tier | Contains |
|---|---|---|
| `palette.css` | 1 | Raw colours, no meaning. Never referenced by components |
| `primitives.css` | 1 | Type scale (1.25), spacing (4/8px grid), radius/border scales, icon sizes, easing, z-index |
| `semantic.css` | 2 | Focus indicator, target size, shared **control** and **surface** shape, form rhythm, page widths, motion |
| `themes/light.css`, `themes/dark.css` | 2 | Semantic colours (same names in both). Dark is not an inversion |
| `components/<name>.css` | 3 | `--sub-<component>-<property>`, one file per component; defaults point at tiers 1-2 |
| `fonts.css` | - | Optional self-hosted Atkinson Hyperlegible Next + Mono |
| `theme.css` | - | Everything above in order (the usual import) |

## Component token annotations

Every component token ends with a trailing comment the playground reads to build its controls:

```css
--sub-tabs-indicator-width: 4px; /* @length 0 10 px | Thickness of the selected-tab bar */
```

`@length min max unit`, `@number min max`, `@color`. Add a token here and it appears in the playground.

## Checks

```
pnpm --filter @sub/tokens check         WCAG contrast of every pair, light + dark (57 pairs x 2)
pnpm --filter @sub/tokens check:usage   every var(--sub-*) used in @sub/core is defined; no dead component tokens
```

## Defaults

Raw and compliant: square corners, 2px borders, 44px targets, text 4.5:1, control boundaries 3:1, and a
focus indicator made of two rings (a dark inner ring + a yellow outer ring) so it contrasts on light and
dark backgrounds and survives forced-colors mode. Motion tokens drop to `0ms` under
`prefers-reduced-motion`.

Typeface: **Atkinson Hyperlegible Next** (Braille Institute; unambiguous letterforms, OFL) with
**Atkinson Hyperlegible Mono** for code. Falls back to the system UI font.
