import { LitElement, css, html, nothing, type PropertyDeclarations, type PropertyValues, type TemplateResult } from 'lit'
import { config } from './config'
import { icons } from './icons'
import { messages, type MessageContext } from './messages'
import { baseStyles, focusStyles, iconStyles, visuallyHidden } from './styles'
import { auditState, warn } from './utils'

export type FormValue = string | File | FormData | null

/** Layout + states shared by every labelled field (input, textarea, select, groups). */
export const fieldStyles = css`
  :host {
    display: block;
    font-family: var(--sub-font-sans);
    color: var(--sub-color-text);
  }

  .field {
    display: grid;
    gap: var(--sub-field-label-gap);
    min-inline-size: 0;
  }

  fieldset.field {
    margin: 0;
    padding: 0;
    border: 0;
  }

  /* Label type (SubUX): >= 1rem, weight 500, sentence case, never lighter than the input text */
  label,
  legend {
    padding: 0;
    font-size: var(--sub-field-label-size);
    font-weight: var(--sub-field-label-weight);
    line-height: var(--sub-leading-normal);
    color: var(--sub-color-text);
  }

  .opt {
    font-weight: var(--sub-weight-regular);
    color: var(--sub-color-muted);
  }

  .hint {
    font-size: var(--sub-field-hint-size);
    line-height: var(--sub-leading-normal);
    color: var(--sub-color-muted);
  }

  /* Error = icon + text + border, never colour alone. Always >= 14px. */
  .error {
    display: flex;
    gap: var(--sub-space-2);
    align-items: flex-start;
    font-size: var(--sub-field-hint-size);
    font-weight: var(--sub-weight-semibold);
    line-height: var(--sub-leading-normal);
    color: var(--sub-color-danger);
  }

  .error:empty {
    display: none;
  }

  .error .icon {
    margin-block-start: 0.125rem;
    inline-size: var(--sub-icon-sm);
    block-size: var(--sub-icon-sm);
  }

  .control {
    inline-size: 100%;
    min-block-size: var(--sub-field-min-size);
    padding: var(--sub-field-padding-block) var(--sub-field-padding-inline);
    border: var(--sub-field-border-width) solid var(--sub-color-border);
    border-radius: var(--sub-field-radius);
    background: var(--sub-color-surface);
    color: var(--sub-color-text);
    font: var(--sub-weight-regular) var(--sub-field-font-size) / var(--sub-leading-normal) var(--sub-font-sans);
  }

  .control::placeholder {
    color: var(--sub-color-muted);
    opacity: 1;
  }

  /* Invalid: danger border + inset ring without shifting layout, plus the error text and icon */
  .control[aria-invalid='true'] {
    border-color: var(--sub-color-danger);
    box-shadow: inset 0 0 0 var(--sub-field-invalid-ring-width) var(--sub-color-danger);
  }

  .control:disabled {
    border-color: transparent;
    background: var(--sub-color-disabled);
    color: var(--sub-color-on-disabled);
    cursor: not-allowed;
  }

  .control:read-only:not(:disabled) {
    background: var(--sub-color-surface-sunken);
  }

  @media (forced-colors: active) {
    .control:disabled {
      border-color: GrayText;
      color: GrayText;
    }
  }
`

export const formControlStyles = [baseStyles, focusStyles, visuallyHidden, iconStyles, fieldStyles]

const FLAGS = [
  'badInput',
  'customError',
  'patternMismatch',
  'rangeOverflow',
  'rangeUnderflow',
  'stepMismatch',
  'tooLong',
  'tooShort',
  'typeMismatch',
  'valueMissing',
] as const

const copyFlags = (v: ValidityState): ValidityStateFlags => Object.fromEntries(FLAGS.map((k) => [k, v[k]]))

const MESSAGE_ORDER = [
  'valueMissing',
  'typeMismatch',
  'patternMismatch',
  'tooShort',
  'tooLong',
  'rangeUnderflow',
  'rangeOverflow',
  'stepMismatch',
  'badInput',
] as const

type NativeControl = HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement

/**
 * Base for every form control. Gives subclasses, for free:
 *  - form participation (value in FormData, reset, restore, fieldset[disabled])
 *  - constraint validation with friendly messages (validated on blur, not per keystroke)
 *  - label with required/optional indicator, hint, error (icon + text) wiring
 *
 * Subclasses implement `formValue`, `control`, and either `nativeControl` or `customFlags`.
 */
export abstract class SubFormControl extends LitElement {
  static formAssociated = true

  static override shadowRootOptions: ShadowRootInit = { mode: 'open', delegatesFocus: true }

  static override properties: PropertyDeclarations = {
    name: { type: String, reflect: true },
    label: { type: String },
    hint: { type: String },
    error: { type: String },
    noIndicator: { type: Boolean, attribute: 'no-indicator' },
    required: { type: Boolean, reflect: true },
    disabled: { type: Boolean, reflect: true },
    _showError: { state: true },
    _formDisabled: { state: true },
  }

  declare name: string
  declare label: string
  /** Helper text shown under the label (formats, why we ask). Never put it in a tooltip. */
  declare hint: string
  /** External error (e.g. from the server). Takes precedence over built-in validation. */
  declare error: string
  declare required: boolean
  /** Hide the required/optional marker (for fields that sit inside a composite that already says it) */
  declare noIndicator: boolean
  declare disabled: boolean
  declare _showError: boolean
  declare _formDisabled: boolean

  protected readonly internals: ElementInternals
  #custom = ''
  #message = ''
  #shown = ''

  constructor() {
    super()
    this.internals = this.attachInternals()
    this.name = ''
    this.label = ''
    this.hint = ''
    this.error = ''
    this.required = false
    this.noIndicator = false
    this.disabled = false
    this._showError = false
    this._formDisabled = false
  }

