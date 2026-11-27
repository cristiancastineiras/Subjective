import { LitElement, css, html, nothing } from 'lit'
import { messages } from './shared/messages'
import { baseStyles, focusStyles, iconStyles, visuallyHidden } from './shared/styles'
import { define, emit, wrap } from './shared/utils'
import { iconChevronLeft, iconChevronRight, iconPause, iconPlayArrow } from './shared/material-icons'

/**
 * Carousel following the ARIA carousel pattern. Slides are your children; the component labels them
 * ("2 of 5"), shows one at a time and keeps the others out of the accessibility tree. Controls are real
 * buttons: previous, next, one button per slide, and (with `autoplay`) a Pause/Play button. Autoplay is
 * OFF by default, pauses on hover and focus, never runs under `prefers-reduced-motion`, and the live
 * region is silent while it rotates (WCAG 2.2.2 Pause, Stop, Hide).
 * Narrower than 24rem (a phone) the controls fit one row with "2 / 5"; a horizontal swipe on the slide moves too
 * (and stops autoplay); the Previous / Next buttons are its single-tap alternative (WCAG 2.5.1).
 *
 *   <sub-carousel label="Featured products"><div>Slide 1</div><div>Slide 2</div></sub-carousel>
 * @fires {CustomEvent<{ index: number }>} sub-slide - The visible slide changed
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
        inline-size: 100%; /* a container never shrink-wraps its content: fill the line (also inside a flex row) */
        container-type: inline-size;
        font-family: var(--sub-font-sans);
        color: var(--sub-color-text);
      }

      .carousel {
        display: grid;
        gap: var(--sub-carousel-gap);
      }

      .viewport {
        touch-action: pan-y; /* a horizontal swipe changes the slide; vertical scrolling stays the page's */
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

      .count {
        display: none;
        min-inline-size: 4em;
        text-align: center;
        font-weight: var(--sub-weight-semibold);
        font-variant-numeric: tabular-nums;
      }

      /* Narrow (a phone): one row, "2 / 5" instead of a button per slide; swipe or the arrows to move */
      @container (inline-size < 24rem) {
        .controls {
          flex-wrap: nowrap;
          justify-content: space-between;
        }

        ul {
          display: none;
        }

        .count {
          display: block;
        }
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

  #swipe: { x: number; y: number; id: number } | undefined

  #onPointerDown = (e: PointerEvent): void => {
    this.#swipe = e.pointerType === 'mouse' ? undefined : { x: e.clientX, y: e.clientY, id: e.pointerId }
  }

  /** A deliberate horizontal swipe (WCAG 2.5.1: the Previous / Next buttons do the same with one tap) */
  #onPointerUp = (e: PointerEvent): void => {
    const start = this.#swipe
    this.#swipe = undefined
    if (!start || start.id !== e.pointerId) return
    const dx = e.clientX - start.x
    const dy = e.clientY - start.y
    if (Math.abs(dx) < 40 || Math.abs(dx) < Math.abs(dy) * 1.5) return
    const forward = dx < 0 !== (getComputedStyle(this).direction === 'rtl')
    if (this.autoplay) this._paused = true // the user took over: stop rotating
    this.#go(this.index + (forward ? 1 : -1))
    this.#sync()
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
      <div
        class="viewport"
        aria-live=${this.#playing ? 'off' : 'polite'}
        @pointerdown=${this.#onPointerDown}
        @pointerup=${this.#onPointerUp}
        @pointercancel=${() => (this.#swipe = undefined)}
      >
        <slot @slotchange=${() => this.requestUpdate()}></slot>
      </div>
      <div class="controls">
        <button type="button" aria-label=${messages.previousSlide} @click=${() => this.#go(this.index - 1)}>${iconChevronLeft()}</button>
        ${this.autoplay
          ? html`<button type="button" @click=${() => ((this._paused = !this._paused), this.#sync())}>
              ${this._paused ? iconPlayArrow() : iconPause()}<span class="sr-only">${this._paused ? messages.play : messages.pause}</span>
            </button>`
          : nothing}
        <ul>
          ${Array.from({ length: n }, (_, i) => html`<li><button type="button" aria-label=${messages.slideOf(i + 1, n)} aria-current=${i === this.index ? 'true' : 'false'} @click=${() => this.#go(i)}>${i + 1}</button></li>`)}
        </ul>
        <span class="count" aria-hidden="true">${n ? `${this.index + 1} / ${n}` : ''}</span>
        <button type="button" aria-label=${messages.nextSlide} @click=${() => this.#go(this.index + 1)}>${iconChevronRight()}</button>
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
