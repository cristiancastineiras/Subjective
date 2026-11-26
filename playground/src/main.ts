import '@sub/tokens/fonts.css'
import '@sub/tokens/theme.css'
import './styles.css'
import { defineBreadcrumbs } from '@sub/core/breadcrumbs'
import { defineSkipLink } from '@sub/core/skip-link'
import type { Demo } from './demo'
import { mountA11y } from './panels/a11y'
import { mountConfigure } from './panels/configure'
import { mountStudio } from './studio/studio'

defineSkipLink()
defineBreadcrumbs()

const modules = import.meta.glob<{ default: Demo }>('./demos/*.ts', { eager: true })
const demos = Object.values(modules)
  .map((m) => m.default)
  .sort((a, b) => a.title.localeCompare(b.title))

const $ = <T extends HTMLElement>(id: string) => {
  const el = document.getElementById(id)
  if (!el) throw new Error(`The playground markup is missing #${id}.`)
  return el as T
}

const theme = $<HTMLInputElement>('dark-theme')
const nav = $('nav')
const result = $('result')
const param = new URLSearchParams(location.search).get('c')
/** studio (default) | components (overview) | a component id */
const route: 'studio' | 'components' | 'demo' = !param || param === 'studio' ? 'studio' : param === 'components' ? 'components' : 'demo'
const current = route === 'demo' ? demos.find((d) => d.id === param) : undefined
let refreshConfig = () => {}
let rerun = () => {}

// ---- remembered choices: dark theme and compact density survive page changes and other tabs ---------
const PREFS_KEY = 'sub-playground-prefs'
interface Prefs {
  dark?: boolean
  compact?: boolean
}
const loadPrefs = (): Prefs => {
  try {
    return JSON.parse(localStorage.getItem(PREFS_KEY) ?? '{}') as Prefs
  } catch {
    return {} // storage blocked or corrupt: fall back to the defaults
  }
}
const savePrefs = (next: Prefs): void => {
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify({ ...loadPrefs(), ...next }))
  } catch {
    /* private window: the choice just lasts for this page */
  }
}
const saved = loadPrefs()

// ---- theme -------------------------------------------------------------
function updateTheme(dark: boolean) {
  document.documentElement.dataset.subTheme = dark ? 'dark' : 'light'
  // computed defaults changed: refresh controls and audit again after styles apply
  requestAnimationFrame(() => {
    refreshConfig()
    rerun()
  })
}
theme.checked = saved.dark ?? false
document.documentElement.dataset.subTheme = theme.checked ? 'dark' : 'light'
theme.addEventListener('change', () => {
  savePrefs({ dark: theme.checked })
  updateTheme(theme.checked)
})

// ---- density: applies to the example (and the editor reads the new computed defaults) -----------------
const density = $<HTMLInputElement>('compact-density')
const applyDensity = () => {
  const target = document.getElementById('preview')
  if (target) target.dataset.subDensity = density.checked ? 'compact' : 'comfortable'
}
density.checked = saved.compact ?? false
applyDensity()
density.addEventListener('change', () => {
  savePrefs({ compact: density.checked })
  applyDensity()
  requestAnimationFrame(() => {
    refreshConfig()
    rerun()
  })
})

// another tab of the playground changed a choice: follow it
window.addEventListener('storage', (event) => {
  if (event.key !== PREFS_KEY) return
  const next = loadPrefs()
  if (next.dark !== undefined && next.dark !== theme.checked) {
    theme.checked = next.dark
    updateTheme(theme.checked)
  }
  if (next.compact !== undefined && next.compact !== density.checked) {
    density.checked = next.compact
    applyDensity()
    requestAnimationFrame(() => {
      refreshConfig()
      rerun()
    })
  }
})

