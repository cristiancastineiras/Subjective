import { announce } from './announce'

/**
 * Focus utilities for page-level accessibility: moving focus after client-side navigation, returning
 * it to where the user was, finding the first invalid field, roving tabindex for custom widgets.
 * All of them see through open shadow roots.
 */

export const TABBABLE = [
  'a[href]',
  'area[href]',
  'button',
  'input:not([type="hidden"])',
  'select',
  'textarea',
  'summary',
  '[tabindex]',
  '[contenteditable=""]',
  '[contenteditable="true"]',
].join(',')

/** querySelectorAll that also searches inside open shadow roots, in DOM order */
export function deepQueryAll<T extends Element = HTMLElement>(root: ParentNode, selector: string): T[] {
  const out: T[] = []
  const visit = (node: ParentNode) => {
    for (const el of node.querySelectorAll('*')) {
      if (el.matches(selector)) out.push(el as T)
      if (el.shadowRoot) visit(el.shadowRoot)
    }
  }
  // Document order matters: a host's light children come after its shadow content in `querySelectorAll`,
  // which is close enough to render order for focus purposes.
  if ((root as Element).matches?.(selector)) out.push(root as unknown as T)
  visit(root)
  return out
}

export function deepActiveElement(): HTMLElement | null {
  let active = document.activeElement as HTMLElement | null
  while (active?.shadowRoot?.activeElement) active = active.shadowRoot.activeElement as HTMLElement
  return active
}

export function isVisible(el: Element): boolean {
  if (!(el as HTMLElement).getClientRects().length) return false
  const s = getComputedStyle(el)
  return s.visibility !== 'hidden' && s.display !== 'none'
}

/** Elements the Tab key can reach, in DOM order. Disabled, hidden and `tabindex="-1"` are excluded. */
export function getTabbable(root: ParentNode = document): HTMLElement[] {
  return deepQueryAll(root, TABBABLE).filter(
    (el) =>
      !el.matches(':disabled') &&
      !el.closest('[inert]') &&
      el.tabIndex >= 0 &&
      isVisible(el),
  )
}

export interface MoveFocusOptions {
  /** Do not scroll the target into view */
  preventScroll?: boolean
  /** Text announced to screen readers after the move (e.g. the new page title) */
  announce?: string
}

/**
 * Move focus to `target` (element or CSS selector). Non-interactive targets (headings, landmarks,
 * error summaries) get a temporary `tabindex="-1"` so they can take focus without becoming a tab stop.
 * Returns whether focus actually moved.
 */
export function moveFocus(target: Element | string | null | undefined, options: MoveFocusOptions = {}): boolean {
  const el = typeof target === 'string' ? (deepQueryAll(document, target)[0] ?? null) : target
  if (!(el instanceof HTMLElement)) return false
  if (!el.matches(TABBABLE) || (el.tabIndex < 0 && !el.hasAttribute('tabindex'))) {
    el.setAttribute('tabindex', '-1')
    el.addEventListener('blur', () => el.removeAttribute('tabindex'), { once: true })
  }
  el.focus({ preventScroll: options.preventScroll ?? false })
  if (options.announce) announce(options.announce)
  return deepActiveElement() === el
}

/** Focus the page's main landmark (`main`, `[role=main]` or `#main`) */
export function focusMain(options?: MoveFocusOptions): boolean {
  return moveFocus('main, [role="main"], #main', options)
}

/** Focus the first `h1` (preferably inside `main`): the right target after a route change */
export function focusHeading(options?: MoveFocusOptions): boolean {
  return moveFocus('main h1, [role="main"] h1', options) || moveFocus('h1', options)
}

export interface NavigationOptions {
  /** New page title; also set as `document.title` */
  title?: string
  /** Where focus goes: the h1 (default), the main landmark, or any selector */
  focus?: 'heading' | 'main' | string
  /** Announce "Navigated to <title>" (default true) */
  announce?: boolean
}

/**
 * Call after a client-side route change (SPA). Without it, keyboard and screen-reader users stay on
 * a link that no longer exists and hear nothing. Updates the title, moves focus, announces the page.
 */
