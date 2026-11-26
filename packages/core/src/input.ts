import { css, html, nothing, type PropertyValues } from 'lit'
import { ifDefined } from 'lit/directives/if-defined.js'
import { live } from 'lit/directives/live.js'
import { formControlStyles } from './shared/form-control'
import { icons } from './shared/icons'
import { messages, type MessageContext } from './shared/messages'
import { SubTextField } from './shared/text-field'
import { define, warn } from './shared/utils'

export type InputType = 'text' | 'email' | 'tel' | 'url' | 'password' | 'search' | 'number' | 'date' | 'time'

const EXAMPLES: Partial<Record<InputType, string>> = {
  email: 'name@example.com',
  url: 'https://example.com',
  tel: '+1 555 000 0000',
}

/**
 * Text field. Use the most specific `type` (email, tel, url, date, search, password); `number` only
 * for real quantities. For phone, card, postal code or OTP use `type="text"` + `inputmode`.
 * Always labelled; validates on blur; error = icon + text + border.
 */
export class SubInput extends SubTextField {
  static override properties = {
    type: { type: String, reflect: true },
    inputmode: { type: String },
    pattern: { type: String },
    min: { type: String },
    max: { type: String },
    step: { type: String },
    _reveal: { state: true },
  }

  declare type: InputType
  /** Virtual keyboard: `numeric`, `decimal`, `tel`, `email`, `url`, `search` */
  declare inputmode: string
  declare pattern: string
  declare min: string
  declare max: string
  declare step: string
  declare _reveal: boolean

  constructor() {
    super()
    this.type = 'text'
    this.inputmode = ''
    this.pattern = ''
    this.min = ''
    this.max = ''
    this.step = ''
    this._reveal = false
  }

  static override styles = [
    ...formControlStyles,
    css`
      .wrap {
        position: relative;
        display: flex;
      }

      :host([type='password']) .control {
        padding-inline-end: calc(var(--sub-field-min-size) + var(--sub-space-1));
      }

      .toggle {
        position: absolute;
        inset-block: 0;
        inset-inline-end: 0;
        display: grid;
        place-items: center;
        inline-size: var(--sub-field-min-size);
        padding: 0;
        border: 0;
        border-radius: var(--sub-field-radius);
        background: transparent;
        color: var(--sub-color-text);
        cursor: pointer;
      }

      .toggle[aria-pressed='true'] {
        color: var(--sub-color-on-accent-subtle);
        background: var(--sub-color-accent-subtle);
      }

      .counter {
        justify-self: end;
        font-size: var(--sub-text-sm);
        color: var(--sub-color-muted);
        font-variant-numeric: tabular-nums;
      }
    `,
  ]

  protected field(): HTMLInputElement | null {
    return this.renderRoot.querySelector('input')
  }

  protected override messageContext(): MessageContext {
    return {
      ...super.messageContext(),
      example: this.example || EXAMPLES[this.type],
      min: this.min,
      max: this.max,
    }
  }

  protected override firstUpdated(changed: PropertyValues): void {
    super.firstUpdated(changed)
    if (this.type === 'number' && /^(tel|cc-|postal)/.test(this.autocomplete)) {
      warn(`<sub-input type="number" autocomplete="${this.autocomplete}">: use type="text" + inputmode="numeric" for codes and phone numbers.`)
    }
  }

  protected override render() {
    const isPassword = this.type === 'password'
    return html`<div class="field">
      ${this.renderLabel()} ${this.renderHint()}
      <div class="wrap">
        <input
          id="control"
          class="control"
          part="input"
          type=${isPassword && this._reveal ? 'text' : this.type}
          .value=${live(this.value)}
          name=${this.name || nothing}
          placeholder=${this.placeholder || nothing}
          autocomplete=${this.autocomplete || nothing}
          inputmode=${this.inputmode || nothing}
          pattern=${this.pattern || nothing}
          min=${this.min || nothing}
          max=${this.max || nothing}
          step=${this.step || nothing}
          minlength=${ifDefined(this.minlength)}
          maxlength=${ifDefined(this.maxlength)}
          ?required=${this.required}
          ?readonly=${this.readonly}
          ?disabled=${this.isDisabled}
          aria-invalid=${this.displayedError ? 'true' : nothing}
          aria-describedby=${ifDefined(this.describedBy())}
          @input=${this.onInput}
          @change=${this.onChange}
          @blur=${this.onControlBlur}
        />
        ${isPassword
          ? html`<button
              class="toggle"
              type="button"
              aria-pressed=${String(this._reveal)}
              ?disabled=${this.isDisabled}
              @click=${() => (this._reveal = !this._reveal)}
            >
              ${this._reveal ? icons.eyeOff() : icons.eye()}<span class="sr-only">${messages.showPassword}</span>
            </button>`
          : nothing}
      </div>
      ${this.renderCounter()} ${this.renderError()}
    </div>`
  }
}

export function defineInput(): void {
  define('sub-input', SubInput)
}

declare global {
  interface HTMLElementTagNameMap {
    'sub-input': SubInput
  }
}
