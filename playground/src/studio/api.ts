/**
 * Public, key-less APIs the Studio's sample app talks to (all send CORS headers):
 *  - Open-Meteo (geocoding + forecast)   https://open-meteo.com
 *  - The npm registry (search, package)   https://registry.npmjs.org
 *  - npm download counts                  https://api.npmjs.org
 *  - GitHub REST (repository stats)       https://api.github.com   (60 requests/hour without a token: failures are handled)
 * Responses are cached for five minutes; every call has a timeout and a human error message.
 */

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status = 0,
  ) {
    super(message)
  }
}

const cache = new Map<string, { at: number; value: unknown }>()
const TTL = 5 * 60_000

async function getJson<T>(url: string, { signal, force = false, service = 'The service' }: { signal?: AbortSignal; force?: boolean; service?: string } = {}): Promise<T> {
  const hit = cache.get(url)
  if (!force && hit && Date.now() - hit.at < TTL) return hit.value as T
  const timeout = AbortSignal.timeout(8000)
  const both = signal ? AbortSignal.any([signal, timeout]) : timeout
  let response: Response
  try {
    response = await fetch(url, { signal: both, headers: { Accept: 'application/json' } })
  } catch (error) {
    if (signal?.aborted) throw error // the caller moved on: not an error to show
    throw new ApiError(`${service} did not answer. Check your connection and try again.`)
  }
  if (!response.ok) {
    throw new ApiError(
      response.status === 404 ? `${service} has nothing under that name.` : response.status === 403 || response.status === 429 ? `${service} is rate limiting this browser. Try again in a few minutes.` : `${service} returned an error (${response.status}).`,
      response.status,
    )
  }
  const value = (await response.json()) as T
  cache.set(url, { at: Date.now(), value })
  return value
}

/** Forget the cached answers (the "Refresh" button) */
export const clearCache = (): void => cache.clear()

// ---------------------------------------------------------------- weather

export interface Place {
  id: number
  name: string
  country: string
  region: string
  latitude: number
  longitude: number
}

export type TempUnit = 'celsius' | 'fahrenheit'

export interface Forecast {
  place: Place
  unit: TempUnit
  tempSymbol: string
  windUnit: string
  current: { time: string; temperature: number; feelsLike: number; humidity: number; wind: number; code: number; isDay: boolean }
  daily: Array<{ date: string; code: number; max: number; min: number; rain: number }>
}

interface GeoResponse {
  results?: Array<{ id: number; name: string; country?: string; admin1?: string; latitude: number; longitude: number }>
}

export async function searchPlaces(query: string, signal?: AbortSignal): Promise<Place[]> {
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=6&language=en&format=json`
  const data = await getJson<GeoResponse>(url, { signal, service: 'The place search' })
  return (data.results ?? []).map((r) => ({ id: r.id, name: r.name, country: r.country ?? '', region: r.admin1 ?? '', latitude: r.latitude, longitude: r.longitude }))
}

interface ForecastResponse {
  current: { time: string; temperature_2m: number; apparent_temperature: number; relative_humidity_2m: number; weather_code: number; wind_speed_10m: number; is_day: number }
  daily: { time: string[]; weather_code: number[]; temperature_2m_max: number[]; temperature_2m_min: number[]; precipitation_probability_max: Array<number | null> }
}

export async function getForecast(place: Place, unit: TempUnit, days: number, options: { signal?: AbortSignal; force?: boolean } = {}): Promise<Forecast> {
  const imperial = unit === 'fahrenheit'
  const params = new URLSearchParams({
    latitude: String(place.latitude),
    longitude: String(place.longitude),
    current: 'temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,wind_speed_10m,is_day',
    daily: 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max',
    timezone: 'auto',
    forecast_days: String(days),
    temperature_unit: unit,
    wind_speed_unit: imperial ? 'mph' : 'kmh',
  })
  const d = await getJson<ForecastResponse>(`https://api.open-meteo.com/v1/forecast?${params}`, { ...options, service: 'The weather service' })
  return {
    place,
    unit,
    tempSymbol: imperial ? '°F' : '°C',
    windUnit: imperial ? 'mph' : 'km/h',
    current: { time: d.current.time, temperature: d.current.temperature_2m, feelsLike: d.current.apparent_temperature, humidity: d.current.relative_humidity_2m, wind: d.current.wind_speed_10m, code: d.current.weather_code, isDay: d.current.is_day === 1 },
    daily: d.daily.time.map((date, i) => ({ date, code: d.daily.weather_code[i] ?? 0, max: d.daily.temperature_2m_max[i] ?? 0, min: d.daily.temperature_2m_min[i] ?? 0, rain: d.daily.precipitation_probability_max[i] ?? 0 })),
  }
}

/** WMO weather code -> words and a Material Symbol (the words carry the meaning; the icon decorates) */
export function describeWeather(code: number): { label: string; icon: string } {
  if (code === 0) return { label: 'Clear sky', icon: 'wb_sunny' }
  if (code <= 2) return { label: code === 1 ? 'Mainly clear' : 'Partly cloudy', icon: 'partly_cloudy_day' }
  if (code === 3) return { label: 'Overcast', icon: 'cloud' }
  if (code === 45 || code === 48) return { label: 'Fog', icon: 'foggy' }
  if (code >= 51 && code <= 57) return { label: 'Drizzle', icon: 'rainy' }
  if ((code >= 61 && code <= 67) || (code >= 80 && code <= 82)) return { label: code >= 80 ? 'Rain showers' : 'Rain', icon: 'rainy' }
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return { label: 'Snow', icon: 'weather_snowy' }
  if (code >= 95) return { label: 'Thunderstorm', icon: 'thunderstorm' }
  return { label: 'Unknown conditions', icon: 'cloud' }
}

