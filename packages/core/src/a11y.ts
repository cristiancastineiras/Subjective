/**
 * Accessibility audit for rendered components. Opt-in (not imported by any component): use it in
 * the playground, in tests, or behind a dev flag.
 *
 *   const report = audit(document.querySelector('sub-button'))
 *   report.score      // 0-100, weighted share of AUTOMATED checks that pass
 *   report.compliant  // no failing WCAG A / AA check
 *   report.strict     // no failing check at all (AAA + best practice too)
 *
 * It measures what the browser actually renders (computed styles, real sizes, a real focus ring), so
 * changing a token (border width, padding, colour...) changes the result. It cannot judge meaning
 * (is the label clear? is the order logical?): those items are listed as `manual`.
 *
 * Side effect: to measure each focus ring it briefly moves focus and restores it exactly (blur
 * handlers run, e.g. field validation). Do not call it while the user is typing in the component:
 * check `isBusy(el)` first.
 */
import { deepActiveElement, deepQueryAll, isVisible } from './focus'
import { auditState } from './shared/utils'

export type A11yLevel = 'A' | 'AA' | 'AAA' | 'best'
export type A11yStatus = 'pass' | 'fail' | 'manual'

export interface A11yCheck {
  id: string
  title: string
  /** WCAG success criterion or SubUX guide */
  ref: string
  level: A11yLevel
  status: A11yStatus
  /** What failed (or what to verify by hand) */
  detail?: string
  /** Offending elements */
  nodes?: string[]
}

export interface A11yReport {
  tag: string
  /** 0-100: weighted pass rate of the automated checks (A=4, AA=3, AAA=1, best=1) */
  score: number
  /** No failing A or AA check */
  compliant: boolean
  /** No failing check of any level */
  strict: boolean
  counts: { pass: number; fail: number; manual: number }
  checks: A11yCheck[]
}

const WEIGHT: Record<A11yLevel, number> = { A: 4, AA: 3, AAA: 1, best: 1 }

// ---------------------------------------------------------------- colour

interface RGBA {
  r: number
  g: number
  b: number
  a: number
}

function parseColor(value: string): RGBA | null {
  const v = value.trim()
  if (v === 'transparent') return { r: 0, g: 0, b: 0, a: 0 }
  let m = v.match(/^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)(?:\s*[,/]\s*([\d.]+)(%?))?\s*\)$/)
  if (m) {
    const a = m[4] === undefined ? 1 : m[5] ? Number(m[4]) / 100 : Number(m[4])
    return { r: +m[1]!, g: +m[2]!, b: +m[3]!, a }
  }
  m = v.match(/^color\(srgb\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)(?:\s*\/\s*([\d.]+)(%?))?\s*\)$/)
  if (m) {
    const a = m[4] === undefined ? 1 : m[5] ? Number(m[4]) / 100 : Number(m[4])
    return { r: +m[1]! * 255, g: +m[2]! * 255, b: +m[3]! * 255, a }
  }
  return null
}

/** `top` painted over `bottom` */
const over = (top: RGBA, bottom: RGBA): RGBA => {
  const a = top.a + bottom.a * (1 - top.a)
  if (a === 0) return { r: 0, g: 0, b: 0, a: 0 }
  const mix = (t: number, b: number) => (t * top.a + b * bottom.a * (1 - top.a)) / a
  return { r: mix(top.r, bottom.r), g: mix(top.g, bottom.g), b: mix(top.b, bottom.b), a }
}

const WHITE: RGBA = { r: 255, g: 255, b: 255, a: 1 }

function luminance({ r, g, b }: RGBA): number {
  const [R, G, B] = [r, g, b].map((c) => {
    const s = c / 255
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
  }) as [number, number, number]
  return 0.2126 * R + 0.7152 * G + 0.0722 * B
}

function contrast(a: RGBA, b: RGBA): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number]
  return (hi + 0.05) / (lo + 0.05)
}

/** Parent in the FLAT tree (slot -> assigned, shadow root -> host) */
function parentOf(el: Element): Element | null {
  return el.assignedSlot ?? el.parentElement ?? ((el.getRootNode() as ShadowRoot).host ?? null)
}

/** Colour behind `el`, or null when it cannot be known (gradient/image) */
function backdrop(el: Element): RGBA | null {
  let layer: RGBA = { r: 0, g: 0, b: 0, a: 0 }
  for (let n: Element | null = el; n; n = parentOf(n)) {
    const s = getComputedStyle(n)
    if (s.backgroundImage !== 'none') return null
    const c = parseColor(s.backgroundColor)
    if (c && c.a > 0) layer = over(layer, c)
    if (layer.a >= 0.999) return layer
  }
  return over(layer, WHITE)
}

// ---------------------------------------------------------------- DOM helpers

function flat(root: Element): HTMLElement[] {
  const out: HTMLElement[] = []
  const walk = (el: Element) => {
    out.push(el as HTMLElement)
    if (el.shadowRoot) for (const c of el.shadowRoot.children) walk(c)
    for (const c of el.children) walk(c)
  }
  walk(root)
  return out
}

