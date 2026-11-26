import '@sub/tokens/fonts.css'
import '@sub/tokens/theme.css'
import './styles.css'
import { announce } from '@sub/core/announce'
import { defineBreadcrumbs } from '@sub/core/breadcrumbs'
import { afterNavigation } from '@sub/core/focus'
import { matchesShortcut } from '@sub/core/keys'
import { defineSkipLink } from '@sub/core/skip-link'
import demoIndex from 'virtual:demo-index'
import type { Demo, DemoMeta } from './demo'
import { createRouter } from './router'
import type { Workbench } from './workbench'

defineSkipLink()
defineBreadcrumbs()

// Only the index (id, title, group, description) ships with the first page; a demo's code loads when it is opened.
const loaders = import.meta.glob<{ default: Demo }>('./demos/*.ts')
const demos = [...demoIndex].sort((a, b) => a.title.localeCompare(b.title))
const byId = new Map(demos.map((d) => [d.id, d]))

const $ = <T extends HTMLElement>(id: string) => {
  const el = document.getElementById(id)
  if (!el) throw new Error(`The playground markup is missing #${id}.`)
  return el as T
}

const root = document.documentElement
const theme = $<HTMLInputElement>('dark-theme')
const density = $<HTMLInputElement>('compact-density')
const nav = $('nav')
let workbench: Workbench | undefined

/** Computed defaults changed (theme, density): refresh the controls and audit again once styles apply */
const restyled = () =>
  requestAnimationFrame(() => {
    workbench?.refresh()
    workbench?.rerun()
  })

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

const applyTheme = () => (root.dataset.subTheme = theme.checked ? 'dark' : 'light')
const applyDensity = () => {
  const preview = document.getElementById('preview')
  if (preview) preview.dataset.subDensity = density.checked ? 'compact' : 'comfortable'
}
theme.checked = saved.dark ?? false
density.checked = saved.compact ?? false
applyTheme()
theme.addEventListener('change', () => {
  savePrefs({ dark: theme.checked })
  applyTheme()
  restyled()
})
density.addEventListener('change', () => {
  savePrefs({ compact: density.checked })
  applyDensity()
  restyled()
})

// another tab of the playground changed a choice: follow it
window.addEventListener('storage', (event) => {
  if (event.key !== PREFS_KEY) return
  const next = loadPrefs()
  if (next.dark !== undefined && next.dark !== theme.checked) {
    theme.checked = next.dark
    applyTheme()
    restyled()
  }
  if (next.compact !== undefined && next.compact !== density.checked) {
    density.checked = next.compact
    applyDensity()
    restyled()
  }
})

// ---- routes -------------------------------------------------------------
type Route = { view: 'studio' } | { view: 'components'; missing?: string } | { view: 'demo'; meta: DemoMeta }

const resolve = (url: URL): Route | null => {
  if (url.origin !== location.origin || url.pathname !== location.pathname) return null
  const c = url.searchParams.get('c')
  if (!c || c === 'studio') return { view: 'studio' }
  if (c === 'components') return { view: 'components' }
  const meta = byId.get(c)
  return meta ? { view: 'demo', meta } : { view: 'components', missing: c }
}
const keyOf = (r: Route) => (r.view === 'demo' ? `demo:${r.meta.id}` : r.view === 'components' ? `components:${r.missing ?? ''}` : 'studio')
const hrefOf = (id: string) => `?c=${id}`

/** Memoised loader that forgets a failure, so the next attempt tries the network again */
function once<T>(load: () => Promise<T>): () => Promise<T> {
  let promise: Promise<T> | undefined
  return () =>
    (promise ??= load().catch((error: unknown) => {
      promise = undefined
      throw error
    }))
}
const loadWorkbench = once(() => import('./workbench'))
const loadStudio = once(() => import('./studio/studio'))
const demoLoaders = new Map(demos.map((d) => [d.id, once(async () => (await loaders[`./demos/${d.id}.ts`]!()).default)]))
// what `load` fetched, for the synchronous `render`
const ready: { workbench?: typeof import('./workbench'); studio?: typeof import('./studio/studio'); demos: Map<string, Demo> } = { demos: new Map() }

async function load(route: Route): Promise<void> {
  if (route.view === 'studio') ready.studio = await loadStudio()
  else if (route.view === 'demo') {
    const [wb, demo] = await Promise.all([loadWorkbench(), demoLoaders.get(route.meta.id)!()])
    ready.workbench = wb
    ready.demos.set(demo.id, demo)
  }
}