export function afterNavigation(options: NavigationOptions = {}): void {
  if (options.title) document.title = options.title
  const focus = options.focus ?? 'heading'
  const moved = focus === 'heading' ? focusHeading() : focus === 'main' ? focusMain() : moveFocus(focus)
  if (!moved) focusMain()
  if (options.announce !== false) announce(`Navigated to ${options.title ?? document.title}`)
}

/**
 * Remember where focus is now and return a function that puts it back (dialogs, menus, drawers).
 * If the original element is gone, falls back to `fallback` (selector/element) or the main landmark.
 */
export function rememberFocus(fallback?: Element | string): () => void {
  const origin = deepActiveElement()
  return () => {
    if (origin?.isConnected) origin.focus()
    else if (!moveFocus(fallback)) focusMain()
  }
}

/** Focus the first invalid control under `root` (native `:invalid` and `aria-invalid="true"`) */
export function focusFirstInvalid(root: ParentNode = document): boolean {
  const first = deepQueryAll(root, ':invalid, [aria-invalid="true"]').find(
    (el) => !['FORM', 'FIELDSET'].includes(el.tagName) && isVisible(el),
  )
  return moveFocus(first)
}

/** Toggle `inert` (non-interactive, hidden from assistive tech) on `el`. */
export function setInert(el: HTMLElement, inert: boolean): void {
  el.toggleAttribute('inert', inert)
}

/** Make everything outside `keep` inert (custom overlays that cannot use `<dialog>`). Returns the undo. */
export function inertOutside(keep: HTMLElement): () => void {
  const touched: HTMLElement[] = []
  for (let node: HTMLElement | null = keep; node && node !== document.body; node = node.parentElement) {
    for (const sibling of node.parentElement?.children ?? []) {
      if (sibling !== node && sibling instanceof HTMLElement && !sibling.hasAttribute('inert')) {
        sibling.setAttribute('inert', '')
        touched.push(sibling)
      }
    }
  }
  return () => touched.forEach((el) => el.removeAttribute('inert'))
}

export interface RovingOptions {
  /** Selector of the items inside the container */
  selector: string
  orientation?: 'horizontal' | 'vertical' | 'both'
  /** Wrap from last to first (default true) */
  wrap?: boolean
  /** Called when the current item changes */
  onChange?: (el: HTMLElement) => void
}

/**
 * Roving tabindex for a group of related controls (toolbar, tab list, listbox): ONE tab stop for the
 * group, arrow keys move inside it, Home/End jump to the ends. Direction-aware (RTL).
 *
 *   const roving = new RovingFocus(toolbar, { selector: 'button' }); roving.connect()
 */
export class RovingFocus {
  constructor(
    private readonly container: HTMLElement,
    private readonly options: RovingOptions,
  ) {}

  get items(): HTMLElement[] {
    return deepQueryAll(this.container, this.options.selector).filter((el) => !el.matches(':disabled') && isVisible(el))
  }

