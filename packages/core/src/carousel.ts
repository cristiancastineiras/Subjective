import { LitElement, css, html, nothing } from 'lit'
import { icons } from './shared/icons'
import { messages } from './shared/messages'
import { baseStyles, focusStyles, iconStyles, visuallyHidden } from './shared/styles'
import { define, emit, wrap } from './shared/utils'

/**
 * Carousel following the ARIA carousel pattern. Slides are your children; the component labels them
 * ("2 of 5"), shows one at a time and keeps the others out of the accessibility tree. Controls are real
 * buttons: previous, next, one button per slide, and (with `autoplay`) a Pause/Play button. Autoplay is
 * OFF by default, pauses on hover and focus, never runs under `prefers-reduced-motion`, and the live
 * region is silent while it rotates (WCAG 2.2.2 Pause, Stop, Hide).
 *
 *   <sub-carousel label="Featured products"><div>Slide 1</div><div>Slide 2</div></sub-carousel>
 */
export class SubCarousel extends LitElement {
  static override properties = {
    label: { type: String },
    index: { type: Number, reflect: true },
    autoplay: { type: Boolean },
    interval: { type: Number },
    _paused: { state: true },
    _count: { state: true },
  }

  declare label: string
  declare index: number
  declare autoplay: boolean
  /** ms between slides while playing */
  declare interval: number
  declare _paused: boolean
  declare _count: number

  #timer: ReturnType<typeof setInterval> | undefined
  #hover = false

  constructor() {
    super()
    this.label = ''
    this.index = 0
    this.autoplay = false
    this.interval = 5000
    this._paused = false
    this._count = 0
  }

  static override styles = [
    baseStyles,
    focusStyles,
    iconStyles,
    visuallyHidden,
    css`
      :host {
        display: block;
        font-family: var(--sub-font-sans);
        color: var(--sub-color-text);
      }

      .carousel {
        display: grid;
        gap: var(--sub-carousel-gap);
      }

      .viewport {
        border: var(--sub-carousel-border-width) solid var(--sub-color-border-subtle);
        border-radius: var(--sub-carousel-radius);
        overflow: hidden;
        background: var(--sub-color-surface);
      }

      ::slotted([hidden]) {
        display: none !important;
      }

      .controls {
        display: flex;
        flex-wrap: wrap;
        gap: var(--sub-carousel-gap);
        align-items: center;
        justify-content: center;
      }

      button {
        display: grid;
        place-items: center;
        min-inline-size: var(--sub-carousel-control-size);
        block-size: var(--sub-carousel-control-size);
        padding: 0 var(--sub-space-2);
        border: var(--sub-carousel-border-width) solid var(--sub-color-border);
        border-radius: var(--sub-carousel-radius);
        background: var(--sub-color-surface);
        color: var(--sub-color-text);
        font: var(--sub-weight-semibold) var(--sub-text-md) / 1 var(--sub-font-sans);
        cursor: pointer;
      }

      button[aria-current='true'] {
        background: var(--sub-color-accent);
        color: var(--sub-color-on-accent);
        border-color: var(--sub-color-accent);
      }

      @media (hover: hover) {
        button:not([aria-current='true']):hover {
          background: var(--sub-color-surface-hover);
        }
      }

      ul {
        display: flex;
        flex-wrap: wrap;
        gap: var(--sub-target-gap);
        margin: 0;
        padding: 0;
        list-style: none;
      }
    `,
  ]

  get #slides(): HTMLElement[] {
    return [...this.children].filter((c): c is HTMLElement => c instanceof HTMLElement && !c.hasAttribute('slot'))
  }

  override connectedCallback(): void {
    super.connectedCallback()
    this.addEventListener('pointerenter', () => ((this.#hover = true), this.#sync()))
    this.addEventListener('pointerleave', () => ((this.#hover = false), this.#sync()))
    this.addEventListener('focusin', () => this.#sync())
    this.addEventListener('focusout', () => this.#sync())
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback()
    clearInterval(this.#timer)
  }

  get #playing(): boolean {
    return this.autoplay && !this._paused && !matchMedia('(prefers-reduced-motion: reduce)').matches
  }

  #sync(): void {
    clearInterval(this.#timer)
    if (this.#playing && !this.#hover && !this.matches(':focus-within')) {
      this.#timer = setInterval(() => this.#go(this.index + 1), this.interval)
    }
  }

  #go(i: number): void {
    const n = this.#slides.length
    if (!n) return
    this.index = wrap(i, n)
    emit(this, 'sub-slide', { index: this.index })
  }

  protected override updated(): void {
    const slides = this.#slides
    this._count = slides.length
    slides.forEach((s, i) => {
      s.setAttribute('role', 'group')
      s.setAttribute('aria-roledescription', 'slide')
      s.setAttribute('aria-label', messages.slideOf(i + 1, slides.length))
      s.hidden = i !== this.index
    })
    this.#sync()
  }

  protected override render() {
    const n = this._count
    return html`<section class="carousel" aria-roledescription="carousel" aria-label=${this.label}>
      <div class="viewport" aria-live=${this.#playing ? 'off' : 'polite'}><slot @slotchange=${() => this.requestUpdate()}></slot></div>
      <div class="controls">
        <button type="button" aria-label=${messages.previousSlide} @click=${() => this.#go(this.index - 1)}>${icons.chevron_left()}</button>
        ${this.autoplay
          ? html`<button type="button" @click=${() => ((this._paused = !this._paused), this.#sync())}>
              ${this._paused ? icons.play_arrow() : icons.pause()}<span class="sr-only">${this._paused ? messages.play : messages.pause}</span>
            </button>`
          : nothing}
        <ul>
          ${Array.from({ length: n }, (_, i) => html`<li><button type="button" aria-label=${messages.slideOf(i + 1, n)} aria-current=${i === this.index ? 'true' : 'false'} @click=${() => this.#go(i)}>${i + 1}</button></li>`)}
        </ul>
        <button type="button" aria-label=${messages.nextSlide} @click=${() => this.#go(this.index + 1)}>${icons.chevron_right()}</button>
      </div>
    </section>`
  }
}

export function defineCarousel(): void {
  define('sub-carousel', SubCarousel)
}

declare global {
  interface HTMLElementTagNameMap {
    'sub-carousel': SubCarousel
  }
}
