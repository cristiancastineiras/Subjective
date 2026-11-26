/**
 * Theme SDK. A theme is plain JSON ("sub-theme/1") that you can design in the playground Studio,
 * export, commit, and load back with ONE line (or none: see `autoTheme`). Everything is checked for
 * WCAG contrast, so an exported theme cannot silently break accessibility.
 *
 *   import { applyTheme } from '@sub/core/theme'
 *   import theme from './sub-theme.json'
 *   applyTheme(theme)                      // runtime (sets CSS custom properties)
 *   // or build time: `npx sub-theme build sub-theme.json > theme.css`
 *
 * Automatic: `<link rel="sub-theme" href="/sub-theme.json">` or `<script type="application/sub-theme+json">`
 * plus `import '@sub/core/auto'` (or a `<sub-app>`) configures the page without any code.
 */
import { componentTokenDefaults, defaultColors, densityTokens, type ColorKey } from './shared/theme-defaults'

export type ThemeMode = 'light' | 'dark'
export type ThemeColors = Record<ColorKey, string>

export interface SubTheme {
  $schema: 'sub-theme/1'
  name: string
  font?: { sans?: string; mono?: string }
  shape?: {
    /** Corner radius of controls, in rem/px (e.g. "0.5rem") */
    radius?: string
    /** Corner radius of dialogs, cards, alerts (defaults to `radius`) */
    surfaceRadius?: string
    /** Control border width (e.g. "2px") */
    borderWidth?: string
    density?: 'comfortable' | 'compact'
  }
  focus?: { width?: string; innerWidth?: string; offset?: string }
  /** `off`: no animation anywhere in the theme's scope (`auto` follows the OS reduced-motion setting) */
  motion?: 'auto' | 'off'
  colors: { light?: Partial<ThemeColors>; dark?: Partial<ThemeColors> }
  /** Any other `--sub-*` custom property (component tokens included) */
  tokens?: Record<string, string>
}

export const THEME_SCHEMA = 'sub-theme/1'

// ---------------------------------------------------------------- colour maths

type RGB = [number, number, number]

function hexToRgb(hex: string): RGB {
  const h = hex.replace('#', '')
  const f = h.length === 3 ? [...h].map((c) => c + c).join('') : h
  const n = parseInt(f, 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

const rgbToHex = ([r, g, b]: RGB): string => '#' + [r, g, b].map((c) => Math.round(Math.min(255, Math.max(0, c))).toString(16).padStart(2, '0')).join('')

function rgbToHsl([r, g, b]: RGB): [number, number, number] {
  const [R, G, B] = [r / 255, g / 255, b / 255]
  const max = Math.max(R, G, B)
  const min = Math.min(R, G, B)
  const l = (max + min) / 2
  if (max === min) return [0, 0, l]
  const d = max - min
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
  const h = max === R ? (G - B) / d + (G < B ? 6 : 0) : max === G ? (B - R) / d + 2 : (R - G) / d + 4
  return [h * 60, s, l]
}

function hslToRgb(h: number, s: number, l: number): RGB {
  const k = (n: number) => (n + h / 30) % 12
  const a = s * Math.min(l, 1 - l)
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)))
  return [f(0) * 255, f(8) * 255, f(4) * 255]
}

const hsl = (h: number, s: number, l: number) => rgbToHex(hslToRgb(h, Math.min(1, Math.max(0, s)), Math.min(1, Math.max(0, l))))

function luminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex).map((c) => {
    const s = c / 255
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
  }) as RGB
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

export function contrastRatio(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number]
  return (hi + 0.05) / (lo + 0.05)
}

/** Move `fg`'s lightness away from `bg` until `min`:1 is reached (hue and saturation kept) */
function ensureContrast(fg: string, bg: string, min: number): string {
  if (contrastRatio(fg, bg) >= min) return fg
  const [h, s, l0] = rgbToHsl(hexToRgb(fg))
  const dir = luminance(bg) > 0.4 ? -1 : 1
  let l = l0
  for (let i = 0; i < 60; i++) {
    l += dir * 0.015
    const c = hsl(h, s, l)
    if (contrastRatio(c, bg) >= min || l <= 0 || l >= 1) return c
  }
  return dir < 0 ? '#000000' : '#ffffff'
}

const pickOn = (bg: string, min = 4.5): string => (contrastRatio('#ffffff', bg) >= min ? '#ffffff' : '#000000')