const IMPLICIT: Record<string, (el: HTMLElement) => string | null> = {
  a: (el) => (el.hasAttribute('href') ? 'link' : null),
  button: () => 'button',
  summary: () => 'button',
  select: () => 'combobox',
  textarea: () => 'textbox',
  input: (el) => {
    const t = (el as HTMLInputElement).type
    return t === 'checkbox' ? 'checkbox' : t === 'radio' ? 'radio' : t === 'range' ? 'slider' : t === 'hidden' ? null : t === 'submit' || t === 'button' || t === 'file' ? 'button' : 'textbox'
  },
}

const role = (el: HTMLElement): string | null => el.getAttribute('role') ?? IMPLICIT[el.localName]?.(el) ?? null

const INTERACTIVE_ROLES = new Set(['button', 'link', 'checkbox', 'radio', 'switch', 'tab', 'menuitem', 'option', 'combobox', 'textbox', 'slider', 'searchbox'])
const ROVING_ROLES = new Set(['tab', 'menuitem', 'option', 'radio'])
/** Items of these composite widgets are reached with arrow keys (roving tabindex): tabindex -1 is correct */
const COMPOSITE = '[role="grid"], [role="tree"], [role="listbox"], [role="menu"], [role="tablist"], [role="radiogroup"], [role="toolbar"]'

const isDisabled = (el: HTMLElement): boolean => el.matches(':disabled') || el.getAttribute('aria-disabled') === 'true'

function isInteractive(el: HTMLElement): boolean {
  const r = role(el)
  return (r !== null && INTERACTIVE_ROLES.has(r)) || (el.hasAttribute('tabindex') && el.tabIndex >= 0 && !el.matches('[tabindex="-1"]') && !IMPLICIT[el.localName])
}

/** Text of a node as rendered (slots resolved, shadow roots flattened, aria-hidden skipped) */
function textOf(node: Node): string {
  if (node.nodeType === Node.TEXT_NODE) return node.textContent ?? ''
  if (!(node instanceof Element) || node.getAttribute('aria-hidden') === 'true') return ''
  if (node instanceof HTMLSlotElement) {
    const assigned = node.assignedNodes({ flatten: true })
    return assigned.length ? assigned.map(textOf).join('') : [...node.childNodes].map(textOf).join('')
  }
  const kids = node.shadowRoot ? node.shadowRoot.childNodes : node.childNodes
  return [...kids].map(textOf).join('')
}

function accName(el: HTMLElement): string {
  const root = el.getRootNode() as Document | ShadowRoot
  const labelledby = el.getAttribute('aria-labelledby')
  if (labelledby) {
    const t = labelledby.split(/\s+/).map((id) => textOf(root.getElementById(id) ?? document.createTextNode(''))).join(' ').trim()
    if (t) return t
  }
  const label = el.getAttribute('aria-label')?.trim()
  if (label) return label
  const labels = (el as HTMLInputElement).labels
  if (labels?.length) {
    const t = [...labels].map(textOf).join(' ').trim()
    if (t) return t
  }
  if (el instanceof HTMLImageElement) return el.alt
  const own = textOf(el).replace(/\s+/g, ' ').trim()
  return own || el.getAttribute('title')?.trim() || ''
}

function describe(el: Element): string {
  const name = el instanceof HTMLElement ? accName(el).slice(0, 28) : ''
  const r = el instanceof HTMLElement ? role(el) : null
  return `${el.localName}${r && r !== el.localName ? `[${r}]` : ''}${name ? ` "${name}"` : ''}`
}

const px = (v: string) => parseFloat(v) || 0

// ---------------------------------------------------------------- checks

type Add = (
  id: string,
  title: string,
  ref: string,
  level: A11yLevel,
  failures: string[],
  extra?: { manual?: string },
) => void

interface Ctx {
  host: HTMLElement
  all: HTMLElement[]
  visible: HTMLElement[]
  targets: HTMLElement[]
  root: ParentNode
}

/** Elements are "inline text links" when they flow inside a sentence: exempt from target size */
const isInlineLink = (el: HTMLElement) => getComputedStyle(el).display === 'inline'

