import { LitElement, css, html, nothing, type PropertyDeclarations, type TemplateResult } from 'lit'
import { getTabbable } from './focus'
import { autoUpdate, placeNear, type Placement } from './shared/position'
import { baseStyles, focusStyles, popupMotion } from './shared/styles'
import { define, emit, warn } from './shared/utils'

const supportsPopover = typeof HTMLElement !== 'undefined' && typeof HTMLElement.prototype.showPopover === 'function'

/**
 * Non-modal popover for supplementary or interactive content next to a trigger (use <sub-tooltip> for
 * a short hint, <sub-dialog> when the page must stop). The trigger is YOUR button in `slot="trigger"`;
 * the component sets `aria-haspopup="dialog"` and `aria-expanded` on it. Focus moves into the panel on
 * open; Esc, a click outside, or Tab leaving the panel closes it and Esc returns focus to the trigger.
 *
 *   <sub-popover label="Shipping details"><button slot="trigger">Details</button>Free over 50.</sub-popover>
 * @fires {CustomEvent} sub-close - The panel closed
 * @fires {CustomEvent} sub-open - The panel opened
 */
export class SubPopover extends LitElement {
  static override properties: PropertyDeclarations = {
    label: { type: String },
    open: { type: Boolean, reflect: true },
    placement: { type: String },
  }

  declare label: string
  declare open: boolean
  declare placement: 'top' | 'bottom'

  constructor() {
    super()
    this.label = ''
    this.open = false
    this.placement = 'bottom'
  }

  static override styles = [
    baseStyles,
    focusStyles,
    css`
      :host {
        display: inline-block;
        font-family: var(--sub-font-sans);
        color: var(--sub-color-text);
      }

      .panel {
        position: fixed;
        inset: auto;
        margin: 0;
        max-inline-size: min(var(--sub-popover-max-width), calc(100vw - 1rem));
        padding: var(--sub-popover-padding);
        border: var(--sub-popover-border-width) solid var(--sub-color-border);
        border-radius: var(--sub-popover-radius);
        background: var(--sub-color-surface-raised);
        color: var(--sub-color-text);
        overflow: auto;
        z-index: var(--sub-z-dropdown);
      }

      .panel:not([popover]):not([data-open]) {
        display: none;
      }

      ${popupMotion('.panel')}
    `,
  ]

  override connectedCallback(): void {
    super.connectedCallback()
    this.addEventListener('click', this.#onHostClick)
    document.addEventListener('pointerdown', this.#onOutside)
  }

  #stopFollowing: (() => void) | undefined
  #current: Placement | undefined

  #unfollow(): void {
    this.#stopFollowing?.()
    this.#stopFollowing = undefined
    this.#current = undefined
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback()
    this.#unfollow()
    this.removeEventListener('click', this.#onHostClick)
    document.removeEventListener('pointerdown', this.#onOutside)
  }

  protected get trigger(): HTMLElement | null {
    return this.querySelector<HTMLElement>(':scope > [slot="trigger"]')
  }
  protected get panel(): HTMLElement | null {
    return this.renderRoot.querySelector('.panel')
  }

  /** What goes inside the panel (subclasses replace it) */
  protected panelContent(): TemplateResult {
    return html`<slot></slot>`
  }

  /** First focus target when it opens */
  protected initialFocus(): HTMLElement | null {
    return getTabbable(this.panel ?? this)[0] ?? this.panel
  }

  protected override firstUpdated(): void {
    if (!this.trigger) warn('<sub-popover> needs a trigger: <button slot="trigger">.')
    if (!this.label) warn('<sub-popover> needs a "label" (the popover is a dialog).')
  }

  /** The element that actually carries the button semantics (the control inside a delegatesFocus host) */
  protected get ariaTarget(): HTMLElement | null {
    const t = this.trigger
    if (!t) return null
    return (t.shadowRoot?.delegatesFocus ? t.shadowRoot.querySelector<HTMLElement>('button, a[href], [tabindex]') : null) ?? t
  }

  protected override updated(changed: Map<string, unknown>): void {
    const t = this.trigger
    void (t as (HTMLElement & { updateComplete?: Promise<unknown> }) | null)?.updateComplete?.then(() => {
      const target = this.ariaTarget
      target?.setAttribute('aria-haspopup', 'dialog')
      target?.setAttribute('aria-expanded', String(this.open))
    })
    if (!changed.has('open')) return
    const panel = this.panel
    if (!panel) return
    if (this.open) {
      if (supportsPopover) panel.showPopover()
      else panel.setAttribute('data-open', '')
      // attached to its trigger while open: follows scrolling, flips when there is no room
      this.#unfollow()
      if (t) this.#stopFollowing = autoUpdate(() => (this.#current = placeNear(t, panel, this.placement, 'start', 6, 8, { current: this.#current, fitHeight: true })), [t, panel])
      this.initialFocus()?.focus()
      emit(this, 'sub-open')
    } else {
      this.#unfollow()
      if (supportsPopover && panel.matches(':popover-open')) panel.hidePopover()
      panel.removeAttribute('data-open')
      emit(this, 'sub-close')
    }
  }

  #onHostClick = (e: Event): void => {
    const t = this.trigger
    if (t && e.composedPath().includes(t)) this.open = !this.open
  }

  #onOutside = (e: Event): void => {
    if (this.open && !e.composedPath().includes(this)) this.open = false
  }

  #onKey = (e: KeyboardEvent): void => {
    if (e.key === 'Escape') {
      e.stopPropagation()
      this.open = false
      this.trigger?.focus()
    }
  }

  #onFocusOut = (e: FocusEvent): void => {
    const next = e.relatedTarget as Node | null
    if (this.open && next && !this.contains(next) && !this.renderRoot.contains(next)) this.open = false
  }

  show(): void {
    this.open = true
  }
  hide(): void {
    this.open = false
  }

  protected override render() {
    return html`<slot name="trigger"></slot>
      <div
        class="panel"
        part="panel"
        role="dialog"
        tabindex="-1"
        aria-label=${this.label || nothing}
        popover=${supportsPopover ? 'manual' : nothing}
        @keydown=${this.#onKey}
        @focusout=${this.#onFocusOut}
      >
        ${this.panelContent()}
      </div>`
  }
}

export function definePopover(): void {
  define('sub-popover', SubPopover)
}

declare global {
  interface HTMLElementTagNameMap {
    'sub-popover': SubPopover
  }
}