// ---------------------------------------------------------------- tokens <-> theme

const kebab = (s: string) => s.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)

export function resolveColors(theme: SubTheme, mode: ThemeMode): ThemeColors {
  return { ...defaultColors[mode], ...(theme.colors[mode] ?? {}) } as ThemeColors
}

/**
 * Re-declare, in the SAME scope, the component tokens that are defined as expressions over changed
 * tokens (`--sub-button-radius: var(--sub-control-radius)`). Needed whenever a shared token is overridden
 * below `:root` (scoped themes, the playground editor): custom properties resolve where they are declared.
 * `skip` = tokens the user set explicitly (never overwritten).
 */
export function deriveTokens(changed: Iterable<string>, skip: ReadonlySet<string> = new Set()): Record<string, string> {
  const known = new Set(changed)
  const out: Record<string, string> = {}
  for (let grew = true; grew; ) {
    grew = false
    for (const [name, expr] of Object.entries(componentTokenDefaults)) {
      if (known.has(name) || skip.has(name)) continue
      if ([...expr.matchAll(/var\((--[\w-]+)/g)].some((m) => known.has(m[1]!))) {
        known.add(name)
        out[name] = expr
        grew = true
      }
    }
  }
  return out
}

/** Every `--sub-color-*` custom property name (a scope's light/dark switch changes all of them) */
const COLOR_VARS = Object.keys(defaultColors.light).map((k) => `--sub-color-${kebab(k)}`)

/** The CSS custom properties a theme sets for one mode */
export function themeToTokens(theme: SubTheme, mode: ThemeMode): Record<string, string> {
  const t: Record<string, string> = {}
  const { shape, focus, font } = theme
  if (shape?.radius) {
    t['--sub-control-radius'] = shape.radius
    // panels and items never become circles, whatever the control radius (see semantic.css)
    t['--sub-item-radius'] = `min(${shape.radius}, var(--sub-item-radius-max))`
  }
  if (shape?.radius || shape?.surfaceRadius) t['--sub-surface-radius'] = shape.surfaceRadius ?? `min(${shape.radius}, var(--sub-surface-radius-max))`
  if (shape?.borderWidth) {
    t['--sub-control-border-width'] = shape.borderWidth
    t['--sub-surface-border-width'] = shape.borderWidth
  }
  if (shape?.density === 'compact') Object.assign(t, densityTokens.compact)
  if (theme.motion === 'off') {
    for (const k of ['fast', 'base', 'slow']) t[`--sub-duration-${k}`] = '0ms'
    t['--sub-motion-distance'] = '0rem'
  }
  if (focus?.width) t['--sub-focus-width'] = focus.width
  if (focus?.innerWidth) t['--sub-focus-inner-width'] = focus.innerWidth
  if (focus?.offset) t['--sub-focus-offset'] = focus.offset
  if (font?.sans) t['--sub-font-sans'] = font.sans
  if (font?.mono) t['--sub-font-mono'] = font.mono
  for (const [k, v] of Object.entries(theme.colors[mode] ?? {})) t[`--sub-color-${kebab(k)}`] = v
  for (const [k, v] of Object.entries(theme.tokens ?? {})) t[k.startsWith('--') ? k : `--sub-${k}`] = v
  return t
}

/**
 * Build-time output: paste into a stylesheet loaded AFTER `@sub/tokens/theme.css`.
 * Light values + shape on `:root` (or `selector`), dark values on `[data-sub-theme="dark"]`.
 */
export function themeToCss(theme: SubTheme, options: { selector?: string } = {}): string {
  const sel = options.selector ?? ':root'
  const dark = sel === ':root' ? '[data-sub-theme="dark"]' : `${sel}[data-sub-theme="dark"], [data-sub-theme="dark"] ${sel}`
  const block = (selector: string, tokens: Record<string, string>) =>
    `${selector} {\n${Object.entries(tokens).map(([k, v]) => `  ${k}: ${v};`).join('\n')}\n}`
  const scoped = sel !== ':root'
  const lightTokens = themeToTokens(theme, 'light')
  const light = scoped ? { ...deriveTokens([...Object.keys(lightTokens), ...COLOR_VARS], new Set(Object.keys(lightTokens))), ...lightTokens } : lightTokens
  const darkColors = Object.fromEntries(Object.entries(themeToTokens(theme, 'dark')).filter(([k]) => k.startsWith('--sub-color-')))
  const darkOnly = scoped ? { ...deriveTokens(COLOR_VARS, new Set(Object.keys(darkColors))), ...darkColors } : darkColors
  // Shared tokens are written once (light block), dark only adds its colours
  const parts = [`/* ${theme.name} - generated by @sub/core theme (sub-theme/1). Load after @sub/tokens/theme.css */`, block(sel, light)]
  if (Object.keys(darkOnly).length) parts.push(block(dark, darkOnly))
  return parts.join('\n\n') + '\n'
}

// ---------------------------------------------------------------- validation

const HEX = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/
const LENGTH = /^-?\d*\.?\d+(px|rem|em|%)$/

export function validateTheme(input: unknown): { ok: boolean; errors: string[]; theme?: SubTheme } {
  const errors: string[] = []
  const t = input as Partial<SubTheme> | null
  if (!t || typeof t !== 'object') return { ok: false, errors: ['The theme must be a JSON object.'] }
  if (t.$schema !== THEME_SCHEMA) errors.push(`"$schema" must be "${THEME_SCHEMA}".`)
  if (!t.name || typeof t.name !== 'string') errors.push('"name" is required.')
  if (!t.colors || typeof t.colors !== 'object') errors.push('"colors" is required ({ light, dark }).')
  for (const mode of ['light', 'dark'] as const) {
    for (const [k, v] of Object.entries(t.colors?.[mode] ?? {})) {
      if (!(k in defaultColors.light)) errors.push(`colors.${mode}.${k} is not a known colour token.`)
      else if (typeof v !== 'string' || !HEX.test(v)) errors.push(`colors.${mode}.${k} must be a hex colour (#rgb or #rrggbb).`)
    }
  }
  if (t.motion !== undefined && t.motion !== 'auto' && t.motion !== 'off') errors.push('"motion" must be "auto" or "off".')
  for (const [group, obj] of [['shape', t.shape], ['focus', t.focus]] as const) {
    for (const [k, v] of Object.entries(obj ?? {})) {
      if (k !== 'density' && !(typeof v === 'string' && LENGTH.test(v))) errors.push(`${group}.${k} must be a length such as "0.5rem" or "2px".`)
    }
  }
  return errors.length ? { ok: false, errors } : { ok: true, errors, theme: t as SubTheme }
}

// ---------------------------------------------------------------- contrast report + fix

/** [foreground, background, minimum ratio] - the same pairs `@sub/tokens check` verifies */
const PAIRS: Array<[ColorKey, ColorKey, number]> = [
  ...(['page', 'surface', 'surfaceRaised', 'surfaceSunken', 'surfaceHover'] as const).flatMap((s) => [['text', s, 4.5] as [ColorKey, ColorKey, number], ['muted', s, 4.5] as [ColorKey, ColorKey, number]]),
  ...(['page', 'surface', 'surfaceRaised'] as const).flatMap((s) => [
    ['border', s, 3] as [ColorKey, ColorKey, number],
    ['accent', s, 4.5] as [ColorKey, ColorKey, number],
    ['link', s, 4.5] as [ColorKey, ColorKey, number],
    ['linkHover', s, 4.5] as [ColorKey, ColorKey, number],
    ['linkVisited', s, 4.5] as [ColorKey, ColorKey, number],
    ['dangerSolid', s, 3] as [ColorKey, ColorKey, number],
  ]),
  ['onAccent', 'accent', 4.5],
  ['onAccent', 'accentHover', 4.5],
  ['onAccent', 'accentActive', 4.5],
  ['onAccentSubtle', 'accentSubtle', 4.5],
  ['text', 'accentSubtle', 4.5],
  ['onDisabled', 'disabled', 3],
  ['onDangerSolid', 'dangerSolid', 4.5],
  ['onDangerSolid', 'dangerSolidHover', 4.5],
  ...(['danger', 'success', 'warning', 'info'] as const).flatMap((s) => [
    [s, 'surface', 4.5] as [ColorKey, ColorKey, number],
    [s, `${s}Subtle` as ColorKey, 4.5] as [ColorKey, ColorKey, number],
    ['text', `${s}Subtle` as ColorKey, 4.5] as [ColorKey, ColorKey, number],
  ]),
]

export interface ContrastIssue {
  mode: ThemeMode
  foreground: ColorKey
  background: ColorKey
  ratio: number
  required: number
}

/** Every colour pair of the theme that misses WCAG 2.2 AA (4.5:1 text, 3:1 UI). Empty = compliant. */
export function checkThemeContrast(theme: SubTheme): ContrastIssue[] {
  const issues: ContrastIssue[] = []
  for (const mode of ['light', 'dark'] as const) {
    const c = resolveColors(theme, mode)
    for (const [fg, bg, required] of PAIRS) {
      const ratio = contrastRatio(c[fg], c[bg])
      if (ratio < required) issues.push({ mode, foreground: fg, background: bg, ratio: Math.round(ratio * 100) / 100, required })
    }
    // Focus indicator = two rings: they must contrast with each other, and one of them with the surface
    if (contrastRatio(c.focus, c.focusInner) < 3) issues.push({ mode, foreground: 'focus', background: 'focusInner', ratio: Math.round(contrastRatio(c.focus, c.focusInner) * 100) / 100, required: 3 })
  }
  return issues
}

/** Nudge the failing foreground colours (lightness only) until the theme passes. Returns a new theme. */
export function fixThemeContrast(theme: SubTheme): SubTheme {
  const next: SubTheme = { ...theme, colors: { light: { ...theme.colors.light }, dark: { ...theme.colors.dark } } }
  for (let pass = 0; pass < 3; pass++) {
    for (const mode of ['light', 'dark'] as const) {
      const c = resolveColors(next, mode)
      for (const [fg, bg, required] of PAIRS) {
        if (contrastRatio(c[fg], c[bg]) >= required) continue
        const fixed = ensureContrast(c[fg], c[bg], required)
        next.colors[mode]![fg] = fixed
        c[fg] = fixed
      }
    }
  }
  return next
}

// ---------------------------------------------------------------- generator

export interface ThemeSeed {
  name?: string
  /** Brand colour (hex). It is adjusted per mode so text on it passes AA. */
  primary: string
  /** Corner radius of CONTROLS in rem (0 = square) or `'full'` (pill). Panels and items are capped, never circles. */
  radius?: number | 'full'
  /** Border width in px */
  borderWidth?: number
  /** Tint the neutrals (page, surfaces, text) with the brand hue */
  tinted?: boolean
  font?: 'atkinson' | 'system' | 'serif' | 'mono'
  density?: 'comfortable' | 'compact'
  /** `off` exports a theme with every animation disabled */
  motion?: 'auto' | 'off'
}

const FONTS: Record<NonNullable<ThemeSeed['font']>, string | undefined> = {
  atkinson: undefined,
  system: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
  serif: 'Georgia, "Times New Roman", serif',
  mono: '"Atkinson Hyperlegible Mono", ui-monospace, "Cascadia Code", Consolas, monospace',
}

/** Derive a complete, WCAG-checked theme from one brand colour (the Studio's "generate" button) */
export function generateTheme(seed: ThemeSeed): SubTheme {
  const primary = HEX.test(seed.primary) ? seed.primary : '#1d70b8'
  const [h, s0] = rgbToHsl(hexToRgb(primary))
  const sat = Math.min(0.75, s0)

  // light
  const surface = '#ffffff'
  const accent = ensureContrast(primary, surface, 4.5)
  const [ah, as, al] = rgbToHsl(hexToRgb(accent))
  const lightHover = hsl(ah, as, Math.max(0.1, al - 0.1))
  const lightActive = hsl(ah, as, Math.max(0.06, al - 0.22))
  const lightSubtle = hsl(h, sat * 0.7, 0.94)
  const light: Partial<ThemeColors> = {
    accent,
    onAccent: pickOn(accent),
    accentHover: lightHover,
    accentActive: lightActive,
    accentSubtle: lightSubtle,
    onAccentSubtle: ensureContrast(lightHover, lightSubtle, 7),
    link: accent,
    linkHover: lightHover,
    info: ensureContrast(accent, '#e8f1f8', 4.5),
  }

  // dark
  const dsurface = defaultColors.dark.surfaceRaised
  const dAccent = ensureContrast(hsl(h, Math.min(0.85, s0 + 0.1), 0.72), dsurface, 4.5)
  const [dh, ds, dl] = rgbToHsl(hexToRgb(dAccent))
  const darkSubtle = hsl(h, sat * 0.55, 0.2)
  const dark: Partial<ThemeColors> = {
    accent: dAccent,
    onAccent: pickOn(dAccent),
    accentHover: hsl(dh, ds, Math.min(0.92, dl + 0.1)),
    accentActive: hsl(dh, ds * 0.5, 0.96),
    accentSubtle: darkSubtle,
    onAccentSubtle: ensureContrast(hsl(h, sat * 0.6, 0.88), darkSubtle, 7),
    link: dAccent,
    linkHover: hsl(dh, ds, Math.min(0.92, dl + 0.1)),
    info: dAccent,
  }

  if (seed.tinted) {
    Object.assign(light, {
      page: hsl(h, 0.25, 0.97),
      surfaceHover: hsl(h, 0.25, 0.94),
      surfaceSunken: hsl(h, 0.2, 0.9),
      text: hsl(h, 0.35, 0.08),
      muted: hsl(h, 0.12, 0.3),
      border: hsl(h, 0.35, 0.08),
      borderSubtle: hsl(h, 0.12, 0.72),
    })
    Object.assign(dark, {
      page: hsl(h, 0.2, 0.06),
      surface: hsl(h, 0.15, 0.11),
      surfaceRaised: hsl(h, 0.15, 0.15),
      surfaceHover: hsl(h, 0.15, 0.15),
      surfaceSunken: hsl(h, 0.2, 0.08),
      text: hsl(h, 0.2, 0.94),
      muted: hsl(h, 0.1, 0.72),
      border: hsl(h, 0.1, 0.72),
      borderSubtle: hsl(h, 0.1, 0.32),
    })
  }

  const theme: SubTheme = {
    $schema: THEME_SCHEMA,
    name: seed.name ?? 'Custom',
    shape: {
      radius: seed.radius === 'full' ? '9999px' : `${seed.radius ?? 0}rem`,
      borderWidth: `${seed.borderWidth ?? 2}px`,
      density: seed.density ?? 'comfortable',
    },
    colors: { light, dark },
  }
  if (seed.motion === 'off') theme.motion = 'off'
  const sans = seed.font ? FONTS[seed.font] : undefined
  if (sans) theme.font = { sans }
  return fixThemeContrast(theme)
}

/** Seeds of the ready-made themes (the Studio lists them; all are generated, so all are WCAG-checked) */
export const presetSeeds: ThemeSeed[] = [
  { name: 'Raw (default)', primary: '#1d70b8' },
  { name: 'Ocean', primary: '#0e7490', radius: 0.5, tinted: true },
  { name: 'Forest', primary: '#166534', radius: 0.375, tinted: true },
  { name: 'Violet', primary: '#6d28d9', radius: 0.75, tinted: true },
  { name: 'Sunset', primary: '#c2410c', radius: 0.5 },
  { name: 'Rose', primary: '#be123c', radius: 1, borderWidth: 1, tinted: true },
  { name: 'Mono', primary: '#374151', radius: 0 },
]

/** Ready-made starting points */
export function themePresets(): SubTheme[] {
  return presetSeeds.map(generateTheme)
}

// ---------------------------------------------------------------- runtime

export interface ThemeHandle {
  readonly theme: SubTheme
  readonly mode: ThemeMode
  /** `light`, `dark`, or `auto` (follow the system and keep following it) */
  setMode(mode: ThemeMode | 'auto'): void
  setTheme(theme: SubTheme): void
  /** Remove every property this handle set */
  clear(): void
}

const STORAGE_KEY = 'sub-theme'

/**
 * Apply a theme to `target` (default `<html>`) as inline custom properties and set `data-sub-theme`.
 * Scope it to a subtree by passing another element (previews, widgets, micro-frontends).
 */
export function applyTheme(theme: SubTheme, target: HTMLElement = document.documentElement, mode: ThemeMode | 'auto' = 'auto'): ThemeHandle {
  const check = validateTheme(theme)
  if (!check.ok) throw new Error(`Invalid SUB theme: ${check.errors.join(' ')}`)
  let current = theme
  let requested = mode
  let applied: string[] = []
  const media = typeof matchMedia === 'function' ? matchMedia('(prefers-color-scheme: dark)') : undefined
  const resolved = (): ThemeMode => (requested === 'auto' ? (media?.matches ? 'dark' : 'light') : requested)

  const paint = () => {
    for (const k of applied) target.style.removeProperty(k)
    const m = resolved()
    const tokens = themeToTokens(current, m)
    // Scoped: component tokens derived from shared ones must be re-declared here too
    const all = { ...deriveTokens([...Object.keys(tokens), ...COLOR_VARS], new Set(Object.keys(tokens))), ...tokens }
    for (const [k, v] of Object.entries(all)) target.style.setProperty(k, v)
    applied = Object.keys(all)
    target.dataset.subTheme = m
    target.dispatchEvent(new CustomEvent('sub-theme-change', { bubbles: true, detail: { theme: current, mode: m } }))
  }
  const onSystem = () => requested === 'auto' && paint()
  media?.addEventListener('change', onSystem)
  paint()

  return {
    get theme() {
      return current
    },
    get mode() {
      return resolved()
    },
    setMode(m) {
      requested = m
      paint()
    },
    setTheme(t) {
      current = t
      paint()
    },
    clear() {
      media?.removeEventListener('change', onSystem)
      for (const k of applied) target.style.removeProperty(k)
      applied = []
      delete target.dataset.subTheme
    },
  }
}

export function exportTheme(theme: SubTheme): string {
  return JSON.stringify(theme, null, 2) + '\n'
}

export function importTheme(json: string): SubTheme {
  let parsed: unknown
  try {
    parsed = JSON.parse(json)
  } catch {
    throw new Error('That is not valid JSON.')
  }
  const result = validateTheme(parsed)
  if (!result.ok) throw new Error(result.errors.join(' '))
  return result.theme!
}

/** Persist / restore the active theme (opt-in: the playground Studio and `data-sub-persist` use it) */
export const themeStorage = {
  save(theme: SubTheme): void {
    try {
      localStorage.setItem(STORAGE_KEY, exportTheme(theme))
    } catch {
      /* private mode: nothing to do */
    }
  },
  load(): SubTheme | null {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      return raw ? importTheme(raw) : null
    } catch {
      return null
    }
  },
  clear(): void {
    try {
      localStorage.removeItem(STORAGE_KEY)
    } catch {
      /* ignore */
    }
  },
}