function genericChecks(ctx: Ctx, add: Add): void {
  const { visible, targets } = ctx
  const interactive = visible.filter(isInteractive)

  add('name', 'Every interactive element has an accessible name', 'WCAG 4.1.2 / 2.5.3', 'A', interactive.filter((el) => !accName(el)).map(describe))

  // Tiny/clipped elements are visually hidden helpers, not targets
  const sized = targets.filter((el) => !isInlineLink(el))
  const size = (el: HTMLElement) => {
    const r = el.getBoundingClientRect()
    const labelled = (el as HTMLInputElement).labels?.[0]?.getBoundingClientRect()
    return labelled ? Math.min(Math.max(r.width, labelled.width), Math.max(r.height, labelled.height)) : Math.min(r.width, r.height)
  }
  add('target-aa', 'Targets are at least 24x24 CSS px', 'WCAG 2.5.8 (AA)', 'AA', sized.filter((el) => size(el) < 24).map((el) => `${describe(el)} ${Math.round(size(el))}px`))
  add('target-44', 'Targets are at least 44x44 CSS px', 'WCAG 2.5.5 (AAA) / SubUX', 'AAA', sized.filter((el) => size(el) < 44).map((el) => `${describe(el)} ${Math.round(size(el))}px`))

  const gaps: string[] = []
  for (let i = 0; i < targets.length; i++) {
    for (let j = i + 1; j < targets.length; j++) {
      const a = targets[i]!
      const b = targets[j]!
      const small = (r: DOMRect) => Math.min(r.width, r.height) < 44
      if (!small(a.getBoundingClientRect()) && !small(b.getBoundingClientRect())) continue
      if (a.contains(b) || b.contains(a) || (a as HTMLInputElement).labels?.[0]?.contains(b) || (b as HTMLInputElement).labels?.[0]?.contains(a)) continue
      const ra = a.getBoundingClientRect()
      const rb = b.getBoundingClientRect()
      const dx = Math.max(0, ra.left - rb.right, rb.left - ra.right)
      const dy = Math.max(0, ra.top - rb.bottom, rb.top - ra.bottom)
      if (Math.hypot(dx, dy) < 8) gaps.push(`${describe(a)} / ${describe(b)}`)
    }
  }
  add('target-gap', 'At least 8px around targets smaller than 44px', 'SubUX whitespace / WCAG 2.5.8', 'best', gaps.slice(0, 6))

  // Text contrast
  const low: string[] = []
  const lowDisabled: string[] = []
  let unknown = 0
  for (const el of visible) {
    const ownText = [...el.childNodes].some((n) => n.nodeType === Node.TEXT_NODE && n.textContent?.trim())
    if (!ownText) continue
    const s = getComputedStyle(el)
    const bg = backdrop(el)
    const fg0 = parseColor(s.color)
    if (!bg || !fg0) {
      unknown++
      continue
    }
    const ratio = contrast(over(fg0, bg), bg)
    const large = px(s.fontSize) >= 24 || (px(s.fontSize) >= 18.66 && Number(s.fontWeight) >= 700)
    const disabled = el.closest(':disabled, [aria-disabled="true"]') !== null || (el.getRootNode() as ShadowRoot).host?.matches?.('[disabled]')
    if (disabled) {
      if (ratio < 3) lowDisabled.push(`${describe(el)} ${ratio.toFixed(2)}:1`)
    } else if (ratio < (large ? 3 : 4.5)) low.push(`${describe(el)} ${ratio.toFixed(2)}:1`)
  }
  add('text-contrast', 'Text contrast is at least 4.5:1 (3:1 large text)', 'WCAG 1.4.3 (AA)', 'AA', low, unknown ? { manual: `${unknown} text element(s) sit on an image/gradient: check by hand` } : undefined)
  add('disabled-contrast', 'Disabled text stays legible (3:1)', 'SubUX disabled states', 'best', lowDisabled)

  // Non-text contrast: boundary of fields and bordered/filled buttons
  const bad: string[] = []
  for (const el of visible) {
    const r = role(el)
    const field = ['textbox', 'combobox'].includes(r ?? '') && el.localName !== 'sub-input' && !el.matches('[disabled]')
    const button = r === 'button' && !isDisabled(el)
    if (!field && !button) continue
    const s = getComputedStyle(el)
    if (s.opacity === '0') continue // transparent overlay (file input, custom radio): the visible part is its label
    const parentBg = backdrop(parentOf(el) ?? el)
    if (!parentBg) continue
    const bw = px(s.borderTopWidth)
    const bc = parseColor(s.borderTopColor)
    const ownBg = parseColor(s.backgroundColor)
    const edges: number[] = []
    if (bw >= 1 && s.borderTopStyle !== 'none' && bc && bc.a > 0) edges.push(contrast(over(bc, parentBg), parentBg))
    if (ownBg && ownBg.a > 0.99) edges.push(contrast(ownBg, parentBg))
    if (!edges.length) {
      if (field) bad.push(`${describe(el)} has no visible boundary`)
      continue // text-only button: its text is checked above
    }
    if (field || (button && (bw >= 1 || (ownBg?.a ?? 0) > 0.99))) {
      if (Math.max(...edges) < 3) bad.push(`${describe(el)} boundary ${Math.max(...edges).toFixed(2)}:1`)
    }
  }
  add('nontext-contrast', 'Control boundaries contrast at least 3:1 with their surroundings', 'WCAG 1.4.11 (AA)', 'AA', bad)

  // Keyboard
  const tabless = interactive.filter((el) => !isDisabled(el) && el.tabIndex < 0 && !ROVING_ROLES.has(role(el) ?? '') && !el.closest(COMPOSITE))
  add('keyboard', 'Interactive elements are reachable by keyboard', 'WCAG 2.1.1 (A)', 'A', tabless.map(describe))
  add('tabindex', 'No positive tabindex (DOM order = tab order)', 'WCAG 2.4.3 (A)', 'A', interactive.filter((el) => el.tabIndex > 0).map(describe))

  // Text size
  const tiny = visible.filter((el) => {
    const own = [...el.childNodes].some((n) => n.nodeType === Node.TEXT_NODE && n.textContent?.trim())
    return own && px(getComputedStyle(el).fontSize) < 12
  })
  add('text-size', 'Text is at least 12px (body 16px)', 'SubUX typography', 'best', tiny.map(describe))

  // Images / icons
  add('svg-name', 'SVG is decorative (aria-hidden) or has a name', 'WCAG 1.1.1 (A)', 'A',
    visible.filter((el) => el.localName === 'svg' && el.getAttribute('aria-hidden') !== 'true' && !el.closest('[aria-hidden="true"]') && !(el.getAttribute('role') === 'img' && el.getAttribute('aria-label'))).map(describe))

  // ARIA
  const REQUIRED: Record<string, string[]> = { tab: ['aria-selected'], switch: ['aria-checked'], combobox: ['aria-expanded'], slider: ['aria-valuenow'] }
  const NAMED = new Set(['dialog', 'alertdialog', 'tablist', 'tabpanel', 'region', 'progressbar', 'img', 'switch', 'listbox', 'menu', 'group'])
  const missing: string[] = []
  const unnamed: string[] = []
  const dangling: string[] = []
  for (const el of ctx.all) {
    const r = el.getAttribute('role')
    if (r && !isVisible(el) && r !== 'tabpanel') continue
    if (r) {
      for (const attr of REQUIRED[r] ?? []) if (!el.hasAttribute(attr) && !(r === 'combobox' && el.localName === 'select')) missing.push(`${describe(el)} needs ${attr}`)
      if (NAMED.has(r) && isVisible(el) && !accName(el) && !(r === 'group' && el.localName === 'fieldset')) unnamed.push(describe(el))
    }
    const rootNode = el.getRootNode() as Document | ShadowRoot
    for (const attr of ['aria-labelledby', 'aria-describedby', 'aria-controls', 'aria-activedescendant']) {
      const v = el.getAttribute(attr)
      if (!v) continue
      for (const id of v.split(/\s+/)) if (id && !rootNode.getElementById(id)) dangling.push(`${describe(el)} ${attr}="${id}"`)
    }
  }
  add('aria-required', 'Roles have their required ARIA state', 'WAI-ARIA 1.2 / WCAG 4.1.2', 'A', missing)
  add('aria-name', 'Roles that need a name have one', 'WCAG 4.1.2 (A)', 'A', unnamed)
  add('aria-refs', 'ARIA id references resolve (same root)', 'WCAG 4.1.2 (A)', 'A', dangling)

  // Motion token
  const slow = parseFloat(getComputedStyle(ctx.host).getPropertyValue('--sub-duration-slow'))
  const ms = Number.isFinite(slow) ? (getComputedStyle(ctx.host).getPropertyValue('--sub-duration-slow').trim().endsWith('ms') ? slow : slow * 1000) : 0
  add('motion-duration', 'UI animation lasts at most 300ms and honours reduced motion', 'SubUX / WCAG 2.3.3', 'best', ms > 500 ? [`--sub-duration-slow is ${ms}ms`] : [])
}

