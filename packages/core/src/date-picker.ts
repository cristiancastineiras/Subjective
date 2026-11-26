import { css, html, nothing } from 'lit'
import { ifDefined } from 'lit/directives/if-defined.js'
import { live } from 'lit/directives/live.js'
import { defineCalendar, parseIso, toIso, type SubCalendar } from './calendar'
import { SubFormControl, formControlStyles, type FormValue } from './shared/form-control'
import { icons } from './shared/icons'
import { messages, type MessageContext } from './shared/messages'
import { placeNear } from './shared/position'
import { define } from './shared/utils'

const supportsPopover = typeof HTMLElement !== 'undefined' && typeof HTMLElement.prototype.showPopover === 'function'

/**
 * Date field: a typeable text field (`yyyy-mm-dd`, so keyboard users never need the picker) plus a
 * button that opens a calendar. The calendar is a non-modal popover: Esc closes it and returns focus to
 * the field. `min` / `max` are ISO dates. The value submitted is always ISO.
 */
export class SubDatePicker extends SubFormControl {
  static override properties = {
    value: { type: String },
    min: { type: String },
    max: { type: String },
    locale: { type: String },
    _open: { state: true },
  }

  declare value: string
  declare min: string
  declare max: string
  declare locale: string
  declare _open: boolean

  #default = ''

  constructor() {
    super()
    this.value = ''
    this.min = ''
    this.max = ''
    this.locale = navigator.language
    this._open = false
  }

  static override styles = [
    ...formControlStyles,
    css`
      .wrap {
        display: flex;
      }

      .control {
        flex: 1;
        min-inline-size: 0;
        border-inline-end: 0;
        border-start-end-radius: 0;
        border-end-end-radius: 0;
        font-variant-numeric: tabular-nums;
      }

      .open {
        flex: none;
        display: grid;
        place-items: center;
        inline-size: var(--sub-field-min-size);
        min-block-size: var(--sub-field-min-size);
        padding: 0;
        border: var(--sub-field-border-width) solid var(--sub-color-border);
        border-start-end-radius: var(--sub-field-radius);
        border-end-end-radius: var(--sub-field-radius);
        background: var(--sub-color-surface-hover);
        color: var(--sub-color-text);
        cursor: pointer;
      }

      .open:disabled {
        background: var(--sub-color-disabled);
        color: var(--sub-color-on-disabled);
        cursor: not-allowed;
      }

      .pop {
        position: fixed;
        inset: auto;
        margin: 0;
        padding: 0;
        border: 0;
        background: transparent;
        overflow: visible;
        z-index: var(--sub-z-dropdown);
      }

      .pop:not([popover]):not([data-open]) {
        display: none;
      }
    `,
  ]

  override connectedCallback(): void {
    super.connectedCallback()
    defineCalendar()
    this.#default = this.value
    document.addEventListener('pointerdown', this.#onOutside)
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback()
    document.removeEventListener('pointerdown', this.#onOutside)
  }

  protected control(): HTMLElement | null {
    return this.renderRoot.querySelector('input')
  }
  protected formValue(): FormValue {
    return parseIso(this.value) ? this.value : null
  }
  protected resetValue(): void {
    this.value = this.#default
  }
  protected restoreValue(state: FormValue): void {
    this.value = typeof state === 'string' ? state : ''
  }
  protected override customFlags(): ValidityStateFlags {
    if (!this.value) return this.required ? { valueMissing: true } : {}
    const d = parseIso(this.value)
    if (!d) return { patternMismatch: true }
    const iso = toIso(d)
    return { rangeUnderflow: Boolean(this.min && iso < this.min), rangeOverflow: Boolean(this.max && iso > this.max) }
  }
  protected override messageContext(): MessageContext {
    return { label: this.label, kind: 'text', example: toIso(new Date()), min: this.min, max: this.max }
  }

  get #pop(): HTMLElement | null {
    return this.renderRoot.querySelector('.pop')
  }

  #show(): void {
    const pop = this.#pop
    const anchor = this.renderRoot.querySelector('.wrap')
    if (!pop || !anchor || this._open) return
    this._open = true
    if (supportsPopover) pop.showPopover()
    else pop.setAttribute('data-open', '')
    placeNear(anchor, pop, 'bottom', 'start', 4)
    const cal = this.renderRoot.querySelector<SubCalendar>('sub-calendar')
    cal?.focusDay()
  }

  #hide(focusInput = true): void {
    const pop = this.#pop
    if (!this._open || !pop) return
    this._open = false
    if (supportsPopover && pop.matches(':popover-open')) pop.hidePopover()
    pop.removeAttribute('data-open')
    if (focusInput) this.control()?.focus()
  }

  #onOutside = (e: Event): void => {
    if (this._open && !e.composedPath().includes(this)) this.#hide(false)
  }

  #onInput = (e: Event): void => {
    this.value = (e.target as HTMLInputElement).value
  }

  protected override render() {
    return html`<div class="field">
      ${this.renderLabel()} ${this.renderHint()}
      <div class="wrap">
        <input
          id="control"
          class="control"
          type="text"
          inputmode="numeric"
          autocomplete="off"
          placeholder=${messages.dateFormat}
          pattern="\\d{4}-\\d{2}-\\d{2}"
          .value=${live(this.value)}
          name=${this.name || nothing}
          ?required=${this.required}
          ?disabled=${this.isDisabled}
          aria-invalid=${this.displayedError ? 'true' : nothing}
          aria-describedby=${ifDefined(this.describedBy())}
          @input=${this.#onInput}
          @keydown=${(e: KeyboardEvent) => e.altKey && e.key === 'ArrowDown' && (e.preventDefault(), this.#show())}
          @blur=${this.onControlBlur}
        />
        <button class="open" type="button" aria-label=${messages.chooseDate} aria-expanded=${this._open ? 'true' : 'false'} ?disabled=${this.isDisabled} @click=${() => (this._open ? this.#hide() : this.#show())}>
          ${icons.calendar_month()}
        </button>
        <div
          class="pop"
          popover=${supportsPopover ? 'manual' : nothing}
          role="dialog"
          aria-label=${messages.chooseDate}
          @keydown=${(e: KeyboardEvent) => e.key === 'Escape' && (e.stopPropagation(), this.#hide())}
        >
          <sub-calendar
            value=${this.value}
            min=${this.min}
            max=${this.max}
            locale=${this.locale}
            @sub-select=${(e: CustomEvent<{ value: string }>) => {
              this.value = e.detail.value
              this.dispatchEvent(new Event('change', { bubbles: true }))
              this.#hide()
            }}
          ></sub-calendar>
        </div>
      </div>
      ${this.renderError()}
    </div>`
  }
}

export function defineDatePicker(): void {
  defineCalendar()
  define('sub-date-picker', SubDatePicker)
}

declare global {
  interface HTMLElementTagNameMap {
    'sub-date-picker': SubDatePicker
  }
}