// ---------------------------------------------------------------- npm

export interface PackageHit {
  name: string
  version: string
  description: string
  keywords: string[]
  /** ISO date of the latest publish */
  date: string
  publisher: string
  /** npms.io-style quality score, 0-100 */
  score: number
}

interface SearchResponse {
  objects: Array<{ package: { name: string; version: string; description?: string; keywords?: string[]; date: string; publisher?: { username?: string } }; score: { final: number } }>
}

export async function searchPackages(query: string, size = 10, signal?: AbortSignal): Promise<PackageHit[]> {
  const url = `https://registry.npmjs.org/-/v1/search?text=${encodeURIComponent(query)}&size=${size}`
  const data = await getJson<SearchResponse>(url, { signal, service: 'The npm registry' })
  return data.objects.map((o) => ({
    name: o.package.name,
    version: o.package.version,
    description: o.package.description ?? '',
    keywords: o.package.keywords ?? [],
    date: o.package.date,
    publisher: o.package.publisher?.username ?? '',
    score: Math.round(o.score.final * 100),
  }))
}

export interface PackageInfo {
  name: string
  version: string
  description: string
  license: string
  homepage: string
  keywords: string[]
  maintainers: string[]
  dependencies: number
  unpackedSize: number
  files: number
  /** `owner/repo` when the package points at GitHub */
  github: string
}

interface LatestResponse {
  name: string
  version: string
  description?: string
  license?: string | { type?: string }
  homepage?: string
  keywords?: string[]
  maintainers?: Array<{ name: string }>
  dependencies?: Record<string, string>
  dist?: { unpackedSize?: number; fileCount?: number }
  repository?: string | { url?: string }
}

const registryPath = (name: string): string => name.replace('/', '%2f')

export function githubSlug(repository: string | { url?: string } | undefined): string {
  const url = typeof repository === 'string' ? repository : (repository?.url ?? '')
  return url.match(/github\.com[/:]([^/]+\/[^/#.]+(?:\.[^/#.]+)*?)(?:\.git)?(?:[#/].*)?$/)?.[1] ?? ''
}

export async function getPackage(name: string, options: { signal?: AbortSignal; force?: boolean } = {}): Promise<PackageInfo> {
  const d = await getJson<LatestResponse>(`https://registry.npmjs.org/${registryPath(name)}/latest`, { ...options, service: 'The npm registry' })
  return {
    name: d.name,
    version: d.version,
    description: d.description ?? '',
    license: typeof d.license === 'string' ? d.license : (d.license?.type ?? 'Unknown'),
    homepage: d.homepage ?? '',
    keywords: d.keywords ?? [],
    maintainers: (d.maintainers ?? []).map((m) => m.name),
    dependencies: Object.keys(d.dependencies ?? {}).length,
    unpackedSize: d.dist?.unpackedSize ?? 0,
    files: d.dist?.fileCount ?? 0,
    github: githubSlug(d.repository),
  }
}

export interface Downloads {
  name: string
  days: Array<{ day: string; downloads: number }>
  /** Last 7 days */
  week: number
  /** The 7 days before them */
  previousWeek: number
  total: number
}

interface DownloadsResponse {
  downloads: Array<{ day: string; downloads: number }>
}

export async function getDownloads(name: string, options: { signal?: AbortSignal; force?: boolean } = {}): Promise<Downloads> {
  const d = await getJson<DownloadsResponse>(`https://api.npmjs.org/downloads/range/last-month/${name}`, { ...options, service: 'The npm download service' })
  const days = d.downloads
  const sum = (list: typeof days) => list.reduce((n, x) => n + x.downloads, 0)
  return { name, days, week: sum(days.slice(-7)), previousWeek: sum(days.slice(-14, -7)), total: sum(days) }
}

// ---------------------------------------------------------------- GitHub

export interface RepoStats {
  slug: string
  stars: number
  forks: number
  issues: number
  pushedAt: string
  license: string
}

interface RepoResponse {
  stargazers_count: number
  forks_count: number
  open_issues_count: number
  pushed_at: string
  license?: { spdx_id?: string } | null
}

export async function getRepo(slug: string, options: { signal?: AbortSignal; force?: boolean } = {}): Promise<RepoStats> {
  const d = await getJson<RepoResponse>(`https://api.github.com/repos/${slug}`, { ...options, service: 'GitHub' })
  return { slug, stars: d.stargazers_count, forks: d.forks_count, issues: d.open_issues_count, pushedAt: d.pushed_at, license: d.license?.spdx_id ?? '' }
}

// ---------------------------------------------------------------- formatting

export const compact = (n: number): string => new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 }).format(n)
export const bytes = (n: number): string => (n >= 1_048_576 ? `${(n / 1_048_576).toFixed(1)} MB` : n >= 1024 ? `${Math.round(n / 1024)} kB` : `${n} B`)
export const shortDate = (iso: string): string => new Intl.DateTimeFormat('en', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(iso))
export const weekday = (iso: string): string => new Intl.DateTimeFormat('en', { weekday: 'short', day: 'numeric' }).format(new Date(`${iso}T12:00:00`))

/** Percentage change as text: `{ direction, text }` for <sub-statistic> */
export function trend(now: number, before: number): { trend: 'up' | 'down' | 'flat'; text: string } {
  if (!before) return { trend: 'flat', text: 'no earlier data' }
  const pct = ((now - before) / before) * 100
  if (Math.abs(pct) < 0.5) return { trend: 'flat', text: 'same as the week before' }
  return { trend: pct > 0 ? 'up' : 'down', text: `${Math.abs(pct).toFixed(1)}% vs the week before` }
}
