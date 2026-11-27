import { LitElement, css, html, nothing, type PropertyValues } from 'lit'
import { ifDefined } from 'lit/directives/if-defined.js'
import { SubFormControl, formControlStyles, type FormValue } from './shared/form-control'
import { config } from './shared/config'
import type { MessageContext } from './shared/messages'
import { baseStyles, focusStyles } from './shared/styles'
import { define, emit } from './shared/utils'

/**
 * Checkbox: non-exclusive choice (none, one or many). The visible label sits to the right and the
 * whole row is the click target (>= 44px). Use `indeterminate` for a parent of partly-checked children.
 * Submits `value` (default "on") under `name` only while checked.
 * @fires {Event} change - The value changed (native event: works with any framework and form library)
 */
export class SubCheckbox extends SubFormControl {
  static override properties = {
    checked: { type: Boolean, reflect: true },
    indeterminate: { type: Boolean, reflect: true },
    value: { type: String },
  }

  declare checked: boolean
  declare indeterminate: boolean
  declare value: string

  #default = false

  constructor() {
    super()
    this.checked = false
    this.indeterminate = false
    this.value = 'on'
  }

  static override styles = [
    ...formControlStyles,
    css`
      .row {
        display: flex;
        gap: var(--sub-checkbox-gap);
        align-items: flex-start;
        min-block-size: var(--sub-checkbox-min-size);
        padding-block: var(--sub-space-2);
        cursor: pointer;
        touch-action: manipulation;
      }

      :host([disabled]) .row {
        cursor: not-allowed;
        color: var(--sub-color-on-disabled);
      }

      input {
        flex: none;
        inline-size: var(--sub-checkbox-size);
        block-size: var(--sub-checkbox-size);
        margin: 0.125rem 0 0;
        accent-color: var(--sub-color-accent);
        cursor: inherit;
      }

      .text {
        font-size: var(--sub-checkbox-label-size);
        font-weight: var(--sub-weight-regular);
        line-height: var(--sub-leading-normal);
      }

      .hint,
      .error {
        margin-inline-start: calc(var(--sub-checkbox-size) + var(--sub-checkbox-gap));
      }
    `,
  ]

  override connectedCallback(): void {
    super.connectedCallback()
    this.#default = this.checked
  }

  protected nativeControl(): HTMLInputElement | null {
    return this.renderRoot.querySelector('input')
  }
  protected control(): HTMLElement | null {
    return this.nativeControl()
  }
  protected formValue(): FormValue {
    return this.checked ? this.value : null
  }
  protected resetValue(): void {
    this.checked = this.#default
    this.indeterminate = false
  }
  protected restoreValue(state: FormValue): void {
    this.checked = state !== null
  }
  protected override messageContext(): MessageContext {
    return { label: this.label, kind: 'check' }
  }

  /** "(optional)" on a lone checkbox is noise: only the required mark applies here */
  protected override labelContent() {
    const mark =
      this.required && config.requiredIndicator !== 'optional' ? html` <span class="req" aria-hidden="true">*</span>` : nothing
    return html`${this.label}${mark}`
  }

  /** Enter toggles like Space (and does not submit the surrounding form) */
  #onKey = (event: KeyboardEvent): void => {
    if (event.key === 'Enter' && !event.isComposing && !this.isDisabled) {
      event.preventDefault()
      ;(event.target as HTMLInputElement).click()
    }
  }

  #onChange = (event: Event): void => {
    const input = event.target as HTMLInputElement
    this.checked = input.checked
    this.indeterminate = false
    this.dispatchEvent(new Event('change', { bubbles: true }))
  }

  protected override updated(changed: PropertyValues): void {
    const input = this.nativeControl()
    if (input) input.indeterminate = this.indeterminate
    super.updated(changed)
  }

  protected override render() {
    return html`<div class="field">
      <label class="row">
        <input
          id="control"
          type="checkbox"
          name=${this.name || nothing}
          .checked=${this.checked}
          ?required=${this.required}
          ?disabled=${this.isDisabled}
          aria-invalid=${this.displayedError ? 'true' : nothing}
          aria-describedby=${ifDefined(this.describedBy())}
          @change=${this.#onChange}
          @keydown=${this.#onKey}
          @blur=${this.onControlBlur}
        />
        <span class="text">${this.labelContent()}</span>
      </label>
      ${this.renderHint()} ${this.renderError()}
    </div>`
  }
}

