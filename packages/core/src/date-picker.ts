import { css, html, nothing } from 'lit'
import { ifDefined } from 'lit/directives/if-defined.js'
import { live } from 'lit/directives/live.js'
import { defineCalendar, parseIso, toIso, type SubCalendar } from './calendar'
import { SubFormControl, formControlStyles, type FormValue } from './shared/form-control'
import { messages, type MessageContext } from './shared/messages'
import { autoUpdate, placeNear, type Placement } from './shared/position'
import { bottomSheet, isSheet, sheetHeadStyles, sheetHeader } from './shared/sheet'
import { define } from './shared/utils'
import { iconCalendarMonth } from './shared/material-icons'

/** `20261126`, `2026/11/26`, `2026.11.26` -> `2026-11-26` (phone number pads have no "-"); anything else is kept */
const normalizeDate = (raw: string): string => {
  const parts = raw.trim().match(/^(\d{4})[-/. ]?(\d{2})[-/. ]?(\d{2})$/)
  return parts ? `${parts[1]}-${parts[2]}-${parts[3]}` : raw
}

const supportsPopover = typeof HTMLElement !== 'undefined' && typeof HTMLElement.prototype.showPopover === 'function'

/**
 * Date field: a typeable text field (`yyyy-mm-dd`, so keyboard users never need the picker) plus a
 * button that opens a calendar. The calendar is a non-modal popover: Esc closes it and returns focus to
 * where it was opened from (the field after Alt+Down, the button after a click or tap). `min` / `max` are
 * ISO dates. The value submitted is always ISO; digits alone (`20261126`) are accepted and formatted.
 * On small screens the calendar is a bottom sheet with the field's name and a Done button.
 * @fires {Event} change - The value changed (native event: works with any framework and form library)
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
        /* a short window (landscape phone, zoom): the calendar scrolls inside instead of leaving the screen */
        max-block-size: calc(100dvh - 1rem);
        overflow: auto;
        z-index: var(--sub-z-dropdown);
      }

      .pop:not([popover]):not([data-open]) {
        display: none;
      }
    `,
    sheetHeadStyles,
    bottomSheet('.pop', '.sheet'),
    css`
      @media (max-width: 40rem) {
        /* the calendar spans the sheet: full-size days within thumb reach */
        .sheet sub-calendar {
          display: flex;
          justify-content: center;
          padding: var(--sub-space-2) 0 var(--sub-space-3);
          --sub-calendar-border-width: 0px;
        }
      }
    `,
  ]

  /** Where focus goes back when the calendar closes */
  #opener: 'input' | 'button' = 'button'

  override connectedCallback(): void {
    super.connectedCallback()
    defineCalendar()
    this.#default = this.value
    document.addEventListener('pointerdown', this.#onOutside)
  }

  #stopFollowing: (() => void) | undefined
  #placement: Placement | undefined

  #unfollow(): void {
    this.#stopFollowing?.()
    this.#stopFollowing = undefined
    this.#placement = undefined
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback()
    this.#unfollow()
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

  #show(opener: 'input' | 'button'): void {
    const pop = this.#pop
    const anchor = this.renderRoot.querySelector('.wrap')
    if (!pop || !anchor || this._open) return
    this._open = true
    this.#opener = opener
    if (supportsPopover) pop.showPopover()
    else pop.setAttribute('data-open', '')
    // attached to the field while open (a bottom sheet on small screens: no placement)
    this.#stopFollowing = autoUpdate(() => {
      if (isSheet()) pop.style.top = pop.style.left = pop.style.maxBlockSize = ''
      else this.#placement = placeNear(anchor, pop, 'bottom', 'start', 4, 8, { current: this.#placement, fitHeight: true, minHeight: 160 })
    }, [anchor, pop])
    const cal = this.renderRoot.querySelector<SubCalendar>('sub-calendar')
    cal?.focusDay()
  }

  #hide(returnFocus = true): void {
    const pop = this.#pop
    if (!this._open || !pop) return
    this._open = false
    this.#unfollow()
    if (supportsPopover && pop.matches(':popover-open')) pop.hidePopover()
    pop.removeAttribute('data-open')
    // back to the opener: the button after a tap does not pop up the phone keyboard
    if (returnFocus) (this.#opener === 'input' ? this.control() : this.renderRoot.querySelector<HTMLElement>('.open'))?.focus()
  }

  #onBlur = (): void => {
    const formatted = normalizeDate(this.value)
    if (formatted !== this.value) {
      this.value = formatted
      this.dispatchEvent(new Event('change', { bubbles: true }))
    }
    this.onControlBlur()
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
          @keydown=${(e: KeyboardEvent) => e.altKey && e.key === 'ArrowDown' && (e.preventDefault(), this.#show('input'))}
          @blur=${this.#onBlur}
        />
        <button class="open" type="button" aria-label=${messages.chooseDate} aria-expanded=${this._open ? 'true' : 'false'} ?disabled=${this.isDisabled} @click=${() => (this._open ? this.#hide() : this.#show('button'))}>
          ${iconCalendarMonth()}
        </button>
        <div
          class="pop"
          popover=${supportsPopover ? 'manual' : nothing}
          role="dialog"
          aria-label=${this.label ? `${messages.chooseDate}: ${this.label}` : messages.chooseDate}
          @keydown=${(e: KeyboardEvent) => e.key === 'Escape' && (e.stopPropagation(), this.#hide())}
        >
          <div class="scrim" aria-hidden="true" @click=${() => this.#hide()}></div>
          <div class="sheet">
            ${sheetHeader(this.label || messages.chooseDate, messages.done, () => this.#hide())}
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
