import { auditAll, summarize, type A11yReport } from '@sub/core/a11y'
import { announce } from '@sub/core/announce'
import type { SubApp } from '@sub/core/app'
import {
  checkThemeContrast,
  exportTheme,
  fixThemeContrast,
  generateTheme,
  importTheme,
  installSnippet,
  presetSeeds,
  themeStorage,
  themeToCss,
  type SubTheme,
  type ThemeSeed,
} from '@sub/core/theme'

type Ctl<T = string> = HTMLElement & { value: T; checked?: boolean }
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

export const editorHtml = /* html */ `
<h2 id="studio-editor-title">Theme editor</h2>
<p class="cfg-hint">Design a theme, watch the whole application change, then export it. Every theme is generated with WCAG-checked contrast.</p>

<section class="ed-block" aria-labelledby="ed-presets-title">
  <h3 id="ed-presets-title">Presets</h3>
  <div class="ed-presets" id="ed-presets"></div>
</section>

<section class="ed-block" aria-labelledby="ed-brand-title">
  <h3 id="ed-brand-title">Brand and shape</h3>
  <div class="ed-fields">
    <sub-color-picker id="ed-primary" label="Primary colour" value="#1d70b8" presets="#1d70b8:Blue,#0e7490:Teal,#166534:Green,#6d28d9:Violet,#c2410c:Orange,#be123c:Rose,#374151:Slate"></sub-color-picker>
    <sub-slider id="ed-radius" label="Corner radius" min="0" max="1.5" step="0.125" value="0" unit="rem"></sub-slider>
    <sub-slider id="ed-border" label="Border width" min="0" max="4" step="1" value="2" unit="px"></sub-slider>
    <sub-segmented id="ed-density" label="Density" value="comfortable"><sub-option value="comfortable">Comfortable</sub-option><sub-option value="compact">Compact</sub-option></sub-segmented>
    <sub-select id="ed-font" label="Typeface" value="atkinson">
      <sub-option value="atkinson">Atkinson Hyperlegible (default)</sub-option><sub-option value="system">System UI</sub-option><sub-option value="serif">Serif</sub-option><sub-option value="mono">Monospace</sub-option>
    </sub-select>
    <sub-switch id="ed-tint" label="Tint the neutrals with the brand colour"></sub-switch>
    <sub-switch id="ed-pill" label="Fully rounded controls" hint="Buttons and fields become pills; panels, menus and options keep a safe corner."></sub-switch>
    <sub-switch id="ed-motion" label="Animations" hint="Off removes every transition (this is also what reduced-motion users get)." checked></sub-switch>
  </div>
</section>

<section class="ed-block" aria-labelledby="ed-mode-title">
  <h3 id="ed-mode-title">Preview</h3>
  <sub-segmented id="ed-mode" label="Colour mode" value="auto"><sub-option value="auto">Auto</sub-option><sub-option value="light">Light</sub-option><sub-option value="dark">Dark</sub-option></sub-segmented>
</section>

<section class="ed-block" aria-labelledby="ed-a11y-title">
  <h3 id="ed-a11y-title">Accessibility</h3>
  <div id="ed-contrast"></div>
  <div class="ed-row"><sub-button variant="secondary" id="ed-audit">Audit the preview</sub-button></div>
  <div id="ed-audit-out" class="ed-audit" aria-live="polite"></div>
</section>

<section class="ed-block" aria-labelledby="ed-export-title">
  <h3 id="ed-export-title">Export</h3>
  <sub-tabs label="Export format" id="ed-export-tabs">
    <sub-tab-panel label="JSON"><pre tabindex="0" aria-label="Theme as JSON"><code id="ed-json"></code></pre></sub-tab-panel>
    <sub-tab-panel label="CSS"><pre tabindex="0" aria-label="Theme as CSS"><code id="ed-css"></code></pre></sub-tab-panel>
    <sub-tab-panel label="Install"><pre tabindex="0" aria-label="How to install the theme"><code id="ed-install"></code></pre></sub-tab-panel>
  </sub-tabs>
  <div class="ed-row">
    <sub-button id="ed-copy">Copy</sub-button>
    <sub-button variant="secondary" id="ed-download">Download</sub-button>
  </div>
</section>

<section class="ed-block" aria-labelledby="ed-import-title">
  <h3 id="ed-import-title">Import</h3>
  <sub-textarea id="ed-import" label="Paste a theme (JSON)" hint="Exported from here or written by hand ($schema: sub-theme/1)" rows="4"></sub-textarea>
  <div class="ed-row">
    <sub-button id="ed-import-btn">Apply theme</sub-button>
    <sub-button variant="tertiary" id="ed-reset">Reset to default</sub-button>
  </div>
  <div id="ed-import-msg" role="status"></div>
  <sub-switch id="ed-persist" label="Remember this theme in this browser"></sub-switch>
</section>
`

