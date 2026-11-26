import { css, html, nothing } from 'lit'
import { ifDefined } from 'lit/directives/if-defined.js'
import { SubFormControl, formControlStyles, type FormValue } from './shared/form-control'
import { messages, type MessageContext } from './shared/messages'
import { define } from './shared/utils'

const HEX = /^#[0-9a-fA-F]{6}$/

/**
 * Colour field: the browser's own colour picker (native `<input type="color">`) plus an editable hex
 * value and optional named `presets`. The hex text makes the colour readable and typable by everyone;
 * presets are buttons with names and `aria-pressed` (never just a coloured square).
 *
 *   <sub-color-picker label="Brand colour" value="#1d70b8" presets="#1d70b8:Blue,#00703c:Green"></sub-color-picker>
 */
export class SubColorPicker extends SubFormControl {
  static override properties = {
    value: { type: String },
    presets: { type: String },
  }

  declare value: string
  /** `#hex:Name` pairs separated by commas */
  declare presets: string

  #default = ''

  constructor() {
    super()
    this.value = '#000000'
    this.presets = ''
  }

  static override styles = [
    ...formControlStyles,
    css`
      .row {
        display: flex;
        flex-wrap: wrap;
        gap: var(--sub-color-picker-gap);
        align-items: center;
      }

      input[type='color'] {
        inline-size: var(--sub-color-picker-swatch-size);
        block-size: var(--sub-color-picker-swatch-size);
        padding: 2px;
        border: var(--sub-color-picker-border-width) solid var(--sub-color-border);
        border-radius: var(--sub-color-picker-radius);
        background: var(--sub-color-surface);
        cursor: pointer;
      }

      .hex {
        inline-size: 9ch;
        text-transform: lowercase;
        font-family: var(--sub-font-mono);
      }

      .presets {
        display: flex;
        flex-wrap: wrap;
        gap: var(--sub-target-gap);
        margin: 0;
        padding: 0;
        list-style: none;
      }

      .preset {
        inline-size: var(--sub-color-picker-preset-size);
        block-size: var(--sub-color-picker-preset-size);
        padding: 0;
        border: var(--sub-color-picker-border-width) solid var(--sub-color-border);
        border-radius: var(--sub-color-picker-radius);
        background: var(--_c);
        cursor: pointer;
      }

      .preset[aria-pressed='true'] {
        box-shadow: inset 0 0 0 3px var(--sub-color-surface), inset 0 0 0 5px var(--sub-color-text);
      }
    `,
  ]

  override connectedCallback(): void {
    super.connectedCallback()
    this.#default = this.value
  }

  protected nativeControl(): HTMLInputElement | null {
    return this.renderRoot.querySelector('input.hex')
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
    this.value = typeof state === 'string' ? state : this.#default
  }
  protected override messageContext(): MessageContext {
    return { label: this.label, kind: 'text', example: '#1d70b8' }
  }

  #set(value: string): void {
    this.value = value.toLowerCase()
    this.dispatchEvent(new Event('input', { bubbles: true, composed: true }))
    if (HEX.test(this.value)) this.dispatchEvent(new Event('change', { bubbles: true }))
  }

  get #presets(): Array<{ value: string; name: string }> {
    return this.presets
      .split(',')
      .map((p) => p.trim())
      .filter(Boolean)
      .map((p) => {
        const [value = '', name] = p.split(':')
        return { value: value.trim().toLowerCase(), name: (name ?? value).trim() }
      })
  }

  protected override render() {
    const valid = HEX.test(this.value)
    return html`<div class="field">
      ${this.renderLabel('swatch')} ${this.renderHint()}
      <div class="row">
        <input
          id="swatch"
          type="color"
          .value=${valid ? this.value : '#000000'}
          ?disabled=${this.isDisabled}
          aria-describedby=${ifDefined(this.hasHint ? 'hint' : undefined)}
          @input=${(e: Event) => this.#set((e.target as HTMLInputElement).value)}
        />
        <label class="sr-only" for="control">${messages.hexValue}</label>
        <input
          id="control"
          class="control hex"
          type="text"
          inputmode="text"
          maxlength="7"
          pattern="#[0-9a-fA-F]{6}"
          spellcheck="false"
          autocomplete="off"
          .value=${this.value}
          name=${this.name || nothing}
          ?required=${this.required}
          ?disabled=${this.isDisabled}
          aria-invalid=${this.displayedError ? 'true' : nothing}
          aria-describedby="error"
          @input=${(e: Event) => this.#set((e.target as HTMLInputElement).value)}
          @blur=${this.onControlBlur}
        />
      </div>
      ${this.#presets.length
        ? html`<ul class="presets" aria-label=${`${this.label} presets`}>
            ${this.#presets.map(
              (p) => html`<li>
                <button class="preset" type="button" style=${`--_c:${p.value}`} aria-label=${p.name} aria-pressed=${this.value === p.value ? 'true' : 'false'} ?disabled=${this.isDisabled} @click=${() => this.#set(p.value)}></button>
              </li>`,
            )}
          </ul>`
        : nothing}
      ${this.renderError()}
    </div>`
  }
}

export function defineColorPicker(): void {
  define('sub-color-picker', SubColorPicker)
}

declare global {
  interface HTMLElementTagNameMap {
    'sub-color-picker': SubColorPicker
  }
}