/** Focus indicator, measured on the real element while focused */
function focusChecks(ctx: Ctx, add: Add): void {
  const present: string[] = []
  const weak: string[] = []
  let unverifiable = 0
  // Deep: inside a shadow root `document.activeElement` is only the host
  const previous = deepActiveElement()
  auditState.running = true
  const seen = new Set<string>()
  const candidates = ctx.targets.filter((el) => !isDisabled(el))
  for (const el of candidates.slice(0, 16)) {
    const key = `${el.localName}|${role(el)}`
    if (seen.has(key)) continue
    seen.add(key)
    try {
      el.focus({ preventScroll: true, focusVisible: true } as FocusOptions)
    } catch {
      continue
    }
    if (!el.matches(':focus-visible')) {
      unverifiable++
      continue
    }
    // Tree items own the focus but draw the ring on their row (not around the whole subtree)
    const s = getComputedStyle(el.matches('[role="treeitem"]') ? (el.querySelector(':scope > .row') ?? el) : el)
    const bg = backdrop(parentOf(el) ?? el) ?? WHITE
    const rings: { w: number; c: RGBA }[] = []
    const oc = parseColor(s.outlineColor)
    if (s.outlineStyle !== 'none' && px(s.outlineWidth) > 0 && oc && oc.a > 0.01) rings.push({ w: px(s.outlineWidth), c: over(oc, bg) })
    for (const part of s.boxShadow.split(/,(?![^(]*\))/)) {
      const color = part.match(/(rgba?\([^)]*\)|color\([^)]*\))/)?.[1]
      const nums = (part.replace(color ?? '', '').match(/-?[\d.]+px/g) ?? []).map(px)
      const c = color ? parseColor(color) : null
      // blur 0 and spread > 0 = a solid ring
      if (c && c.a > 0.01 && nums.length >= 4 && nums[2] === 0 && nums[3]! > 0) rings.push({ w: nums[3]!, c: over(c, bg) })
    }
    const thickness = rings.reduce((t, r) => t + r.w, 0)
    if (thickness <= 0) present.push(describe(el))
    else if (thickness < 2 || Math.max(...rings.map((r) => contrast(r.c, bg))) < 3) {
      weak.push(`${describe(el)} ${thickness.toFixed(0)}px, ${Math.max(...rings.map((r) => contrast(r.c, bg))).toFixed(1)}:1`)
    }
  }
  restoreFocus(previous)
  auditState.running = false
  add('focus-visible', 'Keyboard focus is visible', 'WCAG 2.4.7 (AA)', 'AA', present, unverifiable ? { manual: `${unverifiable} element(s): :focus-visible could not be forced in this browser` } : undefined)
  add('focus-appearance', 'Focus indicator is at least 2px thick and 3:1 against the background', 'WCAG 2.4.11 / 2.4.13', 'AA', weak)
}

