import { css, html, nothing } from 'lit'
import { ifDefined } from 'lit/directives/if-defined.js'
import { SubFormControl, formControlStyles, type FormValue } from './shared/form-control'
import { messages } from './shared/messages'
import { define } from './shared/utils'
import { iconStar, iconStarFill } from './shared/material-icons'

/**
 * Rating. Interactive: a radio group of stars (arrows move, each star says "3 of 5 stars"), `allow-clear`
 * lets the user unset it. `readonly`: one `role="img"` that says "4 of 5 stars". Filled star + outline
 * star differ by shape (not colour alone).
 * @fires {Event} change - The value changed (native event: works with any framework and form library)
 */
export class SubRate extends SubFormControl {
  static override properties = {
    value: { type: Number },
    count: { type: Number },
    readonly: { type: Boolean, reflect: true },
    allowClear: { type: Boolean, attribute: 'allow-clear' },
  }

  declare value: number
  declare count: number
  declare readonly: boolean
  declare allowClear: boolean

  #default = 0

  constructor() {
    super()
    this.value = 0
    this.count = 5
    this.readonly = false
    this.allowClear = false
  }

  static override styles = [
    ...formControlStyles,
    css`
      .stars {
        display: flex;
        gap: var(--sub-rate-gap);
        color: var(--sub-color-warning);
      }

      .star {
        position: relative;
        display: grid;
        place-items: center;
        inline-size: var(--sub-rate-min-size);
        block-size: var(--sub-rate-min-size);
        cursor: pointer;
      }

      .star input {
        position: absolute;
        inset: 0;
        inline-size: 100%;
        block-size: 100%;
        margin: 0;
        opacity: 0;
        cursor: inherit;
      }

      .star .icon {
        inline-size: var(--sub-rate-star-size);
        block-size: var(--sub-rate-star-size);
        pointer-events: none;
      }

      .star:has(input:focus-visible) {
        outline: var(--sub-focus-width) solid var(--sub-color-focus);
        outline-offset: var(--sub-focus-inner-width);
        box-shadow: 0 0 0 var(--sub-focus-inner-width) var(--sub-color-focus-inner);
      }

      :host([readonly]) .star {
        cursor: default;
      }

      .clear {
        justify-self: start;
        min-block-size: var(--sub-target-size);
        padding: 0 var(--sub-space-2);
        border: 0;
        background: transparent;
        color: var(--sub-color-link);
        font: var(--sub-weight-semibold) var(--sub-text-md) / 1 var(--sub-font-sans);
        text-decoration: underline;
        cursor: pointer;
      }
    `,
  ]

  override connectedCallback(): void {
    super.connectedCallback()
    this.#default = this.value
  }

  protected nativeControl(): HTMLInputElement | null {
    return this.renderRoot.querySelector('input[type=radio]')
  }
  protected control(): HTMLElement | null {
    return this.renderRoot.querySelector('input:checked') ?? this.nativeControl()
  }
  protected formValue(): FormValue {
    return this.value ? String(this.value) : null
  }
  protected resetValue(): void {
    this.value = this.#default
  }
  protected restoreValue(state: FormValue): void {
    this.value = typeof state === 'string' ? Number(state) || 0 : 0
  }

  #set(n: number): void {
    this.value = this.allowClear && n === this.value ? 0 : n
    this.dispatchEvent(new Event('change', { bubbles: true }))
  }

  protected override render() {
    const stars = Array.from({ length: this.count }, (_, i) => i + 1)
    if (this.readonly) {
      return html`<div class="field">
        <div id="label">${this.labelContent()}</div>
        <div class="stars" role="img" aria-labelledby="label" aria-describedby="summary">
          ${stars.map((n) => (n <= this.value ? iconStarFill() : iconStar()))}
        </div>
        <div id="summary" class="hint">${messages.starsOf(this.value, this.count)}</div>
      </div>`
    }
    return html`<fieldset class="field" aria-describedby=${ifDefined(this.describedBy())} ?disabled=${this.isDisabled}>
      <legend id="label">${this.labelContent()}</legend>
      ${this.renderHint()}
      <div class="stars">
        ${stars.map(
          (n) => html`<label class="star">
            <input
              type="radio"
              name="rate"
              value=${n}
              aria-label=${messages.starsOf(n, this.count)}
              .checked=${this.value === n}
              ?required=${this.required}
              @click=${() => this.allowClear && this.value === n && this.#set(n)}
              @change=${() => this.#set(n)}
              @blur=${this.onControlBlur}
            />
            ${n <= this.value ? iconStarFill() : iconStar()}
          </label>`,
        )}
      </div>
      ${this.allowClear && this.value
        ? html`<button class="clear" type="button" @click=${() => this.#set(this.value)}>${messages.clearRating}</button>`
        : nothing}
      ${this.renderError()}
    </fieldset>`
  }
}

export function defineRate(): void {
  define('sub-rate', SubRate)
}

declare global {
  interface HTMLElementTagNameMap {
    'sub-rate': SubRate
  }
}
