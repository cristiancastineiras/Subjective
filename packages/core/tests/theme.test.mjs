// Unit tests for the theme SDK (pure functions). Run after a build: pnpm --filter @sub/core test:unit
import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  checkThemeContrast,
  contrastRatio,
  exportTheme,
  fixThemeContrast,
  generateTheme,
  importTheme,
  themePresets,
  themeToCss,
  validateTheme,
} from '../dist/theme.js'

test('contrast maths matches the WCAG reference values', () => {
  assert.equal(Math.round(contrastRatio('#000000', '#ffffff')), 21)
  assert.ok(contrastRatio('#777777', '#ffffff') < 4.5)
  assert.ok(contrastRatio('#595959', '#ffffff') >= 7)
})

test('every preset is generated WCAG-compliant (light and dark)', () => {
  for (const preset of themePresets()) assert.deepEqual(checkThemeContrast(preset), [], preset.name)
})

test('any brand colour yields a compliant theme (the generator repairs it)', () => {
  for (const primary of ['#ffee00', '#ff00aa', '#00ffcc', '#112233', '#ffffff', '#000000', '#808080']) {
    assert.deepEqual(checkThemeContrast(generateTheme({ primary, tinted: true })), [], primary)
  }
})

test('a theme with a failing pair is reported and then fixed', () => {
  const bad = { $schema: 'sub-theme/1', name: 'bad', colors: { light: { muted: '#bbbbbb' } } }
  const issues = checkThemeContrast(bad)
  assert.ok(issues.some((i) => i.foreground === 'muted'))
  assert.deepEqual(checkThemeContrast(fixThemeContrast(bad)), [])
})

test('themeToCss writes shape + light on :root and dark on [data-sub-theme="dark"]', () => {
  const css = themeToCss(generateTheme({ name: 'Ocean', primary: '#0e7490', radius: 0.5, borderWidth: 1 }))
  assert.match(css, /:root \{[^}]*--sub-control-radius: 0\.5rem;/s)
  assert.match(css, /--sub-control-border-width: 1px;/)
  assert.match(css, /\[data-sub-theme="dark"\] \{[^}]*--sub-color-accent:/s)
  const scoped = themeToCss(generateTheme({ primary: '#0e7490' }), { selector: '.app' })
  assert.match(scoped, /^\.app \{/m)
})

test('validate / import / export round-trip and reject garbage with helpful messages', () => {
  const theme = generateTheme({ name: 'Round', primary: '#6d28d9', radius: 0.75 })
  assert.deepEqual(importTheme(exportTheme(theme)), theme)
  assert.equal(validateTheme({ $schema: 'nope' }).ok, false)
  const bad = validateTheme({ $schema: 'sub-theme/1', name: 'x', colors: { light: { accent: 'red', nope: '#fff' } } })
  assert.equal(bad.ok, false)
  assert.ok(bad.errors.some((e) => e.includes('accent')) && bad.errors.some((e) => e.includes('nope')))
  assert.throws(() => importTheme('{ not json'), /valid JSON/)
})

test('deriveTokens re-declares component tokens built on a changed shared token (scoped themes)', async () => {
  const { deriveTokens } = await import('../dist/theme.js')
  const derived = deriveTokens(['--sub-control-radius'])
  assert.equal(derived['--sub-button-radius'], 'var(--sub-control-radius)')
  assert.equal(derived['--sub-field-radius'], 'var(--sub-control-radius)')
  assert.equal(derived['--sub-button-min-size'], undefined, 'unrelated tokens are not touched')
  // chains: field tokens feed input-number
  assert.ok('--sub-input-number-button-width' in deriveTokens(['--sub-control-min-size']))
  // user-set tokens are never overwritten
  assert.equal(deriveTokens(['--sub-control-radius'], new Set(['--sub-button-radius']))['--sub-button-radius'], undefined)
  // a scoped CSS export carries them
  const { themeToCss, generateTheme } = await import('../dist/theme.js')
  assert.match(themeToCss(generateTheme({ primary: '#0e7490', radius: 0.5 }), { selector: '.app' }), /--sub-button-radius: var\(--sub-control-radius\)/)
})
