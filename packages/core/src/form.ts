import { LitElement, css, html } from 'lit'
import { SubErrorSummary, defineErrorSummary, type FormError } from './error-summary'
import type { SubFormControl } from './shared/form-control'
import { baseStyles } from './shared/styles'
import { define, emit, focusElement } from './shared/utils'

type Validatable = HTMLElement & {
  willValidate: boolean
  validationMessage: string
  checkValidity(): boolean
  labels?: NodeListOf<HTMLLabelElement> | null
  name?: string
}

/**
 * Wrap a native `<form>` to get accessible submit validation:
 *  - shows ALL errors at once, inline, and never wipes the form
 *  - 1-2 errors: focuses the first invalid field; 3+ (`summary-threshold`): shows an error summary
 *    with a link per field and focuses it
 *  - suppresses the browser's own error bubbles (sets `novalidate` on the form)
 * Works with <sub-*> controls and with native inputs. Listen to `sub-invalid` / `submit` as usual.
 */
export class SubForm extends LitElement {
  static override properties = {
    summaryThreshold: { type: Number, attribute: 'summary-threshold' },
    _errors: { state: true },
  }

  declare summaryThreshold: number
  declare _errors: FormError[]

  constructor() {
    super()
    this.summaryThreshold = 3
    this._errors = []
  }

  static override styles = [
    baseStyles,
    css`
      :host {
        display: block;
      }

      sub-error-summary {
        margin-block-end: var(--sub-field-gap);
      }
    `,
  ]

  override connectedCallback(): void {
    super.connectedCallback()
    defineErrorSummary()
    this.addEventListener('submit', this.#onSubmit)
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback()
    this.removeEventListener('submit', this.#onSubmit)
  }

  #forms(): HTMLFormElement[] {
    return [...this.querySelectorAll('form')]
  }

  #labelOf(el: Validatable): string {
    return (el as Partial<SubFormControl>).label || el.labels?.[0]?.textContent?.replace(/\s*\(optional\)|\s*\*/g, '').trim() || el.name || 'Field'
  }

  #onSubmit = (event: Event): void => {
    const form = event.target
    if (!(form instanceof HTMLFormElement)) return
    // Only bubbled submits from forms we own; the browser must not show its own bubbles
    form.noValidate = true

    const errors: FormError[] = []
    for (const el of form.elements as HTMLFormControlsCollection & Iterable<Validatable>) {
      if (!el.willValidate || el.checkValidity()) continue
      const sub = el as Partial<SubFormControl>
      errors.push({
        label: this.#labelOf(el),
        message: sub.currentMessage ?? el.validationMessage,
        target: el,
      })
    }

    if (!errors.length) {
      this._errors = []
      return
    }

    // Invalid: nothing downstream may treat this as a real submit
    event.preventDefault()
    event.stopPropagation()
    this._errors = errors
    emit(this, 'sub-invalid', { errors })

    for (const e of errors) (e.target as Partial<SubFormControl>).reportValidity?.()
    // reportValidity() focused the last one; send focus where the user should start
    void this.updateComplete.then(() => {
      if (errors.length >= this.summaryThreshold) this.renderRoot.querySelector<SubErrorSummary>('sub-error-summary')?.focus()
      else focusElement(errors[0]?.target)
    })
  }

  /** Programmatic reset of the summary (e.g. after the user fixes everything) */
  clearErrors(): void {
    this._errors = []
  }

  protected override firstUpdated(): void {
    for (const f of this.#forms()) f.noValidate = true
  }

  protected override render() {
    const showSummary = this._errors.length >= this.summaryThreshold
    return html`${showSummary ? html`<sub-error-summary .errors=${this._errors}></sub-error-summary>` : ''}<slot
        @slotchange=${() => this.#forms().forEach((f) => (f.noValidate = true))}
      ></slot>`
  }
}

export function defineForm(): void {
  defineErrorSummary()
  define('sub-form', SubForm)
}

declare global {
  interface HTMLElementTagNameMap {
    'sub-form': SubForm
  }
}
