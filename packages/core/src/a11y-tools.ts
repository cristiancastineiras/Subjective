import { deepQueryAll, getTabbable, isVisible } from './focus'
import { contrastRatio } from './theme'

/**
 * Small tools for developers while they build: what is the accessible name of this, does this colour pair
 * pass, is this big enough, in which order does Tab go, what is wrong with this markup. They help; they do
 * not replace `audit()` (which measures rendered components) or a person with a screen reader.
 * Everything sees through open shadow roots.
 */

// ---------------------------------------------------------------- accessible name

const NAME_FROM_CONTENT = new Set(['button', 'link', 'heading', 'tab', 'option', 'menuitem', 'menuitemcheckbox', 'menuitemradio', 'treeitem', 'checkbox', 'radio', 'switch', 'cell', 'columnheader', 'rowheader', 'tooltip'])

const IMPLICIT_ROLE: Record<string, string> = {
  a: 'link',
  button: 'button',
  summary: 'button',
  select: 'combobox',
  textarea: 'textbox',
  h1: 'heading',
  h2: 'heading',
  h3: 'heading',
  h4: 'heading',
  h5: 'heading',
  h6: 'heading',
  img: 'img',
  nav: 'navigation',
  main: 'main',
  dialog: 'dialog',
  table: 'table',
  li: 'listitem',
  th: 'columnheader',
}

const INPUT_ROLE: Record<string, string> = { checkbox: 'checkbox', radio: 'radio', range: 'slider', number: 'spinbutton', button: 'button', submit: 'button', reset: 'button', image: 'button', search: 'searchbox' }

/** The ARIA role of an element: the `role` attribute, else the one its tag implies ('' when none) */
export function roleOf(el: Element): string {
  const explicit = el.getAttribute('role')?.split(/\s+/)[0]
  if (explicit) return explicit
  const tag = el.localName
  if (tag === 'input') return INPUT_ROLE[(el as HTMLInputElement).type] ?? 'textbox'
  if (tag === 'a' && !el.hasAttribute('href')) return ''
  return IMPLICIT_ROLE[tag] ?? ''
}

function hiddenFromAt(el: Element): boolean {
  if (el.getAttribute('aria-hidden') === 'true') return true
  if (!(el instanceof HTMLElement)) return false
  const style = getComputedStyle(el)
  return Boolean(el.hidden) || style.display === 'none' || style.visibility === 'hidden'
}

function textOf(node: Node, skipHidden = true): string {
  if (node.nodeType === Node.TEXT_NODE) return node.textContent ?? ''
  if (!(node instanceof Element)) return ''
  if (skipHidden && hiddenFromAt(node)) return ''
  if (node.localName === 'slot') return (node as HTMLSlotElement).assignedNodes({ flatten: true }).map((n) => textOf(n, skipHidden)).join(' ')
  const label = node.getAttribute('aria-label')
  if (label) return label
  if (node.localName === 'img') return node.getAttribute('alt') ?? ''
  const children = node.shadowRoot ? [...node.shadowRoot.childNodes] : [...node.childNodes]
  return children.map((n) => textOf(n, skipHidden)).join(node.shadowRoot ? ' ' : '')
}

const clean = (s: string): string => s.replace(/\s+/g, ' ').trim()

/**
 * The accessible name of `el` (simplified "accname"): aria-labelledby, aria-label, native labels (`<label>`,
 * `alt`, `<legend>`, `<caption>`, SVG `<title>`, button value), the content for roles that take their name from
 * it, then `title`. Returns '' when it has none. Use it in tests and while debugging.
 */
export function accessibleName(el: Element): string {
  const root = el.getRootNode() as Document | ShadowRoot
  const ids = el.getAttribute('aria-labelledby')?.split(/\s+/).filter(Boolean)
  if (ids?.length) {
    const named = ids.map((id) => root.getElementById?.(id)).filter((n): n is HTMLElement => Boolean(n))
    if (named.length) return clean(named.map((n) => textOf(n, false)).join(' '))
  }
  const aria = el.getAttribute('aria-label')
  if (aria?.trim()) return clean(aria)
  const labels = (el as HTMLInputElement).labels
  if (labels?.length) return clean([...labels].map((l) => textOf(l)).join(' '))
  if (el.localName === 'img' || (el.localName === 'input' && (el as HTMLInputElement).type === 'image')) return clean(el.getAttribute('alt') ?? '')
  if (el.localName === 'input' && ['button', 'submit', 'reset'].includes((el as HTMLInputElement).type)) return clean((el as HTMLInputElement).value)
  if (el.localName === 'fieldset') return clean(textOf(el.querySelector(':scope > legend') ?? document.createComment('')))
  if (el.localName === 'table') return clean(textOf(el.querySelector(':scope > caption') ?? document.createComment('')))
  if (el.localName === 'svg') return clean(el.querySelector(':scope > title')?.textContent ?? '')
  if (NAME_FROM_CONTENT.has(roleOf(el)) || ['button', 'a', 'summary', 'label', 'legend'].includes(el.localName)) {
    const text = clean(textOf(el))
    if (text) return text
  }
  return clean(el.getAttribute('title') ?? '')
}