  // ---- subclass contract -------------------------------------------------

  protected abstract formValue(): FormValue
  /** Element that receives focus when invalid (validity anchor) */
  protected abstract control(): HTMLElement | null
  protected abstract resetValue(): void
  protected abstract restoreValue(state: FormValue): void
  /** Native element that owns validity. Return null for custom controls and implement `customFlags`. */
  protected nativeControl(): NativeControl | null {
    return null
  }
  protected customFlags(): ValidityStateFlags {
    return {}
  }
  protected messageContext(): MessageContext {
    return { label: this.label }
  }

  // ---- lifecycle ---------------------------------------------------------

  override connectedCallback(): void {
    super.connectedCallback()
    // Fired by form.requestSubmit()/checkValidity(): reveal our inline error as well
    this.addEventListener('invalid', this.#onInvalid)
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback()
    this.removeEventListener('invalid', this.#onInvalid)
  }

  #onInvalid = (): void => {
    this._showError = true
  }

  protected override firstUpdated(changed: PropertyValues): void {
    super.firstUpdated(changed)
    if (!this.label) warn(`<${this.localName}> needs a visible "label" (placeholders are not labels).`)
  }

  protected override updated(changed: PropertyValues): void {
    super.updated(changed)
    this.syncValidity()
  }

  formDisabledCallback(disabled: boolean): void {
    this._formDisabled = disabled
  }

  formResetCallback(): void {
    this._showError = false
    this.resetValue()
  }

  formStateRestoreCallback(state: FormValue): void {
    this.restoreValue(state)
  }

  protected get isDisabled(): boolean {
    return this.disabled || this._formDisabled
  }

  // ---- validation --------------------------------------------------------

  protected syncValidity(): void {
    this.internals.setFormValue(this.isDisabled ? null : this.formValue())
    const native = this.nativeControl()
    let flags: ValidityStateFlags
    if (native) {
      native.setCustomValidity(this.#custom)
      flags = copyFlags(native.validity)
    } else {
      flags = { ...this.customFlags() }
      if (this.#custom) flags.customError = true
    }
    if (!Object.values(flags).some(Boolean)) {
      this.internals.setValidity({})
      this.#message = ''
    } else {
      this.#message = this.#custom || this.friendlyMessage(flags, native)
      this.internals.setValidity(flags, this.#message, this.control() ?? undefined)
    }
    // Validation message changed while visible: repaint after this update completes.
    // (An external `error` replaces it entirely, so there is nothing to repaint.)
    if (this._showError && !this.error && this.#message !== this.#shown) queueMicrotask(() => this.requestUpdate())
  }

  private friendlyMessage(flags: ValidityStateFlags, native: NativeControl | null): string {
    const ctx = this.messageContext()
    for (const key of MESSAGE_ORDER) if (flags[key]) return messages[key](ctx)
    return native?.validationMessage ?? ''
  }

  /** Validate on blur (never per keystroke) and reveal the error */
  protected onControlBlur = (): void => {
    if (auditState.running) return
    this.syncValidity()
    this._showError = true
  }

  get form(): HTMLFormElement | null {
    return this.internals.form
  }
  get validity(): ValidityState {
    return this.internals.validity
  }
  get validationMessage(): string {
    return this.internals.validationMessage
  }
  get willValidate(): boolean {
    return this.internals.willValidate
  }

  checkValidity(): boolean {
    this.syncValidity()
    return this.internals.checkValidity()
  }

  /** Shows the inline error and focuses the control when invalid. */
  reportValidity(): boolean {
    this.syncValidity()
    this._showError = true
    const ok = this.internals.checkValidity()
    if (!ok) this.focus()
    return ok
  }

  setCustomValidity(message: string): void {
    this.#custom = message
    this.syncValidity()
  }

  /** Message currently invalid (even if not shown yet). Used by <sub-form> for the error summary. */
  get currentMessage(): string {
    this.syncValidity()
    return this.error || this.#message
  }

  // ---- shared templates --------------------------------------------------

  protected get displayedError(): string {
    return this.error || (this._showError ? this.#message : '')
  }

  protected get hasHint(): boolean {
    return Boolean(this.hint) || this.querySelector(':scope > [slot="hint"]') !== null
  }

  /** Label text + required/optional marker. The "*" is aria-hidden; "(optional)" is real text. */
  protected labelContent(): TemplateResult {
    const mode = this.noIndicator ? null : config.requiredIndicator
    const mark =
      this.required && (mode === 'required' || mode === 'both')
        ? html` <span class="req" aria-hidden="true">*</span>`
        : !this.required && (mode === 'optional' || mode === 'both')
          ? html` <span class="opt">(${messages.optional})</span>`
          : nothing
    return html`${this.label}${mark}`
  }

  protected renderLabel(forId = 'control'): TemplateResult {
    return html`<label id="label" for=${forId}>${this.labelContent()}</label>`
  }

  protected renderHint(): TemplateResult | typeof nothing {
    return this.hasHint ? html`<div id="hint" class="hint">${this.hint}<slot name="hint"></slot></div>` : nothing
  }

  protected renderError(): TemplateResult {
    const text = this.displayedError
    if (!this.error) this.#shown = text
    return html`<div id="error" class="error" aria-live="polite">${text ? html`${icons.error()}<span>${text}</span>` : nothing}</div>`
  }

  /** ids for aria-describedby, in reading order: hint, then error, then extras (e.g. counter) */
  protected describedBy(...extra: string[]): string | undefined {
    const ids = [this.hasHint ? 'hint' : '', 'error', ...extra].filter(Boolean)
    return ids.join(' ') || undefined
  }
}