/** Wire the editor to the live app. Returns the current theme getter (for tests and the console). */
export function mountEditor(host: HTMLElement, app: SubApp, appRoot: HTMLElement): { theme: () => SubTheme } {
  host.innerHTML = editorHtml
  const $ = <T extends HTMLElement>(id: string) => host.querySelector<T>(`#${id}`)!

  const seed: ThemeSeed = { ...presetSeeds[0]!, radius: 0, borderWidth: 2, tinted: false, density: 'comfortable', font: 'atkinson' }
  let theme = generateTheme(seed)
  let active = presetSeeds[0]!.name!
  let tab = 'JSON'

  // ---- presets
  const presets = $('ed-presets')
  presets.innerHTML = presetSeeds
    .map((p) => `<sub-button variant="secondary" data-preset="${esc(p.name!)}" toggle>${esc(p.name!)}</sub-button>`)
    .join('')

  const sync = () => {
    $<Ctl>('ed-primary').value = seed.primary
    $<Ctl>('ed-radius').value = String(seed.radius === 'full' ? 0 : (seed.radius ?? 0))
    $<Ctl>('ed-pill').checked = seed.radius === 'full'
    $<Ctl>('ed-motion').checked = seed.motion !== 'off'
    $<Ctl>('ed-border').value = String(seed.borderWidth ?? 2)
    $<Ctl>('ed-density').value = seed.density ?? 'comfortable'
    $<Ctl>('ed-font').value = seed.font ?? 'atkinson'
    $<Ctl>('ed-tint').checked = Boolean(seed.tinted)
  }

  const renderContrast = () => {
    const issues = checkThemeContrast(theme)
    const box = $('ed-contrast')
    if (!issues.length) {
      box.innerHTML = `<sub-alert variant="success" heading="Meets WCAG 2.2 AA">Every colour pair in light and dark has the contrast it needs.</sub-alert>`
      return
    }
    box.innerHTML = `<sub-alert variant="error" heading="${issues.length} contrast problem(s)">
      <ul class="ed-issues">${issues.slice(0, 6).map((i) => `<li>${i.mode}: ${i.foreground} on ${i.background} is ${i.ratio}:1 (needs ${i.required}:1)</li>`).join('')}</ul>
      <sub-button slot="actions" variant="secondary" id="ed-fix">Fix automatically</sub-button></sub-alert>`
    box.querySelector('#ed-fix')?.addEventListener('click', () => {
      theme = fixThemeContrast(theme)
      commit(false)
      announce('Colours adjusted to meet WCAG AA')
    })
  }

  const renderExport = () => {
    $('ed-json').textContent = exportTheme(theme)
    $('ed-css').textContent = themeToCss(theme)
    $('ed-install').textContent = installSnippet()
  }

  /** Push the theme into the app and refresh every derived panel */
  const commit = (regenerate = true) => {
    if (regenerate) theme = generateTheme({ ...seed, name: active })
    app.theme = theme
    presets.querySelectorAll<HTMLElement & { pressed: boolean }>('[data-preset]').forEach((b) => (b.pressed = b.getAttribute('data-preset') === active))
    renderContrast()
    renderExport()
    if ($<Ctl>('ed-persist').checked) themeStorage.save(theme)
    host.dispatchEvent(new CustomEvent('studio-theme', { detail: theme, bubbles: true }))
  }

  presets.addEventListener('click', (e) => {
    const name = (e.target as Element).closest('[data-preset]')?.getAttribute('data-preset')
    const found = presetSeeds.find((p) => p.name === name)
    if (!found) return
    Object.assign(seed, { radius: 0, borderWidth: 2, tinted: false, density: 'comfortable', font: 'atkinson', motion: 'auto' }, found)
    active = found.name!
    sync()
    commit()
  })

  const bind = (id: string, event: string, apply: (el: Ctl) => void) =>
    $(id).addEventListener(event, () => {
      apply($<Ctl>(id))
      active = 'Custom'
      commit()
    })
  bind('ed-primary', 'input', (el) => /^#[0-9a-fA-F]{6}$/.test(el.value) && (seed.primary = el.value))
  bind('ed-radius', 'input', (el) => (seed.radius = Number(el.value)))
  bind('ed-pill', 'change', (el) => (seed.radius = el.checked ? 'full' : Number($<Ctl>('ed-radius').value)))
  bind('ed-motion', 'change', (el) => (seed.motion = el.checked ? 'auto' : 'off'))
  bind('ed-border', 'input', (el) => (seed.borderWidth = Number(el.value)))
  bind('ed-density', 'change', (el) => (seed.density = el.value as ThemeSeed['density']))
  bind('ed-font', 'change', (el) => (seed.font = el.value as ThemeSeed['font']))
  bind('ed-tint', 'change', (el) => (seed.tinted = Boolean(el.checked)))
  $('ed-mode').addEventListener('change', () => (app.mode = $<Ctl>('ed-mode').value as SubApp['mode']))

  // ---- audit on demand (it moves focus briefly, so it never runs on its own)
  $('ed-audit').addEventListener('click', () => {
    const reports = auditAll(appRoot)
    const sum = summarize(reports)
    const failing = new Map<string, A11yReport['checks'][number]>()
    for (const r of reports) for (const c of r.checks) if (c.status === 'fail' && c.level !== 'best') failing.set(`${r.tag} ${c.id}`, c)
    $('ed-audit-out').innerHTML = `<p><strong>${sum.score}%</strong> across ${new Set(reports.map((r) => r.tag)).size} components - ${sum.compliant ? 'meets WCAG 2.2 AA' : 'does NOT meet AA'}${sum.strict ? ' (and every extra check)' : ''}.</p>
      ${failing.size ? `<ul class="ed-issues">${[...failing].slice(0, 6).map(([k, c]) => `<li>${esc(k)}: ${esc(c.detail ?? c.title)}</li>`).join('')}</ul>` : ''}`
  })

  // ---- export / import
  const current = (): [text: string, name: string, type: string] => {
    if (tab === 'CSS') return [themeToCss(theme), 'theme.css', 'text/css']
    if (tab === 'Install') return [installSnippet(), 'install.txt', 'text/plain']
    return [exportTheme(theme), 'sub-theme.json', 'application/json']
  }
  $('ed-export-tabs').addEventListener('sub-tab-change', (e) => (tab = (e as CustomEvent<{ label: string }>).detail.label))
  $('ed-copy').addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(current()[0])
      announce(`${tab} copied to the clipboard`)
    } catch {
      announce('Copy is not available here: select the text and copy it')
    }
  })
  $('ed-download').addEventListener('click', () => {
    const [text, name, type] = current()
    const url = URL.createObjectURL(new Blob([text], { type }))
    const a = Object.assign(document.createElement('a'), { href: url, download: name })
    a.click()
    URL.revokeObjectURL(url)
  })

  const message = (variant: 'success' | 'error', text: string) => ($('ed-import-msg').innerHTML = `<sub-alert variant="${variant}">${esc(text)}</sub-alert>`)
  $('ed-import-btn').addEventListener('click', () => {
    try {
      theme = importTheme($<Ctl>('ed-import').value)
      active = theme.name
      commit(false)
      message('success', `Applied "${theme.name}".`)
    } catch (error) {
      message('error', (error as Error).message)
    }
  })
  $('ed-reset').addEventListener('click', () => {
    Object.assign(seed, { radius: 0, borderWidth: 2, tinted: false, density: 'comfortable', font: 'atkinson', motion: 'auto' }, presetSeeds[0])
    active = presetSeeds[0]!.name!
    themeStorage.clear()
    $<Ctl>('ed-persist').checked = false
    sync()
    commit()
    message('success', 'Back to the default theme.')
  })
  $('ed-persist').addEventListener('change', () => ($<Ctl>('ed-persist').checked ? themeStorage.save(theme) : themeStorage.clear()))

  // restore a saved theme
  const saved = themeStorage.load()
  if (saved) {
    theme = saved
    active = saved.name
    $<Ctl>('ed-persist').checked = true
    commit(false)
  } else {
    sync()
    commit()
  }
  return { theme: () => theme }
}
