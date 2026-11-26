import { LitElement, css, html, nothing, type PropertyValues } from 'lit'
import { defineButton } from './button'
import { rememberFocus } from './focus'
import { isSheet, supportsPopover } from './shared/listbox'
import { messages } from './shared/messages'
import { placeNear } from './shared/position'
import { baseStyles, focusStyles, iconStyles } from './shared/styles'
import { define, emit, warn } from './shared/utils'
import { iconClose } from './shared/material-icons'

export interface TourStep {
  /** CSS selector, element or function returning it. Without a target the step is centred. */
  target?: string | Element | (() => Element | null)
  title: string
  description?: string
  placement?: 'top' | 'bottom'
}

export type TourCloseReason = 'finish' | 'skip' | 'escape'

/** Declarative step: `<sub-tour-step target="#export" heading="Export">Download the report.</sub-tour-step>` */
export class SubTourStep extends LitElement {
  static override properties = {
    target: { type: String },
    heading: { type: String },
    placement: { type: String },
  }

  declare target: string
  declare heading: string
  declare placement: 'top' | 'bottom'

  constructor() {
    super()
    this.target = ''
    this.heading = ''
    this.placement = 'bottom'
  }

  static override styles = css`
    :host {
      display: none;
    }
  `

  protected override render() {
    return nothing
  }
}

/**
 * Product tour: a guided walk through the page, one step at a time. Each step is a non-modal dialog
 * ("Step 2 of 4", title, text, Previous / Next) next to its target, which is outlined with the focus
 * ring and (by default) spotlighted. Focus moves to the step when it appears, so screen readers read
 * it; Esc or the close button ends the tour and focus goes back to where it was. The page stays
 * usable (it is not a modal) and nothing moves on its own. On small screens the step docks to the bottom.
 *
 *   <sub-tour id="tour">
 *     <sub-tour-step target="#new" heading="Create">Start a project here.</sub-tour-step>
 *     <sub-tour-step heading="That is all">No target: the step is centred.</sub-tour-step>
 *   </sub-tour>
 *   tour.start()          // or: tour.steps = [{ target, title, description }]
 */
export class SubTour extends LitElement {
  static override properties = {
    open: { type: Boolean, reflect: true },
    index: { type: Number },
    steps: { attribute: false },
    noMask: { type: Boolean, attribute: 'no-mask' },
  }

  declare open: boolean
  declare index: number
  /** Steps as data; when empty the `<sub-tour-step>` children are used */
  declare steps: TourStep[]
  /** Outline the target only (no dimmed page) */
  declare noMask: boolean

  #restore: (() => void) | undefined
  #shown = false
  #raf = 0
  #observer: MutationObserver | undefined

  constructor() {
    super()
    this.open = false
    this.index = 0
    this.steps = []
    this.noMask = false
  }

