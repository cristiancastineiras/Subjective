import { LitElement, css, html, nothing } from 'lit'
import { icons } from './shared/icons'
import { messages } from './shared/messages'
import { baseStyles, focusStyles, iconStyles, visuallyHidden } from './shared/styles'
import { define, emit } from './shared/utils'

export type AlertVariant = 'info' | 'success' | 'warning' | 'error'

const GLYPH = { info: 'info-fill', success: 'check_circle-fill', warning: 'warning-fill', error: 'error-fill' } as const
const LABEL: Record<AlertVariant, string> = { info: 'Information', success: 'Success', warning: 'Warning', error: 'Error' }

/**
 * Inline message banner. Severity is icon + text + border, never colour alone.
 * `error` is announced assertively (`role="alert"`); the rest politely (`role="status"`).
 * Never auto-dismisses. System errors: say what happened, why, and what to do (put the action in
 * `slot="actions"`: "Try again", "Contact support"), without codes or stack traces.
 */
export class SubAlert extends LitElement {
  static override shadowRootOptions: ShadowRootInit = { mode: 'open', delegatesFocus: true }

  static override properties = {
    variant: { type: String, reflect: true },
    heading: { type: String },
    dismissible: { type: Boolean },
  }

  declare variant: AlertVariant
  declare heading: string
  declare dismissible: boolean

  constructor() {
    super()
    this.variant = 'info'
    this.heading = ''
    this.dismissible = false
  }

  static override styles = [
    baseStyles,
    focusStyles,
    iconStyles,
    visuallyHidden,
    css`
      :host {
        display: block;
        font-family: var(--sub-font-sans);
        color: var(--sub-color-text);
      }

      .alert {
        --_c: var(--sub-color-info);
        --_bg: var(--sub-color-info-subtle);
        display: grid;
        grid-template-columns: auto minmax(0, 1fr) auto;
        gap: var(--sub-alert-gap);
        align-items: start;
        padding: var(--sub-alert-padding);
        border: var(--sub-alert-border-width) solid var(--_c);
        border-inline-start-width: var(--sub-alert-accent-width);
        border-radius: var(--sub-alert-radius);
        background: var(--_bg);
      }

      :host([variant='success']) .alert {
        --_c: var(--sub-color-success);
        --_bg: var(--sub-color-success-subtle);
      }

      :host([variant='warning']) .alert {
        --_c: var(--sub-color-warning);
        --_bg: var(--sub-color-warning-subtle);
      }

      :host([variant='error']) .alert {
        --_c: var(--sub-color-danger);
        --_bg: var(--sub-color-danger-subtle);
      }

      .glyph {
        color: var(--_c);
        margin-block-start: 0.125rem;
      }

      .heading {
        margin: 0 0 var(--sub-space-1);
        color: var(--_c);
        font-size: var(--sub-text-md);
        font-weight: var(--sub-weight-semibold);
      }

      .content {
        line-height: var(--sub-leading-normal);
      }

      .actions {
        display: flex;
        flex-wrap: wrap;
        gap: var(--sub-target-gap);
        margin-block-start: var(--sub-space-3);
      }

      .actions:not(:has(::slotted(*))) {
        display: none;
      }

      .dismiss {
        display: grid;
        place-items: center;
        inline-size: var(--sub-target-size);
        block-size: var(--sub-target-size);
        margin: calc(var(--sub-space-3) * -1);
        padding: 0;
        border: 0;
        border-radius: var(--sub-control-radius);
        background: transparent;
        color: inherit;
        cursor: pointer;
      }

      @media (hover: hover) {
        .dismiss:hover {
          background: var(--sub-color-surface-hover);
        }
      }
    `,
  ]

  #dismiss = (): void => {
    this.hidden = true
    emit(this, 'sub-dismiss')
  }

  protected override render() {
    const glyph = icons[GLYPH[this.variant]]()
    return html`<div class="alert" part="alert" role=${this.variant === 'error' ? 'alert' : 'status'}>
      <span class="glyph">${glyph}</span>
      <div class="content">
        ${this.heading ? html`<p class="heading">${this.heading}</p>` : html`<span class="sr-only">${LABEL[this.variant]}: </span>`}
        <slot></slot>
        <div class="actions"><slot name="actions"></slot></div>
      </div>
      ${this.dismissible
        ? html`<button class="dismiss" type="button" aria-label=${messages.close} @click=${this.#dismiss}>${icons.close()}</button>`
        : nothing}
    </div>`
  }
}

export function defineAlert(): void {
  define('sub-alert', SubAlert)
}

declare global {
  interface HTMLElementTagNameMap {
    'sub-alert': SubAlert
  }
}
