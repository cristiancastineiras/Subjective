import { css, html, nothing } from 'lit'
import { ifDefined } from 'lit/directives/if-defined.js'
import { live } from 'lit/directives/live.js'
import { formControlStyles } from './shared/form-control'
import { messages, type MessageContext } from './shared/messages'
import { SubTextField } from './shared/text-field'
import { define } from './shared/utils'
import { iconAdd, iconRemove } from './shared/material-icons'

/**
 * Numeric input for real quantities (spinbutton): native `type="number"` (Up/Down change the value,
 * min/max/step validate) plus labelled +/- buttons that are also reachable by keyboard.
 * For codes, phone numbers or card numbers use <sub-input inputmode="numeric"> instead.
 */
export class SubInputNumber extends SubTextField {
  static override properties = {
    min: { type: String },
    max: { type: String },
    step: { type: String },
    controls: { type: Boolean },
  }

  declare min: string
  declare max: string
  declare step: string
  /** Show the +/- buttons (default true) */
  declare controls: boolean

  constructor() {
    super()
    this.min = ''
    this.max = ''
    this.step = ''
    this.controls = true
  }

  static override styles = [
    ...formControlStyles,
    css`
      .wrap {
        display: flex;
        align-items: stretch;
      }

      .control {
        flex: 1;
        min-inline-size: 0;
        text-align: center;
        font-variant-numeric: tabular-nums;
        appearance: textfield;
        -moz-appearance: textfield;
      }

      .control::-webkit-inner-spin-button,
      .control::-webkit-outer-spin-button {
        appearance: none;
        margin: 0;
      }

      button {
        flex: none;
        display: grid;
        place-items: center;
        inline-size: var(--sub-input-number-button-width);
        min-block-size: var(--sub-field-min-size);
        padding: 0;
        border: var(--sub-field-border-width) solid var(--sub-color-border);
        background: var(--sub-color-surface-hover);
        color: var(--sub-color-text);
        cursor: pointer;
        touch-action: manipulation;
      }

      .dec {
        border-radius: var(--sub-field-radius) 0 0 var(--sub-field-radius);
        border-inline-end: 0;
      }

      .inc {
        border-radius: 0 var(--sub-field-radius) var(--sub-field-radius) 0;
        border-inline-start: 0;
      }

      .control {
        border-radius: 0;
      }

      button:disabled {
        background: var(--sub-color-disabled);
        color: var(--sub-color-on-disabled);
        cursor: not-allowed;
      }

      @media (hover: hover) {
        button:enabled:hover {
          background: var(--sub-color-accent-subtle);
        }
      }
    `,
  ]

  protected field(): HTMLInputElement | null {
    return this.renderRoot.querySelector('input')
  }

  protected override messageContext(): MessageContext {
    return { ...super.messageContext(), min: this.min, max: this.max }
  }

  #step(direction: 1 | -1): void {
    const el = this.field()
    if (!el) return
    if (direction > 0) el.stepUp()
    else el.stepDown()
    this.value = el.value
    el.dispatchEvent(new Event('input', { bubbles: true, composed: true }))
    this.dispatchEvent(new Event('change', { bubbles: true }))
  }

  get #n(): number | undefined {
    const n = Number(this.value)
    return this.value.trim() === '' || Number.isNaN(n) ? undefined : n
  }

  protected override render() {
    const n = this.#n
    const atMin = n !== undefined && this.min !== '' && n <= Number(this.min)
    const atMax = n !== undefined && this.max !== '' && n >= Number(this.max)
    return html`<div class="field">
      ${this.renderLabel()} ${this.renderHint()}
      <div class="wrap">
        ${this.controls
          ? html`<button class="dec" type="button" aria-label=${messages.decrease(this.label)} ?disabled=${this.isDisabled || this.readonly || atMin} @click=${() => this.#step(-1)}>
              ${iconRemove()}
            </button>`
          : nothing}
        <input
          id="control"
          class="control"
          part="input"
          type="number"
          inputmode="decimal"
          .value=${live(this.value)}
          name=${this.name || nothing}
          min=${this.min || nothing}
          max=${this.max || nothing}
          step=${this.step || nothing}
          placeholder=${this.placeholder || nothing}
          ?required=${this.required}
          ?readonly=${this.readonly}
          ?disabled=${this.isDisabled}
          aria-invalid=${this.displayedError ? 'true' : nothing}
          aria-describedby=${ifDefined(this.describedBy())}
          @input=${this.onInput}
          @change=${this.onChange}
          @blur=${this.onControlBlur}
        />
        ${this.controls
          ? html`<button class="inc" type="button" aria-label=${messages.increase(this.label)} ?disabled=${this.isDisabled || this.readonly || atMax} @click=${() => this.#step(1)}>
              ${iconAdd()}
            </button>`
          : nothing}
      </div>
      ${this.renderError()}
    </div>`
  }
}

export function defineInputNumber(): void {
  define('sub-input-number', SubInputNumber)
}

declare global {
  interface HTMLElementTagNameMap {
    'sub-input-number': SubInputNumber
  }
}
