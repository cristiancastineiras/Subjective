import { html, nothing, type PropertyDeclarations, type PropertyValues } from 'lit'
import { SubFormControl, type FormValue } from './form-control'
import { messages, type MessageContext } from './messages'
import { debounce } from './utils'

type Field = HTMLInputElement | HTMLTextAreaElement

/** Behaviour shared by <sub-input> and <sub-textarea>: value, native validity, character counter. */
export abstract class SubTextField extends SubFormControl {
  static override properties: PropertyDeclarations = {
    value: { type: String },
    placeholder: { type: String },
    autocomplete: { type: String },
    minlength: { type: Number },
    maxlength: { type: Number },
    readonly: { type: Boolean, reflect: true },
    counter: { type: Boolean },
    example: { type: String },
    _announce: { state: true },
  }

  declare value: string
  /** Supplementary hint only ("e.g. +1 555 000 0000"). It never replaces the label. */
  declare placeholder: string
  /** HTML autofill token: `email`, `given-name`, `postal-code`, `new-password`... */
  declare autocomplete: string
  declare minlength: number | undefined
  declare maxlength: number | undefined
  declare readonly: boolean
  /** Live "12 of 80 characters" (needs `maxlength`). Announced politely, not per keystroke. */
  declare counter: boolean
  /** Shown in format errors: "Enter a valid email address - for example, ana@example.com" */
  declare example: string
  declare _announce: string

  #default = ''

  constructor() {
    super()
    this.value = ''
    this.placeholder = ''
    this.autocomplete = ''
    this.minlength = undefined
    this.maxlength = undefined
    this.readonly = false
    this.counter = false
    this.example = ''
    this._announce = ''
  }

  protected abstract field(): Field | null

  protected nativeControl(): Field | null {
    return this.field()
  }
  protected control(): HTMLElement | null {
    return this.field()
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

  override connectedCallback(): void {
    super.connectedCallback()
    this.#default = this.value
  }

  protected override messageContext(): MessageContext {
    return {
      label: this.label,
      kind: 'text',
      example: this.example,
      minLength: this.minlength,
      maxLength: this.maxlength,
      length: this.value.length,
    }
  }

  #announceCount = debounce(() => {
    if (this.maxlength) this._announce = messages.characterCount(this.value.length, this.maxlength)
  }, 1000)

  protected onInput = (event: Event): void => {
    this.value = (event.target as Field).value
    if (this.counter) this.#announceCount()
  }

  /** `change` does not cross the shadow boundary on its own */
  protected onChange = (): void => {
    this.dispatchEvent(new Event('change', { bubbles: true }))
  }

  protected renderCounter() {
    if (!this.counter || !this.maxlength) return nothing
    return html`<div class="counter" aria-hidden="true">${this.value.length} / ${this.maxlength}</div>
      <div class="sr-only" aria-live="polite">${this._announce}</div>`
  }

  protected override updated(changed: PropertyValues): void {
    super.updated(changed)
  }
}
