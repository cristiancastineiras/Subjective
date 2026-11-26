// Verifies WCAG contrast for every token pair that components rely on.
// Run: pnpm --filter @sub/tokens check   (exits 1 on any failure)
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const read = (f) => readFileSync(fileURLToPath(new URL(`../${f}`, import.meta.url)), 'utf8')

/** Collect `--name: value;` declarations of a stylesheet */
function declarations(css) {
  const out = {}
  for (const [, k, v] of css.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) out[k] = v.trim()
  return out
}

const palette = declarations(read('palette.css'))
const themes = {
  light: { ...palette, ...declarations(read('themes/light.css')) },
  dark: { ...palette, ...declarations(read('themes/light.css')), ...declarations(read('themes/dark.css')) },
}

function resolve(vars, name, seen = new Set()) {
  let v = vars[name]
  if (v === undefined || seen.has(name)) throw new Error(`Unknown token ${name}`)
  seen.add(name)
  const m = v.match(/^var\((--[\w-]+)\)$/)
  return m ? resolve(vars, m[1], seen) : v
}

function luminance(hex) {
  const n = parseInt(hex.slice(1), 16)
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) => {
    c /= 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

const ratio = (a, b) => {
  const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p)
  return (x + 0.05) / (y + 0.05)
}

const TEXT = 4.5 // normal text
const UI = 3 // UI components, focus rings, borders, disabled text (SubUX target)

const surfaces = ['page', 'surface', 'surface-raised', 'surface-sunken', 'surface-hover']
const base = ['page', 'surface', 'surface-raised']
const pairs = [
  ...surfaces.flatMap((s) => [
    ['text', s, TEXT],
    ['muted', s, TEXT],
  ]),
  ...base.flatMap((s) => [
    ['border', s, UI],
    ['accent', s, TEXT], // tertiary button text
    ['link', s, TEXT],
    ['link-hover', s, TEXT],
    ['link-visited', s, TEXT],
    ['danger-solid', s, UI],
  ]),
  ['on-accent', 'accent', TEXT],
  ['on-accent', 'accent-hover', TEXT],
  ['on-accent', 'accent-active', TEXT],
  ['on-accent-subtle', 'accent-subtle', TEXT],
  ['text', 'accent-subtle', TEXT],
  ['accent', 'accent-subtle', UI],
  ['on-disabled', 'disabled', UI],
  ['on-danger-solid', 'danger-solid', TEXT],
  ['on-danger-solid', 'danger-solid-hover', TEXT],
  ...['danger', 'success', 'warning', 'info'].flatMap((s) => [
    [s, 'surface', TEXT],
    [s, 'surface-raised', TEXT],
    [s, `${s}-subtle`, TEXT],
    ['text', `${s}-subtle`, TEXT],
    ['border', `${s}-subtle`, UI],
  ]),
]

let failures = 0
const fail = (theme, msg) => {
  failures++
  console.error(`FAIL [${theme}] ${msg}`)
}
for (const [theme, vars] of Object.entries(themes)) {
  const c = (n) => resolve(vars, `--sub-color-${n}`)
  for (const [fg, bg, min] of pairs) {
    const r = ratio(c(fg), c(bg))
    if (r < min) fail(theme, `${fg} on ${bg}: ${r.toFixed(2)}:1 (needs ${min}:1)`)
  }
  // Focus indicator = two adjacent rings: they must contrast with each other AND at least one with each surface
  const rings = ratio(c('focus'), c('focus-inner'))
  if (rings < UI) fail(theme, `focus rings vs each other: ${rings.toFixed(2)}:1 (needs ${UI}:1)`)
  for (const s of [...base, 'accent-subtle', 'danger-subtle']) {
    const best = Math.max(ratio(c('focus'), c(s)), ratio(c('focus-inner'), c(s)))
    if (best < UI) fail(theme, `focus indicator on ${s}: ${best.toFixed(2)}:1 (needs ${UI}:1)`)
  }
}

if (failures) {
  console.error(`\n${failures} contrast failure(s).`)
  process.exit(1)
}
console.log(`Contrast OK: ${pairs.length} pairs x ${Object.keys(themes).length} themes.`)
