import { html, nothing, render, type TemplateResult } from 'lit'
import { live } from 'lit/directives/live.js'
import { announce } from '@sub/core/announce'
import type { SubApp } from '@sub/core/app'
import { moveFocus } from '@sub/core/focus'
import type { SubAutocomplete } from '@sub/core/autocomplete'
import type { SubTour } from '@sub/core/tour'
import * as api from './api'
import { barChart } from './chart'

/**
 * The sample application the Studio themes: "Dev Desk", a real, working dashboard built ONLY from library
 * components. It talks to public APIs (Open-Meteo weather, the npm registry, npm download counts and GitHub),
 * remembers your choices in localStorage and handles loading, empty and error states. Embedded (no duplicate
 * landmarks) and scoped to a <sub-app>, so the theme applies to it alone.
 */
export const dashboardHtml = /* html */ `<sub-app id="studio-app" mode="auto" required-indicator="required"><div class="app-surface" id="app-root"></div></sub-app>`

type View = 'overview' | 'packages' | 'weather' | 'watchlist' | 'settings'

interface Load<T> {
  status: 'idle' | 'loading' | 'ready' | 'error'
  data?: T
  error?: string
}
const idle = <T>(): Load<T> => ({ status: 'idle' })
const loading = <T>(): Load<T> => ({ status: 'loading' })
const ready = <T>(data: T): Load<T> => ({ status: 'ready', data })
const failed = <T>(error: unknown): Load<T> => ({ status: 'error', error: error instanceof Error ? error.message : 'Something went wrong.' })

interface Note {
  id: number
  text: string
  at: string
}

interface Saved {
  name: string
  place: api.Place
  pkg: string
  unit: api.TempUnit
  days: number
  watchPkgs: string[]
  watchCities: api.Place[]
  notes: Note[]
  autoRefresh: boolean
  refreshMinutes: number
  notify: string[]
}

const MADRID: api.Place = { id: 3117735, name: 'Madrid', country: 'Spain', region: 'Madrid', latitude: 40.4165, longitude: -3.70256 }
const DEFAULTS: Saved = { name: 'Ana Ruiz', place: MADRID, pkg: 'lit', unit: 'celsius', days: 7, watchPkgs: ['lit', 'vite'], watchCities: [], notes: [], autoRefresh: false, refreshMinutes: 5, notify: ['deploys'] }
const STORAGE_KEY = 'sub-studio-app'