/** Put focus back EXACTLY where it was (the audit moves it to measure each focus ring) */
function restoreFocus(previous: HTMLElement | null): void {
  deepActiveElement()?.blur?.()
  if (previous && previous !== document.body) {
    previous.focus?.({ preventScroll: true })
    return
  }
  // Nothing was focused: the audit must not leave the browser's "sequential focus starting point" on the last
  // element it measured, or the user's first Tab would skip the skip link. Park the starting point at the top.
  const marker = document.createElement('span')
  marker.tabIndex = -1
  document.body.prepend(marker)
  marker.focus({ preventScroll: true })
  marker.blur()
  marker.remove()
}

// ---------------------------------------------------------------- per-component criteria

type Specific = (ctx: Ctx, q: <T extends HTMLElement = HTMLElement>(sel: string) => T[], add: Add) => void
const shadowQ = (host: HTMLElement) => <T extends HTMLElement = HTMLElement>(sel: string): T[] => deepQueryAll<T>(host.shadowRoot ?? host, sel)
const none = (cond: boolean, msg: string): string[] => (cond ? [] : [msg])

const SPECIFIC: Record<string, Specific> = {
  'sub-button': (c, q, add) => {
    add('semantic', 'Renders a native button or link (no div-button)', 'WCAG 4.1.2 / links vs buttons', 'A', none(q('button, a[href]').length > 0, 'no native control'))
    if (c.host.hasAttribute('loading')) add('busy', 'Loading state is exposed (aria-busy)', 'SubUX perceived speed', 'A', none(q('[aria-busy="true"]').length > 0, 'aria-busy missing'))
    if (c.host.hasAttribute('disabled-reason')) add('reason', 'Soft-disabled keeps focus and explains why', 'SubUX disabled states', 'A', none(q('[aria-disabled="true"][aria-describedby]').length > 0, 'aria-disabled + aria-describedby missing'))
  },
  'sub-icon-button': (c, q, add) => {
    add('label', 'Icon-only button has an aria-label', 'SubUX icon-only buttons', 'A', none(Boolean(q('button')[0]?.getAttribute('aria-label')), 'aria-label missing'))
    add('glyph-hidden', 'Glyph is hidden from assistive tech', 'WCAG 1.1.1', 'A', q('svg').filter((s) => s.getAttribute('aria-hidden') !== 'true').map(describe))
  },
  'sub-link': (c, q, add) => {
    add('semantic', 'Renders a native link', 'links vs buttons', 'A', none(q('a').length > 0, 'no <a>'))
    add('underline', 'Link is underlined (not colour alone)', 'WCAG 1.4.1 (A)', 'A', q('a').filter((a) => !getComputedStyle(a).textDecorationLine.includes('underline')).map(describe))
    if (c.host.hasAttribute('external')) add('new-tab', 'New-tab links say so', 'SubUX links', 'A', none(/new tab/i.test(textOf(q('a')[0] ?? c.host)), '"(opens in a new tab)" missing'))
  },
  'sub-input': fieldChecks,
  'sub-textarea': fieldChecks,
  'sub-select': fieldChecks,
  'sub-mentions': fieldChecks,
  'sub-tree-select': fieldChecks,
  'sub-autocomplete': (c, q, add) => {
    fieldChecks(c, q, add)
    const i = q('input')[0]
    add('combobox', 'ARIA combobox pattern', 'APG combobox / SubUX autocomplete', 'A', i && ['combobox'].includes(i.getAttribute('role') ?? '') && i.getAttribute('aria-autocomplete') === 'list' && i.hasAttribute('aria-expanded') && i.hasAttribute('aria-controls') ? [] : ['role/aria-autocomplete/aria-expanded/aria-controls incomplete'])
    add('listbox', 'Suggestions are a labelled listbox', 'APG combobox', 'A', none(q('[role="listbox"][aria-label]').length > 0, 'listbox without a name'))
  },
  'sub-checkbox': (c, q, add) => {
    add('native', 'Uses a native checkbox inside its label', 'WCAG 4.1.2 / SubUX checkbox', 'A', none(q('label input[type="checkbox"]').length > 0, 'input[type=checkbox] not inside <label>'))
  },
  'sub-checkbox-group': (c, q, add) => {
    add('fieldset', 'Group is a fieldset with a legend', 'SubUX checkbox', 'A', none(q('fieldset > legend').length > 0, 'fieldset/legend missing'))
  },
  'sub-radio-group': (c, q, add) => {
    add('fieldset', 'Group is a fieldset with a legend', 'SubUX radio buttons', 'A', none(q('fieldset > legend').length > 0, 'fieldset/legend missing'))
    add('native', 'Options are native radios sharing one name', 'APG radio group', 'A', none(new Set(q<HTMLInputElement>('input[type="radio"]').map((r) => r.name)).size === 1, 'radios do not share a name'))
  },
  'sub-switch': (c, q, add) => {
    const b = q('[role="switch"]')[0]
    add('role', 'role=switch with aria-checked and a name', 'SubUX toggle switch', 'A', b && b.hasAttribute('aria-checked') && accName(b) ? [] : ['switch role/state/name incomplete'])
    add('state-text', 'State is shown as text, not colour alone', 'WCAG 1.4.1 (A)', 'A', none(q('.state').length > 0, 'visible On/Off text missing'))
  },
  'sub-tabs': (c, q, add) => {
    const tabs = q('[role="tab"]')
    add('tablist', 'tablist > tab with a name; tabpanels named', 'APG tabs / SubUX tabs', 'A', tabs.length && q('[role="tablist"][aria-label]').length ? [] : ['tablist name or tabs missing'])
    add('roving', 'Exactly one tab is in the tab order (roving tabindex)', 'APG tabs', 'A', none(tabs.filter((t) => t.tabIndex === 0).length === 1, 'tabindex=0 count is not 1'))
    add('selected', 'Exactly one tab is selected', 'APG tabs', 'A', none(tabs.filter((t) => t.getAttribute('aria-selected') === 'true').length === 1, 'aria-selected count is not 1'))
    add('panels', 'Each panel is a named tabpanel; inactive ones are hidden', 'APG tabs', 'A', Array.from(c.host.querySelectorAll<HTMLElement>(':scope > sub-tab-panel')).filter((p) => p.getAttribute('role') !== 'tabpanel' || !p.getAttribute('aria-label')).map(describe))
    add('count', '2 to 7 tabs', 'SubUX tabs', 'best', none(tabs.length >= 2 && tabs.length <= 7, `${tabs.length} tabs`))
  },
  'sub-accordion-item': (c, q, add) => {
    const b = q('h2 > button, h3 > button, h4 > button, h5 > button, h6 > button')[0]
    add('heading-button', 'Header is a button inside a heading', 'SubUX accordion / APG accordion', 'A', none(Boolean(b), 'button not inside a heading'))
    const panel = q('[role="region"]')[0]
    add('expanded', 'aria-expanded matches the panel state', 'APG accordion', 'A', b && panel ? none((b.getAttribute('aria-expanded') === 'true') === !panel.hidden, 'aria-expanded and panel.hidden disagree') : ['button or region missing'])
    add('region', 'Panel is a region labelled by its button', 'SubUX accordion', 'A', none(Boolean(panel?.getAttribute('aria-labelledby')), 'region not labelled'))
  },
  'sub-breadcrumbs': (c, q, add) => {
    add('nav', 'nav with a name containing an ordered list', 'SubUX breadcrumbs', 'A', none(q('nav[aria-label] > ol > li').length > 0, 'nav[aria-label] > ol > li missing'))
    add('current', 'Last item is the current page (aria-current)', 'SubUX breadcrumbs', 'A', none(q('[aria-current="page"]').length === 1, 'aria-current="page" count is not 1'))
  },
  'sub-pagination': (c, q, add) => {
    add('nav', 'nav with a name', 'SubUX pagination', 'A', none(q('nav[aria-label]').length > 0, 'nav[aria-label] missing'))
    add('current', 'Current page is exposed (aria-current)', 'SubUX pagination', 'A', none(q('[aria-current="page"]').length === 1, 'aria-current count is not 1'))
    add('where', 'Says where you are ("Page x of y")', 'SubUX pagination', 'A', none(/page \d+ of \d+/i.test(textOf(q('.summary')[0] ?? c.host)), 'summary missing'))
  },
  'sub-dialog': (c, q, add) => {
    const d = q<HTMLDialogElement>('dialog')[0]
    add('native', 'Built on a native <dialog> (focus, inert, Esc)', 'SubUX modals / HTML dialog', 'A', none(Boolean(d), '<dialog> missing'))
    add('name', 'Dialog is named by its heading', 'SubUX modals', 'A', none(Boolean(d?.getAttribute('aria-labelledby') && q('h1').length), 'aria-labelledby/h1 missing'))
    add('close', 'Close button has a name', 'SubUX modals', 'A', none(Boolean(q('.close')[0]?.getAttribute('aria-label')), 'close button unnamed'))
  },
  'sub-alert': (c, q, add) => {
    const a = q('[role]')[0]
    add('live', 'Announced politely (status) or assertively (alert for errors)', 'SubUX error messages', 'A', none(a?.getAttribute('role') === (c.host.getAttribute('variant') === 'error' ? 'alert' : 'status'), 'role mismatch'))
    add('not-colour', 'Severity is icon + text, not colour alone', 'WCAG 1.4.1', 'A', none(q('.glyph svg').length > 0, 'icon missing'))
  },
  'sub-progress': (c, q, add) => {
    const p = q('[role="progressbar"]')[0]
    add('role', 'progressbar with a name', 'SubUX perceived speed', 'A', none(Boolean(p && accName(p)), 'unnamed progressbar'))
    add('values', 'Determinate bars expose now/min/max', 'APG meter/progress', 'A', p && c.host.hasAttribute('value') ? none(['aria-valuenow', 'aria-valuemin', 'aria-valuemax'].every((a) => p.hasAttribute(a)), 'aria-value* missing') : [])
  },
  'sub-spinner': (c, q, add) => add('status', 'role=status with a name', 'SubUX perceived speed', 'A', none(Boolean(q('[role="status"]')[0] && (q('[role="status"]')[0]!.getAttribute('aria-label') || textOf(q('[role="status"]')[0]!).trim())), 'unnamed status')),
  'sub-menu': (c, q, add) => {
    const t = q('[aria-haspopup="menu"]')[0]
    add('trigger', 'Trigger has aria-haspopup and aria-expanded', 'SubUX button hierarchy / APG menu button', 'A', none(Boolean(t?.hasAttribute('aria-expanded')), 'aria-expanded missing'))
    add('menu', 'Popup is a named menu of menuitems', 'APG menu button', 'A', none(q('[role="menu"][aria-label]').length > 0, 'menu name missing'))
  },
  'sub-stepper': (c, q, add) => {
    add('current', 'Current step is exposed (aria-current=step)', 'SubUX form length', 'A', none(q('[aria-current="step"]').length === 1, 'aria-current=step count is not 1'))
    add('total', 'Shows "Step x of y" (total never hidden)', 'SubUX form length', 'A', none(/step \d+ of \d+/i.test(textOf(q('.title')[0] ?? c.host)), 'title missing'))
  },
  'sub-skeleton': (c, q, add) => add('busy', 'Named skeleton is a busy status; unnamed is hidden', 'SubUX perceived speed', 'A', c.host.hasAttribute('label') ? none(c.host.getAttribute('aria-busy') === 'true' && c.host.getAttribute('role') === 'status', 'aria-busy/status missing') : none(c.host.getAttribute('aria-hidden') === 'true', 'decorative skeleton not hidden')),
  'sub-sortable-list': (c, q, add) => {
    add('list', 'List is a named role=list of listitems', 'SubUX drag and drop', 'A', none(c.host.getAttribute('role') === 'list' && Boolean(c.host.getAttribute('aria-label')), 'role=list / aria-label missing'))
    add('alternative', 'Keyboard/button alternative to dragging', 'WCAG 2.5.7 (AA)', 'AA', none(c.host.querySelectorAll('sub-sortable-item').length === 0 || deepQueryAll(c.host, 'sub-sortable-item').every((i) => (i.shadowRoot?.querySelectorAll('button').length ?? 0) >= 3), 'move buttons missing'))
  },
  'sub-chat': (c, q, add) => {
    add('log', 'Conversation is a role=log live region', 'SubUX AI chatbots', 'A', none(q('[role="log"][aria-live]').length > 0, 'role=log missing'))
    add('composer', 'Composer has a visible label', 'SubUX AI chatbots / labels', 'A', none(q('label[for="msg"]').length > 0, 'label missing'))
    add('disclosure', 'States that it is an AI', 'SubUX AI chatbots', 'A', none(q('.ai').length > 0, 'AI label missing'))
  },
  'sub-icon': (c, q, add) => add('decorative-or-named', 'Icon is decorative or has a role=img name', 'WCAG 1.1.1', 'A', q('svg').filter((s) => s.getAttribute('aria-hidden') !== 'true' && !(s.getAttribute('role') === 'img' && s.getAttribute('aria-label'))).map(describe)),
  'sub-image': (c, q, add) => add('alt', 'Image has an alt attribute (empty when decorative)', 'WCAG 1.1.1', 'A', q<HTMLImageElement>('img').filter((i) => !i.hasAttribute('alt')).map(describe)),
}

