import { LitElement, css, html, nothing } from 'lit'
import { icons } from './shared/icons'
import { messages } from './shared/messages'
import { baseStyles, focusStyles, iconStyles } from './shared/styles'
import { define, focusElement } from './shared/utils'

export interface FormError {
  /** Field label */
  label: string
  message: string
  /** Control that receives focus when the link is activated */
  target: HTMLElement
}

/**
 * Error summary for 3+ errors: "Please fix N errors before continuing". Each item is a link that
 * focuses its field. The summary itself takes focus (`role="alert"`, `tabindex="-1"`) when shown.
 * <sub-form> drives it; use it directly for server-side validation.
 */
export class SubErrorSummary extends LitElement {
  static override properties = {
    heading: { type: String },
    errors: { attribute: false },
  }

  /** Overrides the default "Please fix N errors before continuing" */
  declare heading: string
  declare errors: FormError[]

  constructor() {
    super()
    this.heading = ''
    this.errors = []
  }

  static override styles = [
    baseStyles,
    focusStyles,
    iconStyles,
    css`
      :host {
        display: block;
        font-family: var(--sub-font-sans);
      }

      .summary {
        padding: var(--sub-error-summary-padding);
        border: var(--sub-error-summary-border-width) solid var(--sub-color-danger);
        border-radius: var(--sub-error-summary-radius);
        background: var(--sub-color-danger-subtle);
        color: var(--sub-color-text);
      }

      h2 {
        display: flex;
        gap: var(--sub-space-2);
        align-items: center;
        margin: 0 0 var(--sub-space-2);
        font-size: var(--sub-text-lg);
        font-weight: var(--sub-weight-semibold);
        color: var(--sub-color-danger);
      }

      ul {
        margin: 0;
        padding-inline-start: var(--sub-space-6);
      }

      li + li {
        margin-block-start: var(--sub-space-2);
      }

      a {
        display: inline-flex;
        align-items: center;
        min-block-size: var(--sub-target-size);
        color: var(--sub-color-danger);
        text-underline-offset: 0.2em;
      }

      a:hover {
        text-decoration-thickness: 2px;
      }
    `,
  ]

  override focus(): void {
    this.renderRoot.querySelector<HTMLElement>('.summary')?.focus()
  }

  #go(event: Event, target: HTMLElement): void {
    event.preventDefault()
    focusElement(target)
    target.scrollIntoView?.({ block: 'center' })
  }

  protected override render() {
    if (!this.errors.length) return nothing
    return html`<div class="summary" role="alert" tabindex="-1" aria-labelledby="title">
      <h2 id="title">${icons.error()}${this.heading || messages.errorsToFix(this.errors.length)}</h2>
      <ul>
        ${this.errors.map(
          (e) => html`<li><a href="#" @click=${(ev: Event) => this.#go(ev, e.target)}>${e.label}: ${e.message}</a></li>`,
        )}
      </ul>
    </div>`
  }
}

export function defineErrorSummary(): void {
  define('sub-error-summary', SubErrorSummary)
}

declare global {
  interface HTMLElementTagNameMap {
    'sub-error-summary': SubErrorSummary
  }
}