  static override styles = [
    baseStyles,
    focusStyles,
    iconStyles,
    css`
      :host {
        display: contents;
      }

      .spot,
      .card {
        position: fixed;
        inset: auto;
        margin: 0;
        padding: 0;
        border: 0;
        background: transparent;
        overflow: visible;
      }

      /* The target is outlined with the focus ring; the dim comes from a huge shadow around it */
      .spot {
        box-sizing: content-box;
        padding: var(--sub-tour-spotlight-padding);
        margin: calc(var(--sub-tour-spotlight-padding) * -1);
        pointer-events: none;
        border-radius: var(--sub-tour-spotlight-radius);
        outline: var(--sub-tour-ring-width) solid var(--sub-color-focus);
        box-shadow:
          0 0 0 var(--sub-tour-ring-width) var(--sub-color-focus-inner),
          0 0 0 100vmax var(--sub-color-overlay);
        transition:
          top var(--sub-duration-base) var(--sub-ease-standard),
          left var(--sub-duration-base) var(--sub-ease-standard),
          width var(--sub-duration-base) var(--sub-ease-standard),
          height var(--sub-duration-base) var(--sub-ease-standard),
          opacity var(--sub-duration-base) var(--sub-ease-standard),
          overlay var(--sub-duration-base) allow-discrete,
          display var(--sub-duration-base) allow-discrete;
      }

      .spot[data-nomask] {
        box-shadow: 0 0 0 var(--sub-tour-ring-width) var(--sub-color-focus-inner);
      }

      .spot:not(:popover-open):not([data-open]) {
        display: none;
      }

      .card {
        inline-size: min(var(--sub-tour-width), calc(100vw - 1rem));
        max-block-size: calc(100dvh - 1rem);
        overflow: auto;
        border: var(--sub-tour-border-width) solid var(--sub-color-border);
        border-radius: var(--sub-tour-radius);
        background: var(--sub-color-surface-raised);
        color: var(--sub-color-text);
        font-family: var(--sub-font-sans);
        opacity: 0;
        translate: 0 calc(var(--sub-motion-distance) * -0.5);
        transition:
          opacity var(--sub-duration-fast) var(--sub-ease-standard),
          translate var(--sub-duration-fast) var(--sub-ease-standard),
          top var(--sub-duration-base) var(--sub-ease-standard),
          left var(--sub-duration-base) var(--sub-ease-standard),
          overlay var(--sub-duration-fast) allow-discrete,
          display var(--sub-duration-fast) allow-discrete;
      }

      .card:not(:popover-open):not([data-open]) {
        display: none;
      }

      .card:popover-open,
      .card[data-open] {
        opacity: 1;
        translate: 0 0;
      }

      @starting-style {
        .card:popover-open {
          opacity: 0;
          translate: 0 calc(var(--sub-motion-distance) * -0.5);
        }
      }

      .card:focus {
        outline: none;
      }

      .card:focus-visible {
        outline: var(--sub-focus-width) solid var(--sub-color-focus);
        outline-offset: calc(var(--sub-focus-width) * -1);
      }

      .centered {
        inset: 0;
        margin: auto;
        block-size: fit-content;
      }

      header {
        display: flex;
        gap: var(--sub-space-3);
        align-items: flex-start;
        justify-content: space-between;
        padding: var(--sub-tour-padding) var(--sub-tour-padding) 0;
      }

      .count {
        margin: 0;
        font-size: var(--sub-text-sm);
        font-weight: var(--sub-weight-semibold);
        color: var(--sub-color-muted);
        font-variant-numeric: tabular-nums;
      }

      .close {
        flex: none;
        display: grid;
        place-items: center;
        inline-size: var(--sub-target-size);
        block-size: var(--sub-target-size);
        margin: calc(var(--sub-space-2) * -1) calc(var(--sub-space-2) * -1) 0 0;
        padding: 0;
        border: 0;
        border-radius: var(--sub-control-radius);
        background: transparent;
        color: inherit;
        cursor: pointer;
      }

      h2 {
        margin: 0;
        padding: var(--sub-space-1) var(--sub-tour-padding) 0;
        font-size: var(--sub-text-lg);
        font-weight: var(--sub-weight-semibold);
        line-height: var(--sub-leading-snug);
        text-wrap: balance;
      }

      .text {
        margin: 0;
        padding: var(--sub-space-2) var(--sub-tour-padding) 0;
      }

      footer {
        display: flex;
        flex-wrap: wrap;
        gap: var(--sub-target-gap);
        justify-content: flex-end;
        padding: var(--sub-space-4) var(--sub-tour-padding) var(--sub-tour-padding);
      }

      /* Small screens: the step docks to the bottom edge (the page above stays visible) */
      @media (max-width: 40rem) {
        .card:not(.centered) {
          /* above the home indicator, clear of the notch */
          inset: auto calc(0.5rem + max(env(safe-area-inset-left), env(safe-area-inset-right))) calc(0.5rem + env(safe-area-inset-bottom));
          inline-size: auto;
          max-block-size: 60dvh;
        }
      }
    `,
  ]

  override connectedCallback(): void {
    super.connectedCallback()
    defineButton()
    defineTourStepOnce()
    // declarative steps can change while the tour runs
    this.#observer = new MutationObserver(() => this.requestUpdate())
    this.#observer.observe(this, { childList: true, subtree: true, characterData: true, attributes: true })
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback()
    this.#observer?.disconnect()
    this.#teardown()
  }

  // ---- steps -----------------------------------------------------------------