// ---------------------------------------------------------------- colour contrast

export interface ContrastResult {
  ratio: number
  /** The ratio the chosen kind of content needs at the chosen level */
  required: number
  passes: boolean
  /** Highest WCAG level reached: AAA, AA, or `fail` (large text and UI count with their own thresholds) */
  level: 'AAA' | 'AA' | 'fail'
}

export interface ContrastOptions {
  /** `text` (default: 4.5 AA / 7 AAA), `large` (3 / 4.5: from 24px, or 18.66px bold) or `ui` (3: borders, icons, focus rings) */
  kind?: 'text' | 'large' | 'ui'
  /** Level to test against (default AA) */
  level?: 'AA' | 'AAA'
}

function toHex(color: string): string {
  if (/^#[0-9a-f]{6}$/i.test(color)) return color
  if (/^#[0-9a-f]{3}$/i.test(color)) return `#${[...color.slice(1)].map((c) => c + c).join('')}`
  const probe = document.createElement('span')
  probe.style.color = color
  document.body.append(probe)
  const rgb = getComputedStyle(probe).color.match(/\d+(\.\d+)?/g)?.slice(0, 3).map(Number)
  probe.remove()
  if (!rgb || rgb.length < 3) throw new Error(`Not a colour: ${color}`)
  return `#${rgb.map((n) => Math.round(n).toString(16).padStart(2, '0')).join('')}`
}

/** Contrast of two CSS colours (hex, rgb(), names...) against WCAG 2.2: ratio, the ratio needed, pass/fail */
export function checkContrast(foreground: string, background: string, options: ContrastOptions = {}): ContrastResult {
  const ratio = Math.round(contrastRatio(toHex(foreground), toHex(background)) * 100) / 100
  const kind = options.kind ?? 'text'
  const aa = kind === 'text' ? 4.5 : 3
  const aaa = kind === 'text' ? 7 : kind === 'large' ? 4.5 : 3
  const required = options.level === 'AAA' ? aaa : aa
  return { ratio, required, passes: ratio >= required, level: ratio >= aaa ? 'AAA' : ratio >= aa ? 'AA' : 'fail' }
}

// ---------------------------------------------------------------- target size

export interface TargetSize {
  width: number
  height: number
  /** WCAG 2.5.8 (AA): at least 24 x 24 CSS px */
  aa: boolean
  /** WCAG 2.5.5 (AAA) and SubUX: at least 44 x 44 CSS px */
  aaa: boolean
}

export function targetSize(el: Element): TargetSize {
  const r = el.getBoundingClientRect()
  return { width: Math.round(r.width * 10) / 10, height: Math.round(r.height * 10) / 10, aa: r.width >= 24 && r.height >= 24, aaa: r.width >= 44 && r.height >= 44 }
}

// ---------------------------------------------------------------- tab order

export interface TabStop {
  element: HTMLElement
  /** 1-based position in the order Tab visits */
  order: number
  role: string
  name: string
  tabindex: number
  /** Short problem descriptions (empty when the stop is fine) */
  issues: string[]
}

const INTERACTIVE_ROLES = new Set(['button', 'link', 'textbox', 'searchbox', 'combobox', 'checkbox', 'radio', 'switch', 'slider', 'spinbutton', 'tab', 'menuitem', 'option', 'treeitem'])

/**
 * Every stop of the Tab order under `root`, in the order the browser visits it (positive tabindex first),
 * each with its role, accessible name and problems: a positive tabindex, no accessible name, focusable but
 * hidden from assistive technology, a target under 24px.
 */
export function tabOrder(root: ParentNode = document): TabStop[] {
  const stops = getTabbable(root)
  const positive = stops.filter((el) => el.tabIndex > 0).sort((a, b) => a.tabIndex - b.tabIndex)
  const ordered = [...positive, ...stops.filter((el) => el.tabIndex <= 0)]
  return ordered.map((element, i) => {
    const role = roleOf(element)
    const name = accessibleName(element)
    const issues: string[] = []
    if (element.tabIndex > 0) issues.push(`tabindex="${element.tabIndex}" overrides the natural order; use 0 or the DOM order`)
    if (INTERACTIVE_ROLES.has(role) && !name) issues.push('no accessible name')
    if (element.closest('[aria-hidden="true"]')) issues.push('focusable inside aria-hidden="true"')
    if (!targetSize(element).aa) issues.push('target smaller than 24x24px')
    return { element, order: i + 1, role, name, tabindex: element.tabIndex, issues }
  })
}

// ---------------------------------------------------------------- markup lint

export interface A11yIssue {
  rule: 'img-alt' | 'control-name' | 'duplicate-id' | 'heading-order' | 'positive-tabindex' | 'aria-reference' | 'link-target'
  element: Element
  message: string
}

const ARIA_REFS = ['aria-labelledby', 'aria-describedby', 'aria-controls', 'aria-owns', 'aria-activedescendant', 'aria-details', 'aria-errormessage', 'aria-flowto']

/**
 * A quick lint of live markup (including open shadow roots) for the mistakes that cause most real
 * problems: images without `alt`, controls without a name, duplicate ids, a heading level that jumps,
 * a positive tabindex, aria-* attributes that point at ids that do not exist, links that open a new tab
 * without saying so. It is deliberately small; `audit()` and axe go further.
 */
export function lintA11y(root: ParentNode = document): A11yIssue[] {
  const issues: A11yIssue[] = []
  const add = (rule: A11yIssue['rule'], element: Element, message: string) => issues.push({ rule, element, message })
  const all = deepQueryAll<HTMLElement>(root, '*')

  for (const img of all.filter((e) => e.localName === 'img' && !e.hasAttribute('alt') && e.getAttribute('role') !== 'presentation')) add('img-alt', img, 'Image without alt (use alt="" when it is decorative)')

  for (const el of all) {
    const role = roleOf(el)
    const interactive = (['button', 'a', 'select', 'textarea', 'summary'].includes(el.localName) && (el.localName !== 'a' || el.hasAttribute('href'))) || (el.localName === 'input' && (el as HTMLInputElement).type !== 'hidden') || ['button', 'link', 'checkbox', 'switch', 'tab', 'menuitem'].includes(el.getAttribute('role') ?? '')
    if (interactive && !hiddenFromAt(el) && !accessibleName(el) && role !== '') add('control-name', el, `${role || el.localName} has no accessible name`)
    if (el.tabIndex > 0) add('positive-tabindex', el, `tabindex="${el.tabIndex}": positive values break the natural order`)
    for (const attr of ARIA_REFS) {
      const value = el.getAttribute(attr)
      if (!value) continue
      const scope = el.getRootNode() as Document | ShadowRoot
      for (const id of value.split(/\s+/).filter(Boolean)) if (!scope.getElementById?.(id)) add('aria-reference', el, `${attr}="${id}" points at an id that is not in the same tree`)
    }
    if (el.localName === 'a' && el.getAttribute('target') === '_blank' && !/new (tab|window)/i.test(accessibleName(el))) add('link-target', el, 'Link opens a new tab without saying so (add "(opens in a new tab)")')
  }

  // duplicate ids, per tree (an id may repeat across shadow roots)
  const seen = new Map<Node, Set<string>>()
  for (const el of all.filter((e) => e.id)) {
    const scope = el.getRootNode()
    const ids = seen.get(scope) ?? seen.set(scope, new Set()).get(scope)!
    if (ids.has(el.id)) add('duplicate-id', el, `Duplicate id "${el.id}"`)
    ids.add(el.id)
  }

  // headings: the level may go down by any amount but up by one at a time
  let previous = 0
  for (const h of all.filter((e) => /^h[1-6]$/.test(e.localName) || e.getAttribute('role') === 'heading')) {
    if (!isVisible(h)) continue
    const level = Number(h.localName[1] ?? h.getAttribute('aria-level') ?? 2)
    if (previous && level > previous + 1) add('heading-order', h, `Heading level jumps from h${previous} to h${level}`)
    previous = level
  }
  return issues
}

// ---------------------------------------------------------------- small DOM helpers

/** A visually hidden `<span>` with `text`, for assistive technology only (inline styles: no stylesheet needed) */
export function srOnly(text: string): HTMLSpanElement {
  const span = document.createElement('span')
  span.textContent = text
  span.style.cssText = 'position:absolute;inline-size:1px;block-size:1px;margin:-1px;padding:0;overflow:hidden;clip-path:inset(50%);white-space:nowrap;border:0'
  return span
}

/** The ids listed in an attribute such as aria-describedby */
export function ariaIds(el: Element, attribute: string): string[] {
  return el.getAttribute(attribute)?.split(/\s+/).filter(Boolean) ?? []
}

/** Add an id to aria-describedby / aria-labelledby / aria-controls... without clobbering the others */
export function addAriaId(el: Element, attribute: string, id: string): void {
  const ids = ariaIds(el, attribute)
  if (!ids.includes(id)) el.setAttribute(attribute, [...ids, id].join(' '))
}

/** Remove one id from such a list (and the attribute itself when it was the last) */
export function removeAriaId(el: Element, attribute: string, id: string): void {
  const rest = ariaIds(el, attribute).filter((i) => i !== id)
  if (rest.length) el.setAttribute(attribute, rest.join(' '))
  else el.removeAttribute(attribute)
}
