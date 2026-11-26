/**
 * Set by `audit()` while it moves focus to measure focus rings. Controls must not treat that
 * synthetic blur as the user leaving the field (no validation errors on a pristine form).
 */
export const auditState = { running: false }

let counter = 0

/** Unique id, only needed when one element must reference another across the light DOM. */
export const uid = (prefix = 'sub'): string => `${prefix}-${++counter}`

/** Register a custom element once (safe to call from several `defineX`). */
export function define(tag: string, ctor: CustomElementConstructor): void {
  if (!customElements.get(tag)) customElements.define(tag, ctor)
}

/**
 * Dispatch a CustomEvent from `host`. Returns false when a listener called preventDefault().
 * Defaults: bubbles + composed (so it crosses shadow roots), cancelable only on request.
 */
export function emit<T>(host: Element, name: string, detail?: T, init: EventInit = {}): boolean {
  return host.dispatchEvent(new CustomEvent<T>(name, { bubbles: true, composed: true, detail: detail as T, ...init }))
}

const warned = new Set<string>()
/** One-time developer warning for broken accessibility contracts (e.g. icon button without label). */
export function warn(message: string): void {
  if (warned.has(message)) return
  warned.add(message)
  console.warn(`[sub] ${message}`)
}

/** Move focus to `el`, making non-focusable targets (headings, containers) focusable first. */
export function focusElement(el: HTMLElement | null | undefined): void {
  if (!el) return
  if (!el.matches('a[href],button,input,select,textarea,[tabindex]')) el.setAttribute('tabindex', '-1')
  el.focus()
}

/** Wrap `i` into [0, length) */
export const wrap = (i: number, length: number): number => ((i % length) + length) % length

/** Debounce for input-driven work (autocomplete etc.) */
export function debounce<A extends unknown[]>(fn: (...args: A) => void, ms: number): ((...args: A) => void) & { cancel(): void } {
  let t: ReturnType<typeof setTimeout> | undefined
  const run = (...args: A) => {
    clearTimeout(t)
    t = setTimeout(() => fn(...args), ms)
  }
  run.cancel = () => clearTimeout(t)
  return run
}