  get #steps(): TourStep[] {
    if (this.steps.length) return this.steps
    return [...this.querySelectorAll<SubTourStep>(':scope > sub-tour-step')].map((el) => ({
      target: el.getAttribute('target') || undefined,
      title: el.getAttribute('heading') ?? '',
      description: el.textContent?.trim() ?? '',
      placement: (el.getAttribute('placement') as TourStep['placement']) ?? undefined,
    }))
  }

  #target(step: TourStep | undefined): Element | null {
    const t = step?.target
    if (!t) return null
    if (typeof t === 'string') return (this.getRootNode() as Document | ShadowRoot).querySelector(t) ?? document.querySelector(t)
    if (typeof t === 'function') return t()
    return t
  }

  // ---- public API ------------------------------------------------------------

  start(index = 0): void {
    if (!this.#steps.length) {
      warn('<sub-tour> has no steps: add <sub-tour-step> children or set `steps`.')
      return
    }
    if (!this.open) this.#restore = rememberFocus()
    this.index = Math.min(Math.max(index, 0), this.#steps.length - 1)
    this.open = true
  }

  next(): void {
    if (this.index >= this.#steps.length - 1) this.close('finish')
    else this.#go(this.index + 1)
  }

  prev(): void {
    if (this.index > 0) this.#go(this.index - 1)
  }

  goTo(index: number): void {
    this.#go(index)
  }

  close(reason: TourCloseReason = 'skip'): void {
    if (!this.open) return
    this.open = false
    this.#teardown()
    this.#restore?.()
    this.#restore = undefined
    emit(this, 'sub-tour-close', { reason, index: this.index })
  }

  #go(index: number): void {
    this.index = index
    emit(this, 'sub-tour-change', { index, step: this.#steps[index] })
  }

  // ---- layout ----------------------------------------------------------------

  get #card(): HTMLElement | null {
    return this.renderRoot.querySelector<HTMLElement>('.card')
  }
  get #spot(): HTMLElement | null {
    return this.renderRoot.querySelector<HTMLElement>('.spot')
  }

  #place = (): void => {
    const card = this.#card
    const spot = this.#spot
    if (!card || !spot || !this.open) return
    const step = this.#steps[this.index]
    const target = this.#target(step)
    card.classList.toggle('centered', !target)
    if (!target) {
      spot.style.cssText = 'top:50%;left:50%;width:0;height:0;padding:0;margin:0'
      card.style.top = card.style.left = ''
      return
    }
    const r = target.getBoundingClientRect()
    Object.assign(spot.style, { padding: '', margin: '', top: `${r.top}px`, left: `${r.left}px`, width: `${r.width}px`, height: `${r.height}px` })
    if (isSheet()) {
      card.style.top = card.style.left = ''
      // keep the target above the docked step
      const over = r.bottom - (innerHeight - card.offsetHeight - 16)
      if (over > 0) scrollBy({ top: over })
      return
    }
    placeNear({ getBoundingClientRect: () => spot.getBoundingClientRect() }, card, step?.placement ?? 'bottom', 'start', 12)
  }

  #schedule = (): void => {
    cancelAnimationFrame(this.#raf)
    this.#raf = requestAnimationFrame(this.#place)
  }

  #onKey = (event: KeyboardEvent): void => {
    if (event.key === 'Escape' && this.open) {
      event.preventDefault()
      event.stopPropagation()
      this.close('escape')
    }
  }

  #teardown(): void {
    const spot = this.#spot
    const card = this.#card
    if (supportsPopover) {
      if (spot?.matches(':popover-open')) spot.hidePopover()
      if (card?.matches(':popover-open')) card.hidePopover()
    }
    spot?.removeAttribute('data-open')
    card?.removeAttribute('data-open')
    this.#shown = false
    window.removeEventListener('resize', this.#schedule)
    window.removeEventListener('scroll', this.#schedule, true)
    document.removeEventListener('keydown', this.#onKey, true)
    cancelAnimationFrame(this.#raf)
  }

  protected override updated(changed: PropertyValues): void {
    if (!this.open) return
    const spot = this.#spot
    const card = this.#card
    if (!spot || !card) return
    if (!this.#shown) {
      this.#shown = true
      if (supportsPopover) {
        spot.showPopover() // dim first, then the step above it
        card.showPopover()
      } else {
        spot.setAttribute('data-open', '')
        card.setAttribute('data-open', '')
      }
      window.addEventListener('resize', this.#schedule)
      window.addEventListener('scroll', this.#schedule, true)
      document.addEventListener('keydown', this.#onKey, true)
    }
    if (changed.has('index') || changed.has('open')) {
      const target = this.#target(this.#steps[this.index])
      target?.scrollIntoView({ block: 'center', inline: 'nearest' })
      this.#place()
      card.focus({ preventScroll: true }) // screen readers read the step's name and description
    } else this.#place()
  }

  protected override render() {
    if (!this.open) return nothing
    const steps = this.#steps
    const step = steps[this.index]
    if (!step) return nothing
    const last = this.index === steps.length - 1
    return html`
      <div class="spot" popover=${supportsPopover ? 'manual' : nothing} ?data-nomask=${this.noMask} aria-hidden="true"></div>
      <div
        class="card"
        part="card"
        popover=${supportsPopover ? 'manual' : nothing}
        role="dialog"
        tabindex="-1"
        aria-labelledby="title"
        aria-describedby="count text"
      >
        <header>
          <p id="count" class="count">${messages.tourStep(this.index + 1, steps.length)}</p>
          <button class="close" type="button" aria-label=${messages.tourClose} @click=${() => this.close('skip')}>${iconClose()}</button>
        </header>
        <h2 id="title">${step.title}</h2>
        ${step.description ? html`<p id="text" class="text">${step.description}</p>` : nothing}
        <footer>
          ${this.index > 0 ? html`<sub-button variant="secondary" @click=${() => this.prev()}>${messages.previous}</sub-button>` : nothing}
          <sub-button @click=${() => this.next()}>${last ? messages.tourFinish : messages.next}</sub-button>
        </footer>
      </div>
    `
  }
}

let stepDefined = false
function defineTourStepOnce(): void {
  if (stepDefined) return
  stepDefined = true
  define('sub-tour-step', SubTourStep)
}

export function defineTour(): void {
  defineButton()
  defineTourStepOnce()
  define('sub-tour', SubTour)
}

declare global {
  interface HTMLElementTagNameMap {
    'sub-tour': SubTour
    'sub-tour-step': SubTourStep
  }
}