// ---- navigation list ------------------------------------------------------
const ORDER: DemoMeta['group'][] = ['Actions', 'Forms', 'Navigation', 'Disclosure', 'Feedback', 'Data', 'Content', 'Layout', 'Patterns', 'Utilities']
const byGroup = new Map<DemoMeta['group'], DemoMeta[]>()
for (const d of demos) byGroup.set(d.group, [...(byGroup.get(d.group) ?? []), d])
const groups = new Map(ORDER.filter((g) => byGroup.has(g)).map((g) => [g, byGroup.get(g)!] as const))
/** Reading order of the component pages (the sidebar order): drives Previous / Next */
const sequence = [...groups.values()].flat()

const escapeHtml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
const item = (id: string, label: string) => `<li><a href="${hrefOf(id)}" data-route="${id}">${escapeHtml(label)}</a></li>`
nav.innerHTML =
  `<section data-start><h2>Start</h2><ul>${item('studio', 'Studio')}${item('components', 'All components')}</ul></section>` +
  [...groups].map(([group, items]) => `<section><h2>${group}</h2><ul>${items.map((d) => item(d.id, d.title)).join('')}</ul></section>`).join('') +
  '<p class="nav-empty" id="nav-empty" hidden>No component matches. Try another word.</p>'

const menu = $<HTMLDetailsElement>('nav-menu')
/** Scroll the sidebar so the current page is visible; with `ifHidden`, leave it alone when it already is */
function revealCurrent(ifHidden = false) {
  const a = nav.querySelector<HTMLElement>('[aria-current="page"]')
  if (!a || menu.scrollHeight <= menu.clientHeight) return
  const box = a.getBoundingClientRect()
  const view = menu.getBoundingClientRect()
  if (ifHidden && box.top >= view.top && box.bottom <= view.bottom) return
  menu.scrollTop = box.top - view.top + menu.scrollTop - menu.clientHeight / 2
}
const wide = matchMedia('(min-width: 60rem)')
let routeView: Route['view'] = 'studio'
const syncMenu = () => (menu.open = wide.matches || routeView === 'components')
wide.addEventListener('change', () => {
  syncMenu()
  requestAnimationFrame(() => revealCurrent())
})

function markCurrent(route: Route) {
  const current = route.view === 'demo' ? route.meta.id : route.view === 'components' && !route.missing ? 'components' : route.view === 'studio' ? 'studio' : ''
  for (const a of nav.querySelectorAll<HTMLAnchorElement>('a[data-route]')) {
    if (a.dataset.route === current) a.setAttribute('aria-current', 'page')
    else a.removeAttribute('aria-current')
  }
}

// ---- find a component (Ctrl/Cmd+K) ------------------------------------------
const filter = $<HTMLInputElement>('nav-filter')
const fold = (s: string) => s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()
let statusTimer: ReturnType<typeof setTimeout> | undefined
function applyFilter() {
  const query = fold(filter.value.trim())
  let shown = 0
  for (const section of nav.querySelectorAll<HTMLElement>('section:not([data-start])')) {
    let visible = 0
    for (const li of section.querySelectorAll('li')) {
      const a = li.querySelector('a')!
      const meta = byId.get(a.dataset.route!)
      const match = !query || fold(`${meta?.title ?? ''} ${meta?.id ?? ''} ${meta?.group ?? ''}`).includes(query)
      li.hidden = !match
      if (match) visible++
    }
    section.hidden = visible === 0
    shown += visible
  }
  $('nav-empty').hidden = shown > 0
  clearTimeout(statusTimer)
  // said once the typing pauses, through the library's shared live region (no extra status region on every page)
  if (query) statusTimer = setTimeout(() => announce(shown === 0 ? `No component matches "${filter.value.trim()}".` : `${shown} ${shown === 1 ? 'component matches' : 'components match'}.`), 400)
}
filter.addEventListener('input', applyFilter)
filter.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') {
    const first = nav.querySelector<HTMLAnchorElement>('section:not([data-start]) li:not([hidden]) a')
    if (first && filter.value.trim()) {
      event.preventDefault()
      first.click()
    }
  } else if (event.key === 'Escape' && filter.value) {
    event.preventDefault()
    filter.value = ''
    applyFilter()
  }
})
document.addEventListener('keydown', (event) => {
  if (!matchesShortcut(event, 'Mod+K')) return
  event.preventDefault()
  menu.open = true
  filter.focus()
  filter.select()
})

// ---- page content ------------------------------------------------------------
const crumbs = $('crumbs')
const pager = $('pager')
let studioMounted = false
let overviewRendered = false