/**
 * Zero-code configuration. Looks, in order, for:
 *  1. `<script type="application/sub-theme+json">{...}</script>`
 *  2. `<link rel="sub-theme" href="/sub-theme.json">`
 *  3. `window.SUB_THEME`
 *  4. the saved theme (only with `data-sub-persist` on `<html>`)
 *  5. `<meta name="sub-theme" content="Ocean">`  (a preset name)
 * Mode comes from `data-sub-mode="light|dark|auto"` on `<html>` (default auto).
 */
export async function autoTheme(target: HTMLElement = document.documentElement): Promise<ThemeHandle | null> {
  const doc = target.ownerDocument
  let theme: SubTheme | null = null
  try {
    const inline = doc.querySelector('script[type="application/sub-theme+json"]')?.textContent
    const href = doc.querySelector('link[rel="sub-theme"]')?.getAttribute('href')
    const global = (window as unknown as { SUB_THEME?: unknown }).SUB_THEME
    if (inline) theme = importTheme(inline)
    else if (href) theme = importTheme(await (await fetch(href)).text())
    else if (global) theme = importTheme(typeof global === 'string' ? global : JSON.stringify(global))
    else if (target.hasAttribute('data-sub-persist')) theme = themeStorage.load()
    else {
      const preset = doc.querySelector('meta[name="sub-theme"]')?.getAttribute('content')
      if (preset) theme = themePresets().find((p) => p.name.toLowerCase().startsWith(preset.toLowerCase())) ?? null
    }
  } catch (error) {
    console.warn(`[sub] Could not load the theme: ${(error as Error).message}`)
  }
  if (!theme) return null
  const mode = (target.getAttribute('data-sub-mode') as ThemeMode | 'auto' | null) ?? 'auto'
  return applyTheme(theme, target, mode)
}

/** The three lines a project needs, for the Studio's "Install" tab */
export function installSnippet(file = 'sub-theme.json'): string {
  return `// 1. save the exported JSON as ${file}
// 2. one of:
import theme from './${file}' with { type: 'json' }
import { applyTheme } from '@sub/core/theme'
applyTheme(theme)

// or, with no code at all:
//   <link rel="sub-theme" href="/${file}">  +  import '@sub/core/auto'
// or at build time:
//   npx sub-theme build ${file} --out theme.css`
}