/**
 * Group of related checkboxes: `fieldset` + `legend` (the group's accessible name).
 * `select-all` adds a parent checkbox with that label that reflects (indeterminate) and drives the children.
 * @fires {Event} change - The value changed (native event: works with any framework and form library)
 */
export class SubCheckboxGroup extends LitElement {
  static override properties = {
    label: { type: String },
    hint: { type: String },
    error: { type: String },
    selectAll: { type: String, attribute: 'select-all' },
    _checked: { state: true },
    _total: { state: true },
  }

  declare label: string
  declare hint: string
  declare error: string
  /** Label of the optional parent checkbox, e.g. "Select all" (recommended from 5 options) */
  declare selectAll: string
  declare _checked: number
  declare _total: number

  constructor() {
    super()
    this.label = ''
    this.hint = ''
    this.error = ''
    this.selectAll = ''
    this._checked = 0
    this._total = 0
  }

  static override styles = [
    baseStyles,
    focusStyles,
    css`
      :host {
        display: block;
        font-family: var(--sub-font-sans);
        color: var(--sub-color-text);
      }

      fieldset {
        display: grid;
        gap: var(--sub-space-1);
        margin: 0;
        padding: 0;
        border: 0;
        min-inline-size: 0;
      }

      legend {
        padding: 0;
        margin-block-end: var(--sub-label-gap);
        font-weight: var(--sub-weight-medium);
      }

      .hint {
        margin-block-end: var(--sub-space-1);
        font-size: var(--sub-text-sm);
        color: var(--sub-color-muted);
      }

      .error {
        font-size: var(--sub-text-sm);
        font-weight: var(--sub-weight-medium);
        color: var(--sub-color-danger);
      }

      .all {
        padding-block-end: var(--sub-space-2);
        border-block-end: var(--sub-border-width-thin) solid var(--sub-color-border-subtle);
      }
    `,
  ]

  override connectedCallback(): void {
    super.connectedCallback()
    defineCheckbox()
    this.addEventListener('change', this.#recount)
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback()
    this.removeEventListener('change', this.#recount)
  }

  get #boxes(): SubCheckbox[] {
    return [...this.querySelectorAll<SubCheckbox>(':scope > sub-checkbox')]
  }

  #recount = (): void => {
    const boxes = this.#boxes.filter((b) => !b.disabled)
    this._total = boxes.length
    this._checked = boxes.filter((b) => b.checked).length
  }

  #toggleAll = (event: Event): void => {
    event.stopPropagation() // the parent box is not one of the group's values
    const on = (event.target as SubCheckbox).checked
    for (const box of this.#boxes) if (!box.disabled) box.checked = on
    this.#recount()
    emit(this, 'change', undefined, { bubbles: false })
  }

  protected override firstUpdated(): void {
    this.#recount()
  }

  protected override render() {
    return html`<fieldset aria-describedby=${ifDefined(this.hint || this.error ? 'hint error' : undefined)}>
      <legend>${this.label}</legend>
      ${this.hint ? html`<div id="hint" class="hint">${this.hint}</div>` : nothing}
      ${this.selectAll
        ? html`<sub-checkbox
            class="all"
            label=${this.selectAll}
            .checked=${this._total > 0 && this._checked === this._total}
            .indeterminate=${this._checked > 0 && this._checked < this._total}
            @change=${this.#toggleAll}
          ></sub-checkbox>`
        : nothing}
      <slot @slotchange=${this.#recount}></slot>
      <div id="error" class="error" aria-live="polite">${this.error}</div>
    </fieldset>`
  }
}

export function defineCheckbox(): void {
  define('sub-checkbox', SubCheckbox)
}

export function defineCheckboxGroup(): void {
  defineCheckbox()
  define('sub-checkbox-group', SubCheckboxGroup)
}

declare global {
  interface HTMLElementTagNameMap {
    'sub-checkbox': SubCheckbox
    'sub-checkbox-group': SubCheckboxGroup
  }
}
