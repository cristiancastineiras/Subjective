/**
 * What every framework example shares: the demos of the playground (one card per component), a parser that turns
 * each demo's markup into a tree the framework renders with ITS OWN elements and components (no innerHTML, so the
 * framework package is what is being exercised), and the conversion from HTML attributes to typed properties
 * read from the component contract (custom-elements.json -> generated/elements.ts).
 */
import { configure } from '@sub/core'
import { ELEMENTS } from './generated/elements'

export { ELEMENTS }

export interface Demo {
  id: string
  title: string
  group: string
  html: string
  /** Imperative wiring of the playground demo (properties such as table rows); runs once the framework rendered the card */
  setup?: (preview: HTMLElement, log: (message: string) => void) => void
}

const modules = import.meta.glob<{ default: Demo }>('../../playground/src/demos/*.ts', { eager: true })
export const demos: Demo[] = Object.values(modules)
  .map((m) => m.default)
  .sort((a, b) => a.group.localeCompare(b.group) || a.title.localeCompare(b.title))

export type GNode = string | { tag: string; attrs: Record<string, string>; children: GNode[] }

/** Markup -> tree of tags, attributes and text, parsed by the browser */
export function parseHtml(html: string): GNode[] {
  const template = document.createElement('template')
  template.innerHTML = html.trim()
  const walk = (node: Node): GNode | null => {
    if (node.nodeType === Node.TEXT_NODE) return node.textContent?.trim() ? (node.textContent ?? '') : null
    if (node.nodeType !== Node.ELEMENT_NODE) return null
    const el = node as Element
    return { tag: el.localName, attrs: Object.fromEntries([...el.attributes].map((a) => [a.name, a.value])), children: [...el.childNodes].map(walk).filter((n): n is GNode => n !== null) }
  }
  return [...template.content.childNodes].map(walk).filter((n): n is GNode => n !== null)
}

/** HTML attributes of a SUB element -> typed properties (`disabled=""` -> `disabled: true`, `max="5"` -> `max: 5`) */
export function toProps(tag: string, attrs: Record<string, string>): Record<string, unknown> {
  const known = ELEMENTS[tag]?.attributes ?? {}
  const out: Record<string, unknown> = {}
  for (const [name, value] of Object.entries(attrs)) {
    const prop = known[name]
    if (!prop) out[name] = value
    else out[prop[0]] = prop[1] === 'boolean' ? true : prop[1] === 'number' ? Number(value) : value
  }
  return out
}

/** `onSubSelect` for `sub-select` (React and Vue component props) */
export const handlerName = (event: string) => `on${event.replace(/(^|-)(\w)/g, (_, __, c: string) => c.toUpperCase())}`

/** One line for a card's event log */
export function describe(event: Event): string {
  const detail = (event as CustomEvent).detail
  const target = event.currentTarget as (HTMLElement & { value?: unknown; checked?: unknown }) | null
  const state = detail && typeof detail === 'object' ? JSON.stringify(detail, (k, v) => (v instanceof HTMLElement ? `<${v.localName}>` : v)) : target && 'value' in target ? `value=${JSON.stringify(target.value)}` : ''
  return `${event.type} ${state}`.trim().slice(0, 160)
}

const ANY_SUB = Object.keys(ELEMENTS).join(',')

/** Counts the cards whose first component is registered and rendered: what the status line and the tests read */
export function rendered(root: ParentNode = document): { ok: number; total: number; missing: string[] } {
  const cards = [...root.querySelectorAll<HTMLElement>('[data-card]')]
  const missing = cards
    .filter((card) => {
      const el = card.querySelector('[data-preview]')?.querySelector(ANY_SUB)
      return !el || !customElements.get(el.localName) || !el.shadowRoot || el.shadowRoot.childNodes.length === 0
    })
    .map((card) => card.dataset.card ?? '')
  return { ok: cards.length - missing.length, total: cards.length, missing }
}

/** The fake router of the examples: SUB links (button href, breadcrumbs...) call it instead of reloading */
export function routeWith(onRoute: (href: string) => void): void {
  configure({ navigate: (href) => onRoute(href) })
}

/** Shown in the form card after a native submit: every SUB control is form-associated */
export const formEntries = (form: HTMLFormElement) =>
  [...new FormData(form)].map(([k, v]) => `${k}=${String(v)}`).join(', ') || '(nothing)'