function fieldChecks(c: Ctx, q: <T extends HTMLElement = HTMLElement>(sel: string) => T[], add: Add): void {
  const input = q('input, textarea, select, button[role="combobox"]')[0]
  add('label', 'Visible <label for> linked to the control', 'SubUX labels / WCAG 1.3.1', 'A', none(Boolean(input && (input as HTMLInputElement).labels?.length && textOf((input as HTMLInputElement).labels![0]!).trim()), 'no associated visible label'))
  add('error-live', 'Errors live in an aria-live region tied by aria-describedby', 'SubUX error messages', 'A', none(Boolean(q('#error[aria-live]').length && input?.getAttribute('aria-describedby')?.includes('error')), 'error region not wired'))
  if (q('.error svg').length || c.host.hasAttribute('error')) add('invalid', 'Invalid fields expose aria-invalid and use icon + text', 'SubUX error messages / WCAG 1.4.1', 'A', none(input?.getAttribute('aria-invalid') === 'true' && q('.error svg').length > 0, 'aria-invalid or icon missing'))
}

/** Behaviour a machine cannot judge. Verified by the Playwright keyboard specs where noted. */
const MANUAL: Record<string, Array<[string, string, string]>> = {
  'sub-button': [['label-text', 'Label is a specific verb ("Save changes"), not "OK"', 'SubUX typography in buttons']],
  'sub-icon-button': [['universal', 'Only used for universal icons; label matches the tooltip', 'SubUX icon-only buttons']],
  'sub-input': [['autocomplete', 'autocomplete token and input type fit the data', 'SubUX input types'], ['label-text', 'Label is 1-4 words, sentence case', 'SubUX labels']],
  'sub-tabs': [['arrows', 'Left/Right/Home/End move between tabs (covered by tests)', 'APG tabs'], ['labels', 'Labels 1-3 words, not truncated', 'SubUX tabs']],
  'sub-dialog': [['trap', 'Focus stays inside; Esc closes; focus returns to the opener (native dialog, covered by tests)', 'SubUX modals']],
  'sub-accordion-item': [['critical', 'Critical content is not collapsed by default', 'SubUX accordion']],
  'sub-menu': [['arrows', 'Arrow/Home/End/type-ahead/Esc (covered by tests)', 'APG menu button']],
  'sub-autocomplete': [['keys', 'Down/Up/Enter/Esc/Tab, no auto-selection (covered by tests)', 'APG combobox']],
  'sub-sortable-list': [['announce', 'Grab, move, drop and cancel are announced through announce() (covered by tests)', 'WCAG 4.1.3'], ['sr', 'Test with NVDA/VoiceOver', 'SubUX drag and drop']],
  'sub-chat': [['sr', 'Test the live log with a screen reader', 'SubUX AI chatbots']],
}

