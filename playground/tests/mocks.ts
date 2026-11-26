import type { Page, Route } from '@playwright/test'

/**
 * The Studio's sample app talks to public APIs (Open-Meteo, npm, GitHub). Tests never touch the network:
 * these deterministic answers stand in for them. `fail` makes one service answer 503 (to test error states).
 */
export type Service = 'geocoding' | 'forecast' | 'npm-search' | 'npm-package' | 'npm-downloads' | 'github'

const installed = new WeakSet<Page>()

const CORS = { 'access-control-allow-origin': '*' }
const json = (route: Route, body: unknown, status = 200) => route.fulfill({ status, contentType: 'application/json', headers: CORS, body: JSON.stringify(body) })

const CITIES: Record<string, { id: number; name: string; country: string; admin1: string; latitude: number; longitude: number }> = {
  mad: { id: 3117735, name: 'Madrid', country: 'Spain', admin1: 'Madrid', latitude: 40.4165, longitude: -3.70256 },
  tok: { id: 1850147, name: 'Tokyo', country: 'Japan', admin1: 'Tokyo', latitude: 35.6895, longitude: 139.69171 },
}

/** Daily downloads: 1000 + 10 * day index, so the last week is 8,820 and the week before 8,330 (+5.9%) */
const DOWNLOADS = Array.from({ length: 30 }, (_, i) => ({ day: `2026-11-${String(i + 1).padStart(2, '0')}`, downloads: 1000 + i * 10 }))

const HITS = ['lit', 'lit-html', 'lit-element', 'litepicker'].map((name, i) => ({
  package: { name, version: `3.${i}.0`, description: `Description of ${name}`, keywords: ['web-components'], date: '2026-11-20T10:00:00.000Z', publisher: { username: 'justinfagnani' } },
  score: { final: 0.9 - i * 0.1 },
}))

export async function mockApis(page: Page, options: { fail?: Service[] } = {}): Promise<{ fail: Set<Service> }> {
  const fail = new Set<Service>(options.fail ?? [])
  if (installed.has(page)) return { fail }
  installed.add(page)
  await page.route(/^https:\/\/(geocoding-api\.open-meteo\.com|api\.open-meteo\.com|registry\.npmjs\.org|api\.npmjs\.org|api\.github\.com)\//, (route) => {
    const url = new URL(route.request().url())
    const service: Service =
      url.hostname.startsWith('geocoding') ? 'geocoding'
      : url.hostname === 'api.open-meteo.com' ? 'forecast'
      : url.hostname === 'api.npmjs.org' ? 'npm-downloads'
      : url.hostname === 'api.github.com' ? 'github'
      : url.pathname.startsWith('/-/v1/search') ? 'npm-search'
      : 'npm-package'
    if (fail.has(service)) return json(route, { error: 'unavailable' }, 503)

    if (service === 'geocoding') {
      const q = (url.searchParams.get('name') ?? '').toLowerCase()
      const hit = Object.entries(CITIES).find(([k]) => q.startsWith(k))?.[1]
      return json(route, hit ? { results: [hit] } : {})
    }
    if (service === 'forecast') {
      const days = Number(url.searchParams.get('forecast_days') ?? 7)
      const f = url.searchParams.get('temperature_unit') === 'fahrenheit'
      const t = (c: number) => Math.round((f ? c * 1.8 + 32 : c) * 10) / 10
      return json(route, {
        current: { time: '2026-11-26T14:00', temperature_2m: t(21.6), apparent_temperature: t(20.1), relative_humidity_2m: 41, weather_code: 2, wind_speed_10m: 12.4, is_day: 1 },
        daily: {
          time: Array.from({ length: days }, (_, i) => `2026-11-${26 + i}`),
          weather_code: Array.from({ length: days }, (_, i) => [2, 0, 61, 3, 71, 45, 95][i % 7]),
          temperature_2m_max: Array.from({ length: days }, (_, i) => t(22 - i)),
          temperature_2m_min: Array.from({ length: days }, (_, i) => t(11 - i)),
          precipitation_probability_max: Array.from({ length: days }, (_, i) => i * 10),
        },
      })
    }
    if (service === 'npm-search') {
      const q = (url.searchParams.get('text') ?? '').toLowerCase()
      return json(route, { objects: q.includes('nothing') ? [] : HITS, total: HITS.length })
    }
    if (service === 'npm-package') {
      const name = decodeURIComponent(url.pathname.split('/')[1] ?? '')
      if (name === 'missing-package') return json(route, { error: 'not found' }, 404)
      return json(route, {
        name,
        version: '3.3.3',
        description: `Description of ${name}`,
        license: 'BSD-3-Clause',
        keywords: ['web-components', 'lit'],
        maintainers: [{ name: 'justinfagnani' }, { name: 'e111077' }],
        dependencies: { 'lit-html': '^3.0.0', '@lit/reactive-element': '^2.0.0' },
        dist: { unpackedSize: 148000, fileCount: 12 },
        repository: { url: 'git+https://github.com/lit/lit.git' },
      })
    }
    if (service === 'npm-downloads') return json(route, { start: '2026-11-01', end: '2026-11-30', package: 'x', downloads: DOWNLOADS })
    return json(route, { stargazers_count: 19500, forks_count: 930, open_issues_count: 210, pushed_at: '2026-11-25T09:00:00Z', license: { spdx_id: 'BSD-3-Clause' } })
  })
  return { fail }
}
