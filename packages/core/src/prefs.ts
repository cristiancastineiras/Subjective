/**
 * What the user (or their device) asked for, in one object: reduced motion, more contrast, forced colours,
 * dark scheme, reduced transparency, reduced data, coarse pointer (touch) and hover support.
 * `watchPreferences` calls you when any of them changes; `applyPreferences` mirrors them as `data-sub-*`
 * attributes so your own CSS can react (`[data-sub-pointer="coarse"] { ... }`).
 */
export interface UserPreferences {
  reducedMotion: boolean
  /** `prefers-contrast` */
  contrast: 'more' | 'less' | 'custom' | 'no-preference'
  colorScheme: 'light' | 'dark'
  /** Windows High Contrast / forced colours mode */
  forcedColors: boolean
  reducedTransparency: boolean
  reducedData: boolean
  /** Primary pointer: `coarse` = a finger, which needs bigger targets */
  pointer: 'fine' | 'coarse' | 'none'
  /** The primary input can hover (so hover must never be the only way to reach something) */
  canHover: boolean
}

const QUERIES = {
  reducedMotion: '(prefers-reduced-motion: reduce)',
  contrastMore: '(prefers-contrast: more)',
  contrastLess: '(prefers-contrast: less)',
  contrastCustom: '(prefers-contrast: custom)',
  dark: '(prefers-color-scheme: dark)',
  forced: '(forced-colors: active)',
  transparency: '(prefers-reduced-transparency: reduce)',
  data: '(prefers-reduced-data: reduce)',
  coarse: '(pointer: coarse)',
  none: '(pointer: none)',
  hover: '(hover: hover)',
} as const

const mq = (q: string): MediaQueryList | undefined => (typeof matchMedia === 'function' ? matchMedia(q) : undefined)

export function getPreferences(): UserPreferences {
  const on = (q: string): boolean => mq(q)?.matches ?? false
  return {
    reducedMotion: on(QUERIES.reducedMotion),
    contrast: on(QUERIES.contrastMore) ? 'more' : on(QUERIES.contrastLess) ? 'less' : on(QUERIES.contrastCustom) ? 'custom' : 'no-preference',
    colorScheme: on(QUERIES.dark) ? 'dark' : 'light',
    forcedColors: on(QUERIES.forced),
    reducedTransparency: on(QUERIES.transparency),
    reducedData: on(QUERIES.data),
    pointer: on(QUERIES.none) ? 'none' : on(QUERIES.coarse) ? 'coarse' : 'fine',
    canHover: on(QUERIES.hover),
  }
}

/** Calls `callback` now? No: only when something changes. Returns the function that stops listening. */
export function watchPreferences(callback: (preferences: UserPreferences) => void): () => void {
  const lists = Object.values(QUERIES).map(mq).filter((m): m is MediaQueryList => Boolean(m))
  const onChange = () => callback(getPreferences())
  for (const list of lists) list.addEventListener('change', onChange)
  return () => {
    for (const list of lists) list.removeEventListener('change', onChange)
  }
}

/**
 * Mirror the preferences on `target` (default `<html>`) as attributes and keep them current:
 * `data-sub-contrast="more"`, `data-sub-pointer="coarse"`, `data-sub-forced-colors`, `data-sub-reduced-motion`,
 * `data-sub-reduced-transparency`, `data-sub-reduced-data`, `data-sub-can-hover="false"`. Returns a stop function.
 */
export function applyPreferences(target: HTMLElement = document.documentElement): () => void {
  const paint = (p: UserPreferences) => {
    const set = (name: string, on: boolean) => (on ? target.setAttribute(name, '') : target.removeAttribute(name))
    target.dataset.subContrast = p.contrast
    target.dataset.subPointer = p.pointer
    target.dataset.subCanHover = String(p.canHover)
    set('data-sub-forced-colors', p.forcedColors)
    set('data-sub-reduced-motion', p.reducedMotion)
    set('data-sub-reduced-transparency', p.reducedTransparency)
    set('data-sub-reduced-data', p.reducedData)
  }
  paint(getPreferences())
  return watchPreferences(paint)
}
