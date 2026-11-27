import { LitElement, css, html } from 'lit'
import { messages } from './shared/messages'
import { baseStyles, focusStyles } from './shared/styles'
import { define, emit } from './shared/utils'

/**
 * Two resizable panes (ARIA "window splitter"). The handle is `role="separator"` and focusable:
 * Left/Right (or Up/Down when `orientation="vertical"`) move it by 1%, with Shift by 10%; Home/End go to
 * the limits; Enter collapses / restores the first pane. Dragging works with the pointer, but the
 * keyboard alternative is complete (WCAG 2.5.7). Values are the first pane's percentage.
 * Narrower than 24rem (a phone), a horizontal splitter stacks its panes at full width (no handle).
 * @fires {CustomEvent<{ value: number }>} sub-resize - The first pane size changed (percent)
 */
export class SubSplitter extends LitElement {
  static override properties = {
    value: { type: Number, reflect: true },
    min: { type: Number },
    max: { type: Number },
    orientation: { type: String, reflect: true },
    label: { type: String },
  }

  declare value: number
  declare min: number
  declare max: number
  declare orientation: 'horizontal' | 'vertical'
  declare label: string

  #restore = 0

  constructor() {
    super()
    this.value = 50
    this.min = 10
    this.max = 90
    this.orientation = 'horizontal'
    this.label = ''
  }

  static override styles = [
    baseStyles,
    focusStyles,
    css`
      :host {
        display: block;
        inline-size: 100%; /* a container never shrink-wraps its content: fill the line (also inside a flex row) */
        container-type: inline-size;
        min-block-size: 8rem;
        font-family: var(--sub-font-sans);
      }

      .split {
        display: grid;
        grid-template-columns: minmax(0, var(--_a)) var(--sub-splitter-handle-size) minmax(0, var(--_b));
        block-size: 100%;
        min-block-size: inherit;
      }

      :host([orientation='vertical']) .split {
        grid-template-columns: minmax(0, 1fr);
        grid-template-rows: minmax(0, var(--_a)) var(--sub-splitter-handle-size) minmax(0, var(--_b));
      }

      /* Narrow (a phone): side-by-side panes would be a few words wide. They stack at full width and the
         handle goes away (nothing to resize, so no control that does nothing for keyboard or screen readers). */
      @container (inline-size < 24rem) {
        :host(:not([orientation='vertical'])) .split {
          grid-template-columns: minmax(0, 1fr);
          grid-template-rows: auto auto;
          block-size: auto;
        }

        :host(:not([orientation='vertical'])) .handle {
          display: none;
        }

        :host(:not([orientation='vertical'])) #end {
          border-block-start: var(--sub-border-width-thin) solid var(--sub-color-border-subtle);
        }
      }

      .pane {
        min-inline-size: 0;
        min-block-size: 0;
        overflow: auto;
      }

      .handle {
        display: grid;
        place-items: center;
        cursor: col-resize;
        touch-action: none;
        outline-offset: calc(var(--sub-focus-width) * -1);
      }

      :host([orientation='vertical']) .handle {
        cursor: row-resize;
      }

      .handle::before {
        content: '';
        inline-size: var(--sub-splitter-thickness);
        block-size: 100%;
        background: var(--sub-color-border);
      }

      :host([orientation='vertical']) .handle::before {
        inline-size: 100%;
        block-size: var(--sub-splitter-thickness);
      }

      .handle:hover::before,
      .handle:focus-visible::before {
        background: var(--sub-color-accent);
      }

      @media (forced-colors: active) {
        .handle::before {
          background: ButtonText;
        }
      }
    `,
  ]

  #set(v: number): void {
    const next = Math.min(this.max, Math.max(this.min, Math.round(v * 10) / 10))
    if (next === this.value) return
    this.value = next
    emit(this, 'sub-resize', { value: next })
  }

  #onKey = (event: KeyboardEvent): void => {
    const vertical = this.orientation === 'vertical'
    const rtl = !vertical && getComputedStyle(this).direction === 'rtl'
    const step = event.shiftKey ? 10 : 1
    const dec = vertical ? 'ArrowUp' : rtl ? 'ArrowRight' : 'ArrowLeft'
    const inc = vertical ? 'ArrowDown' : rtl ? 'ArrowLeft' : 'ArrowRight'
    if (event.key === dec) this.#set(this.value - step)
    else if (event.key === inc) this.#set(this.value + step)
    else if (event.key === 'Home') this.#set(this.min)
    else if (event.key === 'End') this.#set(this.max)
    else if (event.key === 'Enter') {
      // Collapse the first pane, or restore it
      if (this.value > 0 && this.#restore === 0) {
        this.#restore = this.value
        this.#force(0)
      } else {
        this.#force(this.#restore || 50)
        this.#restore = 0
      }
    } else return
    event.preventDefault()
  }

  #force(v: number): void {
    this.value = v
    emit(this, 'sub-resize', { value: v })
  }

  #onPointerDown = (event: PointerEvent): void => {
    ;(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId)
  }

  #onPointerMove = (event: PointerEvent): void => {
    if (!(event.currentTarget as HTMLElement).hasPointerCapture(event.pointerId)) return
    const rect = this.getBoundingClientRect()
    const vertical = this.orientation === 'vertical'
    const pos = vertical ? event.clientY - rect.top : event.clientX - rect.left
    this.#set((pos / (vertical ? rect.height : rect.width)) * 100)
  }

  protected override render() {
    return html`<div class="split" style=${`--_a:${this.value}fr;--_b:${100 - this.value}fr`}>
      <div class="pane" id="start"><slot name="start"></slot></div>
      <div
        class="handle"
        role="separator"
        tabindex="0"
        aria-orientation=${this.orientation === 'vertical' ? 'horizontal' : 'vertical'}
        aria-label=${this.label || messages.resizePanes}
        aria-controls="start"
        aria-valuenow=${Math.round(this.value)}
        aria-valuemin=${this.min}
        aria-valuemax=${this.max}
        @keydown=${this.#onKey}
        @pointerdown=${this.#onPointerDown}
        @pointermove=${this.#onPointerMove}
      ></div>
      <div class="pane" id="end"><slot name="end"></slot></div>
    </div>`
  }
}

export function defineSplitter(): void {
  define('sub-splitter', SubSplitter)
}

declare global {
  interface HTMLElementTagNameMap {
    'sub-splitter': SubSplitter
  }
}