function loadSaved(): Saved {
  try {
    return { ...DEFAULTS, ...(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}') as Partial<Saved>) }
  } catch {
    return { ...DEFAULTS }
  }
}

const TITLES: Record<View, string> = { overview: 'Overview', packages: 'Packages', weather: 'Weather', watchlist: 'Watchlist', settings: 'Settings' }
const TEAM = [
  { value: 'ana', label: 'Ana Ruiz', description: 'Design' },
  { value: 'luis', label: 'Luis Gil', description: 'Engineering' },
  { value: 'mei', label: 'Mei Chen', description: 'Research' },
  { value: 'omar', label: 'Omar Said', description: 'Platform' },
]

const greeting = (): string => {
  const h = new Date().getHours()
  return h < 12 ? 'Good morning' : h < 20 ? 'Good afternoon' : 'Good evening'
}

/** Wire the dashboard into `root`; returns the <sub-app> the Studio themes. */
export function setupDashboard(root: HTMLElement): SubApp {
  const app = root.querySelector('#studio-app') as SubApp
  const surface = root.querySelector<HTMLElement>('#app-root')!

  // ------------------------------------------------------------------ state
  const saved = loadSaved()
  const state = {
    view: 'overview' as View,
    forecast: idle<api.Forecast>(),
    info: idle<api.PackageInfo>(),
    downloads: idle<api.Downloads>(),
    repo: idle<api.RepoStats>(),
    pkgSuggestions: [] as Array<{ value: string; label: string; description: string }>,
    placeSuggestions: [] as Array<{ value: string; label: string; description: string }>,
    places: [] as api.Place[],
    results: idle<api.PackageHit[]>(),
    query: '',
    picked: [] as string[],
    compare: idle<api.Downloads[]>(),
    watchData: {} as Record<string, Load<{ info: api.PackageInfo; downloads: api.Downloads }>>,
    cityData: {} as Record<number, Load<api.Forecast>>,
    watchTab: 0,
    detail: '' as string,
    confirmClear: false,
    updated: 0,
  }
  const settings: Saved = saved
  const controllers = new Map<string, AbortController>()

  const persist = () => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
    } catch {
      /* private window: choices last for this page only */
    }
  }

  let queued = false
  const update = () => {
    if (queued) return
    queued = true
    queueMicrotask(() => {
      queued = false
      render(shell(), surface)
    })
  }

  /** Run a loader; a newer call with the same key cancels the older one */
  async function run<T>(key: string, set: (l: Load<T>) => void, job: (signal: AbortSignal) => Promise<T>): Promise<void> {
    controllers.get(key)?.abort()
    const controller = new AbortController()
    controllers.set(key, controller)
    set(loading())
    update()
    try {
      const data = await job(controller.signal)
      if (controller.signal.aborted) return
      set(ready(data))
    } catch (error) {
      if (controller.signal.aborted) return
      set(failed(error))
    }
    state.updated = Date.now()
    update()
  }

  const loadForecast = (force = false) => run<api.Forecast>('forecast', (l) => (state.forecast = l), (signal) => api.getForecast(settings.place, settings.unit, settings.days, { signal, force }))

  const loadPackage = (force = false) => {
    void run<api.PackageInfo>('info', (l) => (state.info = l), (signal) => api.getPackage(settings.pkg, { signal, force }))
    void run<api.Downloads>('downloads', (l) => (state.downloads = l), (signal) => api.getDownloads(settings.pkg, { signal, force }))
    void run<api.RepoStats>('repo', (l) => (state.repo = l), async (signal) => {
      const info = await api.getPackage(settings.pkg, { signal })
      if (!info.github) throw new Error('This package does not point at a GitHub repository.')
      return api.getRepo(info.github, { signal, force })
    })
  }

  const loadWatch = (force = false) => {
    for (const name of settings.watchPkgs) {
      void run<{ info: api.PackageInfo; downloads: api.Downloads }>(`watch:${name}`, (l) => (state.watchData[name] = l), async (signal) => {
        const [info, downloads] = await Promise.all([api.getPackage(name, { signal, force }), api.getDownloads(name, { signal, force })])
        return { info, downloads }
      })
    }
    for (const place of settings.watchCities) void run<api.Forecast>(`city:${place.id}`, (l) => (state.cityData[place.id] = l), (signal) => api.getForecast(place, settings.unit, 3, { signal, force }))
  }

  const search = (query: string) => {
    state.query = query
    if (!query.trim()) {
      state.results = idle()
      update()
      return
    }
    void run<api.PackageHit[]>('search', (l) => (state.results = l), (signal) => api.searchPackages(query.trim(), 12, signal))
  }

  const loadView = (view: View, force = false) => {
    if (view === 'overview') {
      if (force || state.forecast.status === 'idle') void loadForecast(force)
      if (force || state.info.status === 'idle') loadPackage(force)
    } else if (view === 'weather') {
      if (force || state.forecast.status === 'idle') void loadForecast(force)
    } else if (view === 'watchlist') loadWatch(force)
  }

  const refresh = () => {
    api.clearCache()
    loadView(state.view, true)
    announce('Refreshing the data')
    app.toast({ message: 'Refreshing from the live APIs…' })
  }

  const go = (view: View, focusTitle = true) => {
    state.view = view
    loadView(view)
    update()
    if (focusTitle) {
      void app.updateComplete.then(() => requestAnimationFrame(() => {
        // the real <h3> lives in the heading's shadow root
        moveFocus(surface.querySelector('[data-view-title]')?.shadowRoot?.querySelector('h1, h2, h3, h4, h5, h6'), { announce: `${TITLES[view]} page` })
      }))
    }
  }

  const openPackage = (name: string) => {
    settings.pkg = name
    persist()
    state.info = idle()
    state.downloads = idle()
    state.repo = idle()
    go('overview')
  }

  let lastUndo: (() => void) | undefined
  const toggleWatchPkg = (name: string, quiet = false) => {
    const has = settings.watchPkgs.includes(name)
    settings.watchPkgs = has ? settings.watchPkgs.filter((n) => n !== name) : [...settings.watchPkgs, name]
    persist()
    update()
    if (quiet) return
    app.toast({ message: has ? `Removed ${name} from your watchlist` : `Added ${name} to your watchlist`, actionLabel: 'Undo' })
    lastUndo = () => toggleWatchPkg(name, true)
  }
  app.addEventListener('sub-toast-action', () => {
    lastUndo?.()
    lastUndo = undefined
    announce('Undone')
  })

  const setPlace = (place: api.Place) => {
    settings.place = place
    persist()
    state.forecast = idle()
    void loadForecast()
    announce(`Showing the weather in ${place.name}`)
  }

  const toggleWatchCity = (place: api.Place) => {
    const has = settings.watchCities.some((c) => c.id === place.id)
    settings.watchCities = has ? settings.watchCities.filter((c) => c.id !== place.id) : [...settings.watchCities, place]
    persist()
    update()
    app.toast({ message: has ? `Removed ${place.name} from your watchlist` : `Saved ${place.name} to your watchlist` })
  }

  // ------------------------------------------------------------------ small views
  const errorState = (heading: string, message: string | undefined, retry: () => void) => html`
    <sub-empty-state variant="error" heading=${heading} level="4">
      ${message}
      <sub-button slot="actions" @click=${retry}>Try again</sub-button>
    </sub-empty-state>`

  const skeleton = (label: string, lines = 3) => html`<sub-skeleton label=${label} lines=${lines}></sub-skeleton>`

  const placeLabel = (p: api.Place) => [p.name, p.region && p.region !== p.name ? p.region : '', p.country].filter(Boolean).join(', ')

  const weatherCard = (): TemplateResult => {
    const f = state.forecast
    const body =
      f.status === 'ready' && f.data
        ? (() => {
            const d = f.data
            const now = api.describeWeather(d.current.code)
            return html`
              <div class="app-now">
                <sub-icon class="app-now-icon" name=${now.icon}></sub-icon>
                <div>
                  <p class="app-temp">${Math.round(d.current.temperature)}${d.tempSymbol}</p>
                  <p class="app-muted">${now.label}, feels like ${Math.round(d.current.feelsLike)}${d.tempSymbol}</p>
                </div>
              </div>
              <sub-grid class="app-mini" style="--sub-grid-min: 6.5rem">
                <sub-statistic label="Humidity" value=${String(d.current.humidity)} suffix="%" raw></sub-statistic>
                <sub-statistic label="Wind" value=${String(Math.round(d.current.wind))} suffix=${` ${d.windUnit}`} raw></sub-statistic>
                <sub-statistic label="Rain today" value=${String(d.daily[0]?.rain ?? 0)} suffix="%" raw></sub-statistic>
              </sub-grid>
              <sub-list label=${`${d.daily.length}-day forecast`}>
                ${d.daily.slice(0, 5).map((day, i) => {
                  const w = api.describeWeather(day.code)
                  return html`<sub-list-item>
                    <sub-icon slot="start" name=${w.icon}></sub-icon>
                    <strong>${i === 0 ? 'Today' : api.weekday(day.date)}</strong>
                    <span class="app-muted">${w.label}, ${day.rain}% rain</span>
                    <span slot="end" class="app-range">${Math.round(day.max)}° / ${Math.round(day.min)}°</span>
                  </sub-list-item>`
                })}
              </sub-list>`
          })()
        : f.status === 'error'
          ? errorState('Weather is unavailable', f.error, () => void loadForecast(true))
          : skeleton('Loading the weather', 5)
    return html`<sub-card id="card-weather" heading=${`Weather in ${settings.place.name}`} level="4">
      <sub-button slot="extra" variant="tertiary" @click=${() => go('weather')}>Open</sub-button>
      ${body}
    </sub-card>`
  }

  const chartFor = (d: api.Downloads) => barChart({ title: `Downloads of ${d.name}, last 30 days`, unit: 'downloads', data: d.days.map((x) => ({ label: x.day, value: x.downloads })) })

  const packageCard = (): TemplateResult => {
    const i = state.info
    const watched = settings.watchPkgs.includes(settings.pkg)
    const body =
      i.status === 'ready' && i.data
        ? html`
            <p>${i.data.description || 'No description.'}</p>
            <sub-space>${i.data.keywords.slice(0, 6).map((k) => html`<sub-chip>${k}</sub-chip>`)}</sub-space>
            <sub-descriptions label="Package details" bordered>
              <sub-desc label="License">${i.data.license}</sub-desc>
              <sub-desc label="Dependencies">${i.data.dependencies}</sub-desc>
              <sub-desc label="Unpacked size">${i.data.unpackedSize ? api.bytes(i.data.unpackedSize) : 'unknown'}</sub-desc>
              <sub-desc label="Files">${i.data.files || 'unknown'}</sub-desc>
              <sub-desc label="Repository">${i.data.github ? html`<a href=${`https://github.com/${i.data.github}`} target="_blank" rel="noreferrer">${i.data.github}<span class="sr-only"> (opens in a new tab)</span></a>` : 'none listed'}</sub-desc>
            </sub-descriptions>
            ${i.data.maintainers.length
              ? html`<sub-space aria-label="Maintainers" role="group">${i.data.maintainers.slice(0, 5).map((m) => html`<sub-avatar name=${m} size="sm"></sub-avatar>`)}<span class="app-muted">${i.data.maintainers.length} maintainer${i.data.maintainers.length === 1 ? '' : 's'}</span></sub-space>`
              : nothing}`
        : i.status === 'error'
          ? errorState(`Could not load ${settings.pkg}`, i.error, () => loadPackage(true))
          : skeleton('Loading the package', 5)
    return html`<sub-card id="card-package" heading=${settings.pkg} level="4">
      <sub-space slot="extra">
        ${i.data ? html`<sub-badge variant="info">v${i.data.version}</sub-badge>` : nothing}
        <sub-button variant="secondary" toggle ?pressed=${watched} @click=${() => toggleWatchPkg(settings.pkg)}>Watch</sub-button>
      </sub-space>
      ${body}
    </sub-card>`
  }

  const downloadsCard = (): TemplateResult => {
    const d = state.downloads
    return html`<sub-card heading="Downloads, last 30 days" level="4">
      ${d.status === 'ready' && d.data ? chartFor(d.data) : d.status === 'error' ? errorState('Downloads are unavailable', d.error, () => loadPackage(true)) : skeleton('Loading downloads', 4)}
    </sub-card>`
  }

  const statCards = (): TemplateResult => {
    const f = state.forecast.data
    const dl = state.downloads.data
    const info = state.info.data
    const repo = state.repo.data
    const t = dl ? api.trend(dl.week, dl.previousWeek) : undefined
    const cell = (heading: string, content: TemplateResult | typeof nothing, busy: boolean) => html`<sub-card heading=${heading} level="4">${busy ? skeleton(`Loading ${heading.toLowerCase()}`, 2) : content}</sub-card>`
    return html`<sub-grid class="app-stats" style="--sub-grid-min: 12rem">
      ${cell('Temperature', f ? html`<sub-statistic label=${settings.place.name} value=${String(Math.round(f.current.temperature))} suffix=${f.tempSymbol} raw trend="flat" trend-text=${`feels like ${Math.round(f.current.feelsLike)}${f.tempSymbol}`}></sub-statistic>` : html`<p class="app-muted">Not available</p>`, state.forecast.status === 'loading' || state.forecast.status === 'idle')}
      ${cell('Weekly downloads', dl && t ? html`<sub-statistic label=${settings.pkg} value=${String(dl.week)} trend=${t.trend} trend-text=${t.text}></sub-statistic>` : html`<p class="app-muted">Not available</p>`, state.downloads.status === 'loading' || state.downloads.status === 'idle')}
      ${cell('Latest version', info ? html`<sub-statistic label=${info.name} value=${`v${info.version}`} raw></sub-statistic>` : html`<p class="app-muted">Not available</p>`, state.info.status === 'loading' || state.info.status === 'idle')}
      ${cell('GitHub stars', repo ? html`<sub-statistic label=${repo.slug} value=${String(repo.stars)} trend="flat" trend-text=${`${api.compact(repo.forks)} forks, ${api.compact(repo.issues)} open issues`}></sub-statistic>` : state.repo.status === 'error' ? html`<p class="app-muted">${state.repo.error}</p>` : html`<p class="app-muted">Not available</p>`, state.repo.status === 'loading' || state.repo.status === 'idle')}
    </sub-grid>`
  }

  const notesCard = (): TemplateResult => html`<sub-card id="card-notes" heading="Team notes" level="4">
    <form class="app-note-form" @submit=${(e: Event) => {
      e.preventDefault()
      const field = (e.target as HTMLFormElement).querySelector<HTMLElement & { value: string }>('sub-mentions')!
      const text = field.value.trim()
      if (!text) return
      settings.notes = [{ id: Date.now(), text, at: new Date().toISOString() }, ...settings.notes].slice(0, 6)
      persist()
      field.value = ''
      update()
      app.toast({ message: 'Note saved' })
    }}>
      <sub-mentions name="note" label="Leave a note" hint="Type @ to mention someone on the team." rows="2">
        ${TEAM.map((m) => html`<sub-option value=${m.value} description=${m.description}>${m.label}</sub-option>`)}
      </sub-mentions>
      <sub-button type="submit" variant="secondary">Save note</sub-button>
    </form>
    ${settings.notes.length
      ? html`<sub-list label="Saved notes">${settings.notes.map((n) => html`<sub-list-item><span>${n.text}</span><span class="app-muted">${api.shortDate(n.at)}</span></sub-list-item>`)}</sub-list>`
      : html`<p class="app-muted">No notes yet. They stay in this browser.</p>`}
  </sub-card>`

  // ------------------------------------------------------------------ views
  const overview = () => html`
    ${statCards()}
    <sub-grid class="app-two" style="--sub-grid-min: 20rem">
      ${weatherCard()} ${packageCard()}
    </sub-grid>
    <sub-grid class="app-two" style="--sub-grid-min: 20rem">
      ${downloadsCard()} ${notesCard()}
    </sub-grid>`

  const packagesView = () => {
    const r = state.results
    const hits = r.data ?? []
    return html`
      <form class="app-search-form" @submit=${(e: Event) => {
        e.preventDefault()
        search(((e.target as HTMLFormElement).querySelector('sub-input') as HTMLElement & { value: string }).value)
      }}>
        <sub-input type="search" name="q" label="Search the npm registry" hint="Try: web components, date picker, markdown" .value=${state.query} autocomplete="off"></sub-input>
        <sub-button type="submit">Search</sub-button>
      </form>
      ${r.status === 'loading'
        ? skeleton('Searching npm', 6)
        : r.status === 'error'
          ? errorState('The search failed', r.error, () => search(state.query))
          : r.status === 'idle'
            ? html`<sub-empty-state variant="first-use" heading="Search for a package" level="4">Results come live from the npm registry. Pick two or more to compare their weekly downloads.</sub-empty-state>`
            : !hits.length
              ? html`<sub-empty-state variant="no-results" heading=${`No packages for "${state.query}"`} level="4">Try fewer words or another spelling.</sub-empty-state>`
              : html`
                  <sub-table id="app-results" class="app-table" caption=${`${hits.length} packages for "${state.query}"`} selectable .columns=${resultColumns} .rows=${hits.map((h) => ({ ...h, id: h.name }))} .selected=${state.picked} @sub-select=${(e: CustomEvent<{ selected: string[] }>) => {
                    state.picked = e.detail.selected
                    update()
                  }}></sub-table>
                  <sub-space>
                    <sub-button disabled-reason=${state.picked.length < 2 ? 'Select at least two packages to compare' : nothing} @click=${() => compareSelected()}>Compare ${state.picked.length || ''} selected</sub-button>
                    <sub-button variant="secondary" ?disabled=${!state.picked.length} @click=${() => state.picked.forEach((n) => !settings.watchPkgs.includes(n) && toggleWatchPkg(n))}>Add selected to watchlist</sub-button>
                  </sub-space>`}
      ${compareCard()}`
  }

  const resultColumns = [
    { key: 'name', label: 'Package', sortable: true, render: (r: Record<string, unknown>) => html`<strong>${String(r.name)}</strong>` },
    { key: 'version', label: 'Version' },
    { key: 'description', label: 'Description', render: (r: Record<string, unknown>) => html`<span class="app-clamp">${String(r.description)}</span>` },
    { key: 'score', label: 'Score', sortable: true, align: 'end' as const, render: (r: Record<string, unknown>) => html`${String(r.score)}/100` },
    { key: 'date', label: 'Published', sortable: true, render: (r: Record<string, unknown>) => api.shortDate(String(r.date)) },
    { key: 'open', label: 'Actions', render: (r: Record<string, unknown>) => html`<sub-button variant="tertiary" @click=${() => openPackage(String(r.name))}>Open<span class="sr-only"> ${String(r.name)}</span></sub-button>` },
  ]

  const compareSelected = () => {
    const names = [...state.picked]
    void run<api.Downloads[]>('compare', (l) => (state.compare = l), (signal) => Promise.all(names.map((n) => api.getDownloads(n, { signal }))))
  }

  const compareCard = () => {
    const c = state.compare
    if (c.status === 'idle') return nothing
    const max = Math.max(1, ...(c.data ?? []).map((d) => d.week))
    return html`<sub-card id="card-compare" heading="Weekly downloads compared" level="4">
      ${c.status === 'loading'
        ? skeleton('Comparing packages', 4)
        : c.status === 'error'
          ? errorState('The comparison failed', c.error, compareSelected)
          : html`<sub-stack gap="3">${[...(c.data ?? [])]
              .sort((a, b) => b.week - a.week)
              .map((d) => html`<sub-progress label=${d.name} value=${String(d.week)} max=${String(max)} show-value valuetext=${`${d.week.toLocaleString('en')} downloads this week, ${api.trend(d.week, d.previousWeek).text}`}></sub-progress>`)}</sub-stack>`}
    </sub-card>`
  }

  const weatherView = () => {
    const f = state.forecast
    const tableRows = (f.data?.daily ?? []).map((d) => ({ id: d.date, date: d.date, label: api.describeWeather(d.code).label, max: Math.round(d.max), min: Math.round(d.min), rain: d.rain }))
    const watched = settings.watchCities.some((c) => c.id === settings.place.id)
    return html`
      <sub-grid class="app-two" style="--sub-grid-min: 18rem">
        <sub-autocomplete id="app-place" label="Search a city" hint="Powered by Open-Meteo geocoding" remote min-chars="2" max-results="6" .options=${state.placeSuggestions} @sub-search=${onPlaceSearch} @sub-select=${onPlacePick}></sub-autocomplete>
        <sub-stack gap="3">
          <sub-segmented label="Units" .value=${settings.unit} @change=${(e: Event) => {
            settings.unit = (e.target as HTMLElement & { value: string }).value as api.TempUnit
            persist()
            void loadForecast()
          }}>
            <sub-option value="celsius">°C, km/h</sub-option>
            <sub-option value="fahrenheit">°F, mph</sub-option>
          </sub-segmented>
          <sub-select label="Forecast length" .value=${String(settings.days)} @change=${(e: Event) => {
            settings.days = Number((e.target as HTMLElement & { value: string }).value)
            persist()
            void loadForecast()
          }}>
            <sub-option value="3">3 days</sub-option><sub-option value="7">7 days</sub-option><sub-option value="14">14 days</sub-option>
          </sub-select>
        </sub-stack>
      </sub-grid>
      <sub-grid class="app-two" style="--sub-grid-min: 20rem">
        ${weatherCard()}
        <sub-card heading=${`${placeLabel(settings.place)}`} level="4">
          <sub-button slot="extra" variant="secondary" toggle ?pressed=${watched} @click=${() => toggleWatchCity(settings.place)}>Save city</sub-button>
          ${f.status === 'ready' && f.data
            ? html`<sub-table class="app-table" caption=${`${f.data.daily.length}-day forecast`} .columns=${[
                { key: 'date', label: 'Day', sortable: true, render: (r: Record<string, unknown>) => api.weekday(String(r.date)) },
                { key: 'label', label: 'Conditions' },
                { key: 'max', label: `High (${f.data.tempSymbol})`, sortable: true, align: 'end' as const },
                { key: 'min', label: `Low (${f.data.tempSymbol})`, sortable: true, align: 'end' as const },
                { key: 'rain', label: 'Rain', sortable: true, align: 'end' as const, render: (r: Record<string, unknown>) => `${r.rain}%` },
              ]} .rows=${tableRows}></sub-table>`
            : f.status === 'error'
              ? errorState('The forecast failed', f.error, () => void loadForecast(true))
              : skeleton('Loading the forecast', 6)}
        </sub-card>
      </sub-grid>`
  }

  const watchlistView = () => html`
    <sub-tabs label="Watchlist" .selected=${state.watchTab} @sub-tab-change=${(e: CustomEvent<{ index: number }>) => (state.watchTab = e.detail.index)}>
      <sub-tab-panel label=${`Packages (${settings.watchPkgs.length})`}>
        ${settings.watchPkgs.length
          ? html`<sub-grid style="--sub-grid-min: 15rem">${settings.watchPkgs.map((name) => {
              const w = state.watchData[name]
              const d = w?.data
              const t = d ? api.trend(d.downloads.week, d.downloads.previousWeek) : undefined
              return html`<sub-card heading=${name} level="4">
                ${d && t
                  ? html`<sub-statistic label=${`v${d.info.version}, weekly downloads`} value=${String(d.downloads.week)} trend=${t.trend} trend-text=${t.text}></sub-statistic><p class="app-muted">${d.info.description}</p>`
                  : w?.status === 'error'
                    ? html`<p class="app-muted">${w.error}</p>`
                    : skeleton(`Loading ${name}`, 3)}
                <sub-space slot="footer">
                  <sub-button variant="secondary" @click=${() => openPackage(name)}>Open<span class="sr-only"> ${name}</span></sub-button>
                  <sub-button variant="tertiary" @click=${() => toggleWatchPkg(name)}>Remove<span class="sr-only"> ${name}</span></sub-button>
                </sub-space>
              </sub-card>`
            })}</sub-grid>`
          : html`<sub-empty-state variant="first-use" heading="No packages on your watchlist" level="4">Search the registry and use "Add selected to watchlist".<sub-button slot="actions" @click=${() => go('packages')}>Find packages</sub-button></sub-empty-state>`}
      </sub-tab-panel>
      <sub-tab-panel label=${`Cities (${settings.watchCities.length})`}>
        ${settings.watchCities.length
          ? html`<sub-grid style="--sub-grid-min: 15rem">${settings.watchCities.map((place) => {
              const w = state.cityData[place.id]
              const f = w?.data
              return html`<sub-card heading=${place.name} level="4">
                ${f
                  ? html`<sub-statistic label=${api.describeWeather(f.current.code).label} value=${String(Math.round(f.current.temperature))} suffix=${f.tempSymbol} raw></sub-statistic>`
                  : w?.status === 'error'
                    ? html`<p class="app-muted">${w.error}</p>`
                    : skeleton(`Loading ${place.name}`, 2)}
                <sub-space slot="footer">
                  <sub-button variant="secondary" @click=${() => { setPlace(place); go('weather') }}>Open<span class="sr-only"> ${place.name}</span></sub-button>
                  <sub-button variant="tertiary" @click=${() => toggleWatchCity(place)}>Remove<span class="sr-only"> ${place.name}</span></sub-button>
                </sub-space>
              </sub-card>`
            })}</sub-grid>`
          : html`<sub-empty-state variant="first-use" heading="No cities saved" level="4">Open Weather, search a city and press "Save city".<sub-button slot="actions" @click=${() => go('weather')}>Open weather</sub-button></sub-empty-state>`}
      </sub-tab-panel>
    </sub-tabs>`

  const settingsView = () => html`
    <sub-form>
      <form class="app-form" @submit=${(e: Event) => {
        e.preventDefault()
        const form = e.target as HTMLFormElement
        const data = new FormData(form)
        settings.name = String(data.get('name') ?? settings.name)
        settings.pkg = String(data.get('pkg') ?? settings.pkg).trim() || settings.pkg
        settings.refreshMinutes = Number(data.get('minutes') ?? 5)
        settings.autoRefresh = data.get('auto') !== null
        settings.notify = data.getAll('notify').map(String)
        persist()
        schedule()
        state.info = idle()
        update()
        app.toast({ message: 'Settings saved', variant: 'success' })
      }}>
        <p class="app-muted">Fields marked <span aria-hidden="true">*</span><span class="sr-only">with an asterisk</span> are required. Everything stays in this browser.</p>
        <sub-input name="name" label="Your name" .value=${settings.name} autocomplete="name" required></sub-input>
        <sub-input name="pkg" label="Default npm package" hint="Shown on the overview" .value=${settings.pkg} required></sub-input>
        <sub-switch name="auto" label="Refresh automatically" ?checked=${settings.autoRefresh}></sub-switch>
        <sub-slider name="minutes" label="Refresh every" min="1" max="30" step="1" .value=${String(settings.refreshMinutes)} unit=" min"></sub-slider>
        <sub-checkbox-group label="Notify me about">
          <sub-checkbox name="notify" value="deploys" label="New releases of watched packages" ?checked=${settings.notify.includes('deploys')}></sub-checkbox>
          <sub-checkbox name="notify" value="weather" label="Rain in my city" ?checked=${settings.notify.includes('weather')}></sub-checkbox>
        </sub-checkbox-group>
        <sub-button-group label="Settings actions" layout="form-actions">
          <sub-button variant="danger" type="button" @click=${() => {
            state.confirmClear = true
            update()
          }}>Clear saved data</sub-button>
          <sub-button type="submit">Save changes</sub-button>
        </sub-button-group>
      </form>
    </sub-form>
    <sub-confirm-dialog .open=${live(state.confirmClear)} heading="Delete everything saved in this browser?" message="Your watchlist, notes and settings will be removed. The live data is not affected." confirm-label="Delete saved data" danger @sub-confirm=${() => {
      try {
        localStorage.removeItem(STORAGE_KEY)
      } catch {
        /* nothing saved anyway */
      }
      Object.assign(settings, structuredClone(DEFAULTS))
      state.confirmClear = false
      state.forecast = idle()
      state.info = idle()
      state.downloads = idle()
      state.repo = idle()
      app.toast({ message: 'Saved data deleted' })
      go('overview')
    }} @sub-cancel=${() => (state.confirmClear = false)}></sub-confirm-dialog>`

  // ------------------------------------------------------------------ header actions
  async function onHeaderSearch(e: Event): Promise<void> {
    const { query } = (e as CustomEvent<{ query: string }>).detail
    void run<void>('suggest', () => undefined, async (signal) => {
      const hits = await api.searchPackages(query, 6, signal)
      state.pkgSuggestions = hits.map((h) => ({ value: h.name, label: h.name, description: `v${h.version} · ${h.description.slice(0, 60)}` }))
    })
  }
  const onHeaderPick = (e: Event) => openPackage((e as CustomEvent<{ value: string }>).detail.value)

  async function onPlaceSearch(e: Event): Promise<void> {
    const { query } = (e as CustomEvent<{ query: string }>).detail
    void run<void>('places', () => undefined, async (signal) => {
      state.places = await api.searchPlaces(query, signal)
      state.placeSuggestions = state.places.map((p) => ({ value: String(p.id), label: p.name, description: [p.region, p.country].filter(Boolean).join(', ') }))
    })
  }
  const onPlacePick = (e: Event) => {
    const place = state.places.find((p) => String(p.id) === (e as CustomEvent<{ value: string }>).detail.value)
    if (place) setPlace(place)
  }

  let timer: ReturnType<typeof setInterval> | undefined
  function schedule(): void {
    clearInterval(timer)
    if (settings.autoRefresh) timer = setInterval(() => loadView(state.view, true), settings.refreshMinutes * 60_000)
  }

  const startTour = () => {
    if (state.view !== 'overview') go('overview', false)
    void app.updateComplete.then(() => requestAnimationFrame(() => surface.querySelector<SubTour>('#app-tour')?.start()))
  }

  // ------------------------------------------------------------------ shell
  const NAV: Array<[View, string]> = [['overview', 'Overview'], ['packages', 'Packages'], ['weather', 'Weather'], ['watchlist', 'Watchlist'], ['settings', 'Settings']]

  const shell = (): TemplateResult => html`
    <sub-layout embedded sider-open class="app-layout" style="--sub-shell-sider-width: 12.5rem">
      <div slot="header" class="app-header">
        <span class="app-brand">Dev Desk</span>
        <div class="app-search">
          <sub-autocomplete id="app-search" label="Find an npm package" remote min-chars="2" max-results="6" .options=${state.pkgSuggestions} @sub-search=${onHeaderSearch} @sub-select=${onHeaderPick}></sub-autocomplete>
        </div>
        <sub-space>
          <sub-icon-button label="Refresh the data" icon="sync" id="app-refresh" @click=${refresh}></sub-icon-button>
          <sub-button variant="secondary" id="app-tour-start" @click=${startTour}>Take the tour</sub-button>
        </sub-space>
      </div>

      <sub-nav-menu id="app-nav" slot="sider" label="Dev Desk sections" @click=${(e: Event) => {
        const a = (e.composedPath()[0] as HTMLElement | undefined)?.closest?.('a[href^="#app-"]')
        if (!a) return
        e.preventDefault()
        go(a.getAttribute('href')!.slice(5) as View)
      }}>
        ${NAV.map(([id, label]) => html`<a href=${`#app-${id}`} aria-current=${state.view === id ? 'page' : nothing}>${label}</a>`)}
      </sub-nav-menu>

      <sub-stack gap="6">
        <div class="app-title">
          <sub-heading level="3" size="2" data-view-title tabindex="-1">${state.view === 'overview' ? `${greeting()}, ${settings.name.split(' ')[0] || 'there'}` : TITLES[state.view]}</sub-heading>
          ${state.updated ? html`<span class="app-muted">Live data, updated ${new Intl.DateTimeFormat('en', { timeStyle: 'short' }).format(state.updated)}</span>` : nothing}
        </div>
        ${state.view === 'overview' ? overview() : state.view === 'packages' ? packagesView() : state.view === 'weather' ? weatherView() : state.view === 'watchlist' ? watchlistView() : settingsView()}
      </sub-stack>

      <span slot="footer">Dev Desk, a sample app built with SUB. Data: Open-Meteo, npm and GitHub.</span>
    </sub-layout>

    <sub-tour id="app-tour">
      <sub-tour-step target="#app-search" heading="Search the npm registry">Type a package name; suggestions come live from the registry.</sub-tour-step>
      <sub-tour-step target="#app-nav" heading="Move around">Five sections. Focus moves to the page title when you switch, so screen readers announce it.</sub-tour-step>
      <sub-tour-step target="#card-weather" heading="Weather from Open-Meteo">Current conditions and the next days for your city. Change the city in Weather.</sub-tour-step>
      <sub-tour-step target="#card-package" heading="Package details">Watch a package to find it later in your watchlist.</sub-tour-step>
      <sub-tour-step target="#card-notes" heading="Team notes">Type @ to mention someone. Notes stay in this browser.</sub-tour-step>
    </sub-tour>`

  // Sample links must not navigate away from the playground
  root.addEventListener('click', (e) => {
    const a = (e.composedPath()[0] as HTMLElement | undefined)?.closest?.('a[href^="#app-"]')
    if (a) e.preventDefault()
  })

  update()
  loadView('overview')
  schedule()
  return app
}
