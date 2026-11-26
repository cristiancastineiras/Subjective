import { LitElement, css, html } from 'lit'
import { placeNear, type Placement } from './shared/position'
import { baseStyles } from './shared/styles'
import { define, uid, warn } from './shared/utils'

const SHOW_DELAY = 300 // ms before a hover tooltip appears; focus is immediate (SubUX)
const HIDE_DELAY = 120 // grace so the pointer can travel onto the tooltip (WCAG 1.4.13 hoverable)

const supportsPopover = typeof HTMLElement !== 'undefined' && typeof HTMLElement.prototype.showPopover === 'function'

/**
 * Supplementary text for a control, shown on hover (300ms) and keyboard focus (immediately),
 * dismissible with Esc, hoverable. NEVER the only way to learn something: touch users won't see it.
 *
 * `<sub-tooltip for="id">`: `for` is resolved in the same root as the tooltip. When the text only
 * repeats the target's accessible name set `decorative` to hide it from assistive technology;
 * otherwise it becomes the target's `aria-describedby`.
 */
export class SubTooltip extends LitElement {
  static override properties = {
    for: { type: String },
    decorative: { type: Boolean },
    placement: { type: String },
  }

  declare for: string
  declare decorative: boolean
  declare placement: Placement

  readonly #internals = this.attachInternals()
  #target: HTMLElement | null = null
  #timer: ReturnType<typeof setTimeout> | undefined
  #describedId = ''
  #innerTarget: (HTMLElement & { ariaDescribedByElements: Element[] | null }) | null = null

  constructor() {
    super()
    this.for = ''
    this.decorative = false
    this.placement = 'top'
  }

  static override styles = [
    baseStyles,
    css`
      :host {
        position: fixed;
        inset: auto;
        margin: 0;
        padding: 0;
        border: 0;
        overflow: visible;
        background: transparent;
        color: inherit;
        max-inline-size: min(var(--sub-tooltip-max-width), calc(100vw - 1rem));
        z-index: var(--sub-z-dropdown);
        pointer-events: auto;
      }

      /* Without the Popover API the host is toggled by [data-open] */
      :host(:not([popover]):not([data-open])) {
        display: none;
      }

      :host {
        opacity: 0;
        transition:
          opacity var(--sub-duration-fast) var(--sub-ease-standard),
          overlay var(--sub-duration-fast) allow-discrete,
          display var(--sub-duration-fast) allow-discrete;
      }

      :host(:popover-open),
      :host([data-open]) {
        opacity: 1;
      }

      @starting-style {
        :host(:popover-open) {
          opacity: 0;
        }
      }

      .bubble {
        padding: var(--sub-tooltip-padding-block) var(--sub-tooltip-padding-inline);
        border-radius: var(--sub-tooltip-radius);
        background: var(--sub-color-text);
        color: var(--sub-color-surface);
        font: var(--sub-weight-medium) var(--sub-tooltip-font-size) / var(--sub-leading-normal) var(--sub-font-sans);
        overflow-wrap: anywhere;
      }

      @media (forced-colors: active) {
        .bubble {
          border: 1px solid CanvasText;
          background: Canvas;
          color: CanvasText;
        }
      }
    `,
  ]

  override connectedCallback(): void {
    super.connectedCallback()
    this.#internals.role = 'tooltip'
    if (this.decorative) this.setAttribute('aria-hidden', 'true')
    if (supportsPopover) this.setAttribute('popover', 'manual')
    if (!this.id) this.id = uid('sub-tooltip')
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback()
    this.#detach()
  }