  connect(): void {
    this.container.addEventListener('keydown', this.#onKey)
    this.container.addEventListener('focusin', this.#onFocusIn)
    this.setCurrent(this.items.find((i) => i.tabIndex === 0) ?? this.items[0])
  }

  disconnect(): void {
    this.container.removeEventListener('keydown', this.#onKey)
    this.container.removeEventListener('focusin', this.#onFocusIn)
  }

  setCurrent(el: HTMLElement | undefined): void {
    for (const item of this.items) item.tabIndex = item === el ? 0 : -1
  }

  #onFocusIn = (event: FocusEvent): void => {
    const el = this.items.find((i) => i === event.target || i.contains(event.target as Node))
    if (el) {
      this.setCurrent(el)
      this.options.onChange?.(el)
    }
  }

  #onKey = (event: KeyboardEvent): void => {
    const items = this.items
    const i = items.findIndex((el) => el === event.target || el.contains(event.target as Node))
    if (i < 0) return
    const { orientation = 'horizontal', wrap = true } = this.options
    const rtl = getComputedStyle(this.container).direction === 'rtl'
    const horizontal = orientation !== 'vertical'
    const vertical = orientation !== 'horizontal'
    let next = -1
    if ((event.key === 'ArrowRight' && horizontal) || (event.key === 'ArrowDown' && vertical)) next = i + (event.key === 'ArrowRight' && rtl ? -1 : 1)
    else if ((event.key === 'ArrowLeft' && horizontal) || (event.key === 'ArrowUp' && vertical)) next = i + (event.key === 'ArrowLeft' && rtl ? 1 : -1)
    else if (event.key === 'Home') next = 0
    else if (event.key === 'End') next = items.length - 1
    else return
    if (wrap) next = ((next % items.length) + items.length) % items.length
    const target = items[next]
    if (!target) return
    event.preventDefault()
    target.focus()
  }
}

// ---------------------------------------------------------------- more helpers for custom widgets

/** Can this element receive focus right now (visible, enabled, not inert, tabindex not negative-only)? */
export function isFocusable(el: Element): boolean {
  return el instanceof HTMLElement && !el.matches(':disabled') && !el.closest('[inert]') && isVisible(el) && (el.matches(TABBABLE) || el.tabIndex >= 0)
}

export interface TrapOptions {
  /** Element (or selector) to focus first; default: the first tabbable control, else the container */
  initialFocus?: Element | string
  /** Return focus to where it was when the trap is released (default true) */
  restore?: boolean
}

/**
 * Keep Tab and Shift+Tab inside `container` (for a custom overlay: the native `<dialog>` and `<sub-dialog>`
 * already do this). Returns the function that releases the trap and, by default, restores focus.
 * It does not handle Esc: close the overlay yourself and call the returned function.
 */
export function trapFocus(container: HTMLElement, options: TrapOptions = {}): () => void {
  const restore = options.restore === false ? () => {} : rememberFocus()
  const onKey = (event: KeyboardEvent): void => {
    if (event.key !== 'Tab') return
    const tabbable = getTabbable(container)
    if (!tabbable.length) {
      event.preventDefault()
      container.focus()
      return
    }
    const first = tabbable[0]!
    const last = tabbable[tabbable.length - 1]!
    const active = deepActiveElement()
    if (event.shiftKey && (active === first || !container.contains(active) && !deepContains(container, active))) {
      event.preventDefault()
      last.focus()
    } else if (!event.shiftKey && (active === last || (!container.contains(active) && !deepContains(container, active)))) {
      event.preventDefault()
      first.focus()
    }
  }
  container.addEventListener('keydown', onKey)
  const start = typeof options.initialFocus === 'string' ? container.querySelector<HTMLElement>(options.initialFocus) : (options.initialFocus as HTMLElement | undefined)
  if (!moveFocus(start ?? getTabbable(container)[0] ?? container)) container.focus()
  return () => {
    container.removeEventListener('keydown', onKey)
    restore()
  }
}

function deepContains(root: HTMLElement, el: Element | null): boolean {
  for (let node: Node | null = el; node; ) {
    if (node === root) return true
    node = node.parentNode ?? (node as ShadowRoot).host ?? null
  }
  return false
}

let scrollLocks = 0
let previousOverflow = ''
let previousPadding = ''

/**
 * Stop the page behind an overlay from scrolling, without the layout jumping (the scrollbar's width is
 * compensated). Calls are counted: the page unlocks when every lock has been released.
 */
export function lockScroll(): () => void {
  const html = document.documentElement
  if (scrollLocks++ === 0) {
    previousOverflow = html.style.overflow
    previousPadding = html.style.paddingInlineEnd
    const bar = window.innerWidth - html.clientWidth
    html.style.overflow = 'hidden'
    if (bar > 0) html.style.paddingInlineEnd = `${bar}px`
  }
  let released = false
  return () => {
    if (released) return
    released = true
    if (--scrollLocks === 0) {
      html.style.overflow = previousOverflow
      html.style.paddingInlineEnd = previousPadding
    }
  }
}