// ---- navigation --------------------------------------------------------
const ORDER: Demo['group'][] = ['Actions', 'Forms', 'Navigation', 'Disclosure', 'Feedback', 'Data', 'Content', 'Layout', 'Patterns', 'Utilities']
const byGroup = new Map<Demo['group'], Demo[]>()
for (const d of demos) byGroup.set(d.group, [...(byGroup.get(d.group) ?? []), d])
const groups = new Map(ORDER.filter((g) => byGroup.has(g)).map((g) => [g, byGroup.get(g)!] as const))
const link = (d: Demo) => `<li><a href="?c=${d.id}"${d.id === current?.id ? ' aria-current="page"' : ''}>${d.title}</a></li>`
const start = (id: string, label: string) => `<li><a href="?c=${id}"${route === id ? ' aria-current="page"' : ''}>${label}</a></li>`
nav.innerHTML = `<section><h2>Start</h2><ul>${start('studio', 'Studio')}${start('components', 'All components')}</ul></section>` + [...groups].map(([group, items]) => `<section><h2>${group}</h2><ul>${items.map(link).join('')}</ul></section>`).join('')

const menu = $<HTMLDetailsElement>('nav-menu')
/** Scroll the selector so the current component is visible (centred) */
function revealCurrent() {
  const a = nav.querySelector<HTMLElement>('[aria-current="page"]')
  if (!a || menu.scrollHeight <= menu.clientHeight) return
  menu.scrollTop = a.getBoundingClientRect().top - menu.getBoundingClientRect().top + menu.scrollTop - menu.clientHeight / 2
}
const wide = matchMedia('(min-width: 60rem)')
const syncMenu = () => (menu.open = wide.matches || route === 'components')
syncMenu()
requestAnimationFrame(revealCurrent)
wide.addEventListener('change', () => {
  syncMenu()
  requestAnimationFrame(revealCurrent)
})

// ---- breadcrumbs (3 levels: Home > Components > Page) --------------------
const crumbs = $('crumbs')
crumbs.innerHTML = current
  ? `<a href="/">Home</a><a href="?c=components">Components</a><span>${current.title}</span>`
  : `<a href="/">Home</a><a href="/">Design system</a><span>${route === 'studio' ? 'Studio' : 'Components'}</span>`

// ---- content -----------------------------------------------------------
const escapeHtml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

if (route === 'studio') {
  document.title = 'Studio | SUB Playground'
  $('title').textContent = 'Studio'
  $('intro').textContent = 'Design a theme on a complete, working application. Export it as JSON, CSS or an install snippet, and import it back with one line (or none: the library configures itself from the file).'
  $('studio').hidden = false
  void mountStudio($('studio-preview'), $('studio-editor')).then(() => (document.documentElement.dataset.studioReady = ''))
} else if (!current) {
  document.title = 'Components | SUB Playground'
  $('title').textContent = 'Components'
  $('intro').textContent = `${demos.length} accessible, framework-neutral Web Components. Raw by default (square, high contrast, big targets): shape every one of them live and watch its WCAG result change.`
  const overview = $('overview')
  overview.hidden = false
  overview.innerHTML = [...groups]
    .map(([group, items]) => `<section><h2>${group}</h2><ul class="cards">${items.map((d) => `<li><a href="?c=${d.id}">${d.title}</a><p>${escapeHtml(d.description)}</p></li>`).join('')}</ul></section>`)
    .join('')
} else {
  document.title = `${current.title} | SUB Playground`
  $('title').textContent = current.title
  $('intro').textContent = current.description
  $('workbench').hidden = false
  current.define()
  const preview = $('preview')
  preview.innerHTML = current.html
  current.setup?.(preview, (message) => (result.textContent = message))

  if (current.keyboard?.length) {
    $('keys-block').hidden = false
    $('keys').innerHTML = current.keyboard.map(([k, d]) => `<tr><td><kbd>${k}</kbd></td><td>${d}</td></tr>`).join('')
  }

  const a11y = mountA11y($('a11y'), preview)
  rerun = a11y.run
  const cfg = mountConfigure($('configure'), preview, current, a11y.run)
  refreshConfig = cfg.refresh
  // wait until every custom element in the example is defined and has rendered, then audit
  const pending = [...preview.querySelectorAll('*')].filter((el) => el.localName.includes('-')).map((el) => customElements.whenDefined(el.localName))
  void Promise.race([Promise.allSettled(pending), new Promise((r) => setTimeout(r, 1500))]).then(() => requestAnimationFrame(() => requestAnimationFrame(a11y.run)))
}
document.documentElement.dataset.ready = ''