  protected override updated(): void {
    const root = this.getRootNode() as Document | ShadowRoot
    const next = this.for ? root.getElementById?.(this.for) ?? null : null
    if (next === this.#target) return
    this.#detach()
    if (!next) {
      if (this.for) warn(`<sub-tooltip for="${this.for}"> found no element with that id in its root.`)
      return
    }
    this.#target = next
    next.addEventListener('pointerenter', this.#onEnter)
    next.addEventListener('pointerleave', this.#onLeave)
    next.addEventListener('focusin', this.#showNow)
    next.addEventListener('focusout', this.#hide)
    next.addEventListener('keydown', this.#onKey)
    if (!this.decorative) void this.#describe(next)
  }

  /**
   * The description must land on the element that actually takes focus. For a custom-element target
   * with delegatesFocus (<sub-button>) that is the control inside its shadow root: `aria-describedby`
   * ids cannot cross the boundary, element references (`ariaDescribedByElements`) can.
   */
  async #describe(target: HTMLElement): Promise<void> {
    await (target as HTMLElement & { updateComplete?: Promise<unknown> }).updateComplete
    if (this.#target !== target) return
    const inner = target.shadowRoot?.delegatesFocus
      ? target.shadowRoot.querySelector<HTMLElement>('button, a[href], input, select, textarea, [tabindex]')
      : null
    const el = inner as (HTMLElement & { ariaDescribedByElements: Element[] | null }) | null
    if (el && 'ariaDescribedByElements' in el) {
      el.ariaDescribedByElements = [...(el.ariaDescribedByElements ?? []), this]
      this.#innerTarget = el
      return
    }
    const ids = new Set((target.getAttribute('aria-describedby') ?? '').split(' ').filter(Boolean))
    ids.add(this.id)
    target.setAttribute('aria-describedby', [...ids].join(' '))
    this.#describedId = this.id
  }

  #detach(): void {
    const t = this.#target
    clearTimeout(this.#timer)
    if (!t) return
    t.removeEventListener('pointerenter', this.#onEnter)
    t.removeEventListener('pointerleave', this.#onLeave)
    t.removeEventListener('focusin', this.#showNow)
    t.removeEventListener('focusout', this.#hide)
    t.removeEventListener('keydown', this.#onKey)
    if (this.#innerTarget) {
      this.#innerTarget.ariaDescribedByElements = (this.#innerTarget.ariaDescribedByElements ?? []).filter((e) => e !== this)
      this.#innerTarget = null
    }
    if (this.#describedId) {
      const ids = (t.getAttribute('aria-describedby') ?? '').split(' ').filter((id) => id && id !== this.#describedId)
      if (ids.length) t.setAttribute('aria-describedby', ids.join(' '))
      else t.removeAttribute('aria-describedby')
    }
    this.#target = null
  }

  get open(): boolean {
    return supportsPopover ? this.matches(':popover-open') : this.hasAttribute('data-open')
  }

  show(): void {
    if (this.open || !this.#target) return
    if (supportsPopover) this.showPopover()
    else this.setAttribute('data-open', '')
    placeNear(this.#target, this, this.placement)
    window.addEventListener('scroll', this.#hide, { capture: true, passive: true })
    window.addEventListener('resize', this.#hide)
  }

  hide(): void {
    clearTimeout(this.#timer)
    if (!this.open) return
    if (supportsPopover) this.hidePopover()
    else this.removeAttribute('data-open')
    window.removeEventListener('scroll', this.#hide, { capture: true })
    window.removeEventListener('resize', this.#hide)
  }

  #onEnter = (event: Event): void => {
    // Touch has no hover; the label must not depend on this
    if ((event as PointerEvent).pointerType === 'touch') return
    clearTimeout(this.#timer)
    this.#timer = setTimeout(() => this.show(), SHOW_DELAY)
  }

  #onLeave = (): void => {
    clearTimeout(this.#timer)
    this.#timer = setTimeout(() => this.hide(), HIDE_DELAY)
  }

  #showNow = (): void => {
    clearTimeout(this.#timer)
    this.show()
  }

  #hide = (): void => this.hide()

  #onKey = (event: KeyboardEvent): void => {
    if (event.key === 'Escape' && this.open) {
      event.stopPropagation()
      this.hide()
    }
  }

  protected override firstUpdated(): void {
    // Keep it open while the pointer is on the tooltip itself
    this.addEventListener('pointerenter', () => clearTimeout(this.#timer))
    this.addEventListener('pointerleave', this.#onLeave)
  }

  protected override render() {
    return html`<div class="bubble" part="bubble"><slot></slot></div>`
  }
}

export function defineTooltip(): void {
  define('sub-tooltip', SubTooltip)
}

declare global {
  interface HTMLElementTagNameMap {
    'sub-tooltip': SubTooltip
  }
}