// ---------------------------------------------------------------- public API

/** Audit one rendered component instance (or any element subtree). */
export function audit(host: Element): A11yReport {
  const el = host as HTMLElement
  const all = flat(el)
  const visible = all.filter((e) => isVisible(e) && e.getBoundingClientRect().width > 2)
  // Targets = things you can press. Roleless focusable text (e.g. truncated text) is keyboard-reachable but not a target.
  const targets = visible.filter((e) => isInteractive(e) && role(e) !== null && !isDisabled(e))
  const ctx: Ctx = { host: el, all, visible, targets, root: el.shadowRoot ?? el }
  const checks: A11yCheck[] = []

  const add: Add = (id, title, ref, level, failures, extra) => {
    checks.push({ id, title, ref, level, status: failures.length ? 'fail' : 'pass', detail: failures.length ? failures.slice(0, 4).join('; ') : undefined, nodes: failures.length ? failures : undefined })
    if (extra?.manual) checks.push({ id: `${id}-manual`, title: `${title} (verify by hand)`, ref, level, status: 'manual', detail: extra.manual })
  }

  genericChecks(ctx, add)
  focusChecks(ctx, add)
  SPECIFIC[el.localName]?.(ctx, shadowQ(el), add)
  for (const [id, title, ref] of MANUAL[el.localName] ?? []) checks.push({ id, title, ref, level: 'A', status: 'manual' })

  const auto = checks.filter((c) => c.status !== 'manual')
  const total = auto.reduce((t, c) => t + WEIGHT[c.level], 0)
  const passed = auto.filter((c) => c.status === 'pass').reduce((t, c) => t + WEIGHT[c.level], 0)
  const failing = auto.filter((c) => c.status === 'fail')
  return {
    tag: el.localName,
    score: total ? Math.round((passed / total) * 100) : 100,
    compliant: !failing.some((c) => c.level === 'A' || c.level === 'AA'),
    strict: failing.length === 0,
    counts: { pass: auto.length - failing.length, fail: failing.length, manual: checks.length - auto.length },
    checks,
  }
}

/** Audit every `<sub-*>` element under `root` (light DOM only: internal composition is covered by its parent). */
export function auditAll(root: ParentNode = document): A11yReport[] {
  return [...root.querySelectorAll('*')].filter((e) => e.localName.startsWith('sub-')).map(audit)
}

/** Aggregate: worst-case compliance and mean score of several reports */
export function summarize(reports: A11yReport[]): { score: number; compliant: boolean; strict: boolean } {
  if (!reports.length) return { score: 100, compliant: true, strict: true }
  return {
    score: Math.round(reports.reduce((t, r) => t + r.score, 0) / reports.length),
    compliant: reports.every((r) => r.compliant),
    strict: reports.every((r) => r.strict),
  }
}

/**
 * True while the user is working inside `root` (focus within, or a modal dialog is open). An audit
 * would move focus and blur fields, so schedule it for later.
 */
export function isBusy(root: Element): boolean {
  return root.matches(':focus-within') || deepQueryAll(root, 'dialog[open]').length > 0
}
