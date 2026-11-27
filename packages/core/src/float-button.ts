import { LitElement, css, html, nothing } from 'lit'
import { focusHeading } from './focus'
import { defineIconButton } from './icon-button'
import { messages } from './shared/messages'
import { baseStyles } from './shared/styles'
import { define, emit } from './shared/utils'

/**
 * Floating action button pinned to a corner. Icon-only, so `label` is mandatory (name + tooltip).
 * `back-top` turns it into "Back to top": it appears after scrolling, and after jumping it moves
 * keyboard focus to the page heading (the button itself disappears, so focus must not be left on it).
 * `static` renders it in flow (docs, previews). Keep it small: it must never cover content or focus.
 * @fires {CustomEvent} sub-float-click - The button was pressed
 */
export class SubFloatButton extends LitElement {
  static override properties = {
    icon: { type: String },
    label: { type: String },
    backTop: { type: Boolean, attribute: 'back-top' },
    position: { type: String, reflect: true },
    inline: { type: Boolean, reflect: true, attribute: 'static' },
    _shown: { state: true },
  }

  declare icon: string
  declare label: string
  declare backTop: boolean
  declare position: 'end' | 'start'
  declare inline: boolean
  declare _shown: boolean

  constructor() {
    super()
    this.icon = 'add'
    this.label = ''
    this.backTop = false
    this.position = 'end'
    this.inline = false
    this._shown = true
  }

  static override styles = [
    baseStyles,
    css`
      :host {
        position: fixed;
        /* clear of the notch and the home indicator on phones (env() is 0 elsewhere) */
        --_side: max(env(safe-area-inset-left), env(safe-area-inset-right));
        inset-block-end: calc(var(--sub-float-button-offset) + env(safe-area-inset-bottom));
        inset-inline-end: calc(var(--sub-float-button-offset) + var(--_side));
        z-index: var(--sub-z-sticky);
        display: block;
        --sub-icon-button-size: var(--sub-float-button-size);
        --sub-icon-button-radius: var(--sub-float-button-radius);
        --sub-icon-button-border-width: var(--sub-float-button-border-width);
      }

      :host([position='start']) {
        inset-inline-end: auto;
        inset-inline-start: calc(var(--sub-float-button-offset) + var(--_side));
      }

      :host([static]) {
        position: static;
        display: inline-block;
      }
    `,
  ]

  override connectedCallback(): void {
    super.connectedCallback()
    defineIconButton()
    if (this.backTop) {
      this._shown = window.scrollY > 300
      window.addEventListener('scroll', this.#onScroll, { passive: true })
    }
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback()
    window.removeEventListener('scroll', this.#onScroll)
  }

  #onScroll = (): void => {
    this._shown = window.scrollY > 300
  }

  #click = (): void => {
    if (this.backTop) {
      window.scrollTo({ top: 0, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' })
      focusHeading({ preventScroll: true })
    }
    emit(this, 'sub-float-click')
  }

  protected override render() {
    if (this.backTop && !this._shown) return nothing
    return html`<sub-icon-button
      variant="primary"
      icon=${this.backTop ? 'arrow_upward' : this.icon}
      label=${this.label || (this.backTop ? messages.scrollToTop : '')}
      @click=${this.#click}
    ></sub-icon-button>`
  }
}

export function defineFloatButton(): void {
  defineIconButton()
  define('sub-float-button', SubFloatButton)
}

declare global {
  interface HTMLElementTagNameMap {
    'sub-float-button': SubFloatButton
  }
}