function renderOverview(missing?: string) {
  const overview = $('overview')
  if (!overviewRendered) {
    overviewRendered = true
    overview.innerHTML =
      '<p class="notice" id="missing" hidden></p>' +
      [...groups]
        .map(([group, items]) => `<section><h2>${group}</h2><ul class="cards">${items.map((d) => `<li><a href="${hrefOf(d.id)}">${escapeHtml(d.title)}</a><p>${escapeHtml(d.description)}</p></li>`).join('')}</ul></section>`)
        .join('')
  }
  const notice = $('missing')
  notice.hidden = !missing
  notice.textContent = missing ? `There is no component called "${missing}". Pick one below.` : ''
}

function renderPager(id: string) {
  const at = sequence.findIndex((d) => d.id === id)
  const prev = sequence[at - 1]
  const next = sequence[at + 1]
  pager.innerHTML =
    (prev ? `<a href="${hrefOf(prev.id)}" rel="prev"><span class="pager-dir">Previous</span> ${escapeHtml(prev.title)}</a>` : '') +
    (next ? `<a href="${hrefOf(next.id)}" rel="next"><span class="pager-dir">Next</span> ${escapeHtml(next.title)}</a>` : '')
}

const titleOf = (route: Route) => (route.view === 'studio' ? 'Studio' : route.view === 'components' ? 'Components' : route.meta.title)

function render(route: Route) {
  workbench?.dispose()
  workbench = undefined
  routeView = route.view
  $('studio').hidden = route.view !== 'studio'
  $('overview').hidden = route.view !== 'components'
  $('workbench').hidden = route.view !== 'demo'
  pager.hidden = route.view !== 'demo'
  markCurrent(route)
  syncMenu()

  const title = titleOf(route)
  document.title = `${title} | SUB Playground`
  $('title').textContent = title
  crumbs.innerHTML =
    route.view === 'demo'
      ? `<a href="/">Home</a><a href="${hrefOf('components')}">Components</a><span>${escapeHtml(title)}</span>`
      : `<a href="/">Home</a><a href="/">Design system</a><span>${title}</span>`
  root.dataset.route = route.view === 'demo' ? route.meta.id : route.view

  if (route.view === 'studio') {
    $('intro').textContent = 'Design a theme on a complete, working application. Export it as JSON, CSS or an install snippet, and import it back with one line (or none: the library configures itself from the file).'
    if (!studioMounted) {
      studioMounted = true
      void ready.studio!.mountStudio($('studio-preview'), $('studio-editor')).then(() => (root.dataset.studioReady = ''))
    }
  } else if (route.view === 'components') {
    $('intro').textContent = `${demos.length} accessible, framework-neutral Web Components. Raw by default (square, high contrast, big targets): shape every one of them live and watch its WCAG result change.`
    renderOverview(route.missing)
  } else {
    const demo = ready.demos.get(route.meta.id)!
    $('intro').textContent = demo.description
    currentCode = demo.html.trim()
    codeBlock.open = false
    code.textContent = ''
    workbench = ready.workbench!.mountWorkbench(demo, { compact: density.checked })
    renderPager(demo.id)
  }
}

// ---- the example's code: written into the page only while it is open (one copy of the demo's text) ------
const codeBlock = $<HTMLDetailsElement>('code-block')
const code = $('code')
let currentCode = ''
codeBlock.addEventListener('toggle', () => (code.textContent = codeBlock.open ? currentCode : ''))
const copy = $<HTMLButtonElement>('code-copy')
let copyTimer: ReturnType<typeof setTimeout> | undefined
copy.addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(currentCode)
    copy.textContent = 'Copied'
    announce('Code copied')
  } catch {
    getSelection()?.selectAllChildren(code)
    copy.textContent = 'Selected: press Ctrl+C'
  }
  clearTimeout(copyTimer)
  copyTimer = setTimeout(() => (copy.textContent = 'Copy code'), 1800)
})

// ---- start -------------------------------------------------------------------
const router = createRouter<Route>({
  resolve,
  key: keyOf,
  load,
  render,
  after(route) {
    // keyboard and screen-reader users land on the new h1, as after a real page load
    afterNavigation({ title: `${titleOf(route)} | SUB Playground` })
    requestAnimationFrame(() => revealCurrent(true))
  },
})
;(window as unknown as { playground: unknown }).playground = { navigate: router.navigate }

void router.start().then(() => {
  requestAnimationFrame(() => revealCurrent())
  root.dataset.ready = ''
})
