import { css, html, nothing } from 'lit'
import { ifDefined } from 'lit/directives/if-defined.js'
import { SubFormControl, formControlStyles, type FormValue } from './shared/form-control'

import { define } from './shared/utils'

/**
 * Slider (native `<input type="range">`): arrows adjust, Home/End jump to min/max, PageUp/PageDown
 * make bigger steps; the current value is always visible as text (`<output>`), never only a thumb.
 * Use for approximate values; for exact numbers prefer <sub-input-number>.
 */
export class SubSlider extends SubFormControl {
  static override properties = {
    value: { type: String },
    min: { type: String },
    max: { type: String },
    step: { type: String },
    valuetext: { type: String },
    unit: { type: String },
  }

  declare value: string
  declare min: string
  declare max: string
  declare step: string
  /** Spoken value, e.g. "40 percent" (defaults to the number) */
  declare valuetext: string
  /** Shown after the value, e.g. "%" */
  declare unit: string

  #default = ''

  constructor() {
    super()
    this.value = ''
    this.min = '0'
    this.max = '100'
    this.step = '1'
    this.valuetext = ''
    this.unit = ''
  }

  static override styles = [
    ...formControlStyles,
    css`
      .row {
        display: flex;
        gap: var(--sub-space-4);
        align-items: center;
      }

      output {
        flex: none;
        min-inline-size: 4ch;
        font-weight: var(--sub-weight-bold);
        font-variant-numeric: tabular-nums;
        text-align: end;
      }

      input[type='range'] {
        flex: 1;
        min-inline-size: 0;
        block-size: var(--sub-slider-min-size);
        margin: 0;
        background: transparent;
        appearance: none;
        cursor: pointer;
      }

      input[type='range']::-webkit-slider-runnable-track {
        block-size: var(--sub-slider-track-height);
        border: var(--sub-field-border-width) solid var(--sub-color-border);
        border-radius: var(--sub-slider-radius);
        background: linear-gradient(to right, var(--sub-color-accent) var(--_pct, 0%), var(--sub-color-surface-sunken) var(--_pct, 0%));
        box-sizing: content-box;
      }

      input[type='range']::-moz-range-track {
        block-size: var(--sub-slider-track-height);
        border: var(--sub-field-border-width) solid var(--sub-color-border);
        border-radius: var(--sub-slider-radius);
        background: linear-gradient(to right, var(--sub-color-accent) var(--_pct, 0%), var(--sub-color-surface-sunken) var(--_pct, 0%));
        box-sizing: content-box;
      }

      input[type='range']::-webkit-slider-thumb {
        appearance: none;
        inline-size: var(--sub-slider-thumb-size);
        block-size: var(--sub-slider-thumb-size);
        margin-block-start: calc((var(--sub-slider-track-height) - var(--sub-slider-thumb-size)) / 2);
        border: var(--sub-field-border-width) solid var(--sub-color-border);
        border-radius: var(--sub-slider-radius);
        background: var(--sub-color-surface);
      }

      input[type='range']::-moz-range-thumb {
        inline-size: var(--sub-slider-thumb-size);
        block-size: var(--sub-slider-thumb-size);
        box-sizing: border-box;
        border: var(--sub-field-border-width) solid var(--sub-color-border);
        border-radius: var(--sub-slider-radius);
        background: var(--sub-color-surface);
      }

      input[type='range']:disabled {
        cursor: not-allowed;
        opacity: 0.6;
      }

      @media (forced-colors: active) {
        input[type='range']::-webkit-slider-thumb {
          background: ButtonText;
        }
      }
    `,
  ]

  override connectedCallback(): void {
    super.connectedCallback()
    this.#default = this.value
  }

  protected nativeControl(): HTMLInputElement | null {
    return this.renderRoot.querySelector('input')
  }
  protected control(): HTMLElement | null {
    return this.nativeControl()
  }
  protected formValue(): FormValue {
    return this.value
  }
  protected resetValue(): void {
    this.value = this.#default
  }
  protected restoreValue(state: FormValue): void {
    this.value = typeof state === 'string' ? state : ''
  }

  get #shown(): string {
    return this.value === '' ? String((Number(this.min) + Number(this.max)) / 2) : this.value
  }

  get #pct(): number {
    const lo = Number(this.min)
    const hi = Number(this.max)
    return hi === lo ? 0 : ((Number(this.#shown) - lo) / (hi - lo)) * 100
  }

  #onInput = (event: Event): void => {
    this.value = (event.target as HTMLInputElement).value
  }

  #onChange = (): void => {
    this.dispatchEvent(new Event('change', { bubbles: true }))
  }

  protected override render() {
    return html`<div class="field">
      ${this.renderLabel()} ${this.renderHint()}
      <div class="row">
        <input
          id="control"
          type="range"
          part="input"
          style=${`--_pct:${this.#pct}%`}
          .value=${this.#shown}
          name=${this.name || nothing}
          min=${this.min}
          max=${this.max}
          step=${this.step}
          aria-valuetext=${this.valuetext || nothing}
          ?disabled=${this.isDisabled}
          aria-describedby=${ifDefined(this.describedBy())}
          @input=${this.#onInput}
          @change=${this.#onChange}
          @blur=${this.onControlBlur}
        />
        <output for="control">${this.#shown}${this.unit}</output>
      </div>
      ${this.renderError()}
    </div>`
  }
}

export function defineSlider(): void {
  define('sub-slider', SubSlider)
}

declare global {
  interface HTMLElementTagNameMap {
    'sub-slider': SubSlider
  }
}
