import { LitElement, css, html } from 'lit'
import { baseStyles } from './shared/styles'
import { define, emit } from './shared/utils'

/**
 * Keeps its content visible while the page scrolls (`position: sticky`). `offset-top` is the gap to
 * the viewport top in px. Fires `sub-affix-change` ({stuck}) and reflects `stuck`. Sticky content must
 * never cover focused elements (WCAG 2.4.11): keep it small and give scrolled targets
 * `scroll-margin-top`.
 */
export class SubAffix extends LitElement {
  static override properties = {
    offsetTop: { type: Number, attribute: 'offset-top' },
    stuck: { type: Boolean, reflect: true },
  }

  declare offsetTop: number
  declare stuck: boolean

  #observer: IntersectionObserver | undefined

  constructor() {
    super()
    this.offsetTop = 0
    this.stuck = false
  }

  static override styles = [
    baseStyles,
    css`
      :host {
        position: sticky;
        inset-block-start: var(--_top, 0);
        z-index: var(--sub-z-sticky);
        display: block;
      }
    `,
  ]

  override connectedCallback(): void {
    super.connectedCallback()
    this.#watch()
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback()
    this.#observer?.disconnect()
  }

  protected override updated(changed: Map<string, unknown>): void {
    this.style.setProperty('--_top', `${this.offsetTop}px`)
    if (changed.has('offsetTop')) this.#watch()
  }

  #watch(): void {
    this.#observer?.disconnect()
    if (typeof IntersectionObserver === 'undefined') return
    // Fully visible = not stuck; once its top sits on the offset line it is clipped by 1px = stuck
    this.#observer = new IntersectionObserver(
      ([entry]) => {
        const stuck = (entry?.intersectionRatio ?? 1) < 1
        if (stuck !== this.stuck) {
          this.stuck = stuck
          emit(this, 'sub-affix-change', { stuck })
        }
      },
      { threshold: [1], rootMargin: `-${this.offsetTop + 1}px 0px 0px 0px` },
    )
    this.#observer.observe(this)
  }

  protected override render() {
    return html`<slot></slot>`
  }
}

export function defineAffix(): void {
  define('sub-affix', SubAffix)
}

declare global {
  interface HTMLElementTagNameMap {
    'sub-affix': SubAffix
  }
}
