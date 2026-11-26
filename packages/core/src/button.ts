import { LitElement, css, html, nothing } from 'lit'
import { messages } from './shared/messages'
import { baseStyles, controlTypography, focusStyles, visuallyHidden } from './shared/styles'
import { define } from './shared/utils'

/**
 * Hierarchy (SubUX): exactly ONE `primary` per view; `secondary` outlined; `tertiary` text-style;
 * `danger` for destructive actions (name the consequence in the label: "Delete project").
 */
export type ButtonVariant = 'primary' | 'secondary' | 'tertiary' | 'danger'
export type ButtonType = 'button' | 'submit' | 'reset'

/**
 * Action button. Renders a native `<button>`, or a native `<a>` when `href` is set
 * (navigation = link, action = button). Submits/resets its form like a native button.
 *
 * Disabled: `disabled` removes it from the tab order. With `disabled-reason` it stays focusable
 * (`aria-disabled`) and the reason is shown next to it, so nobody wonders why.
 */
export class SubButton extends LitElement {
  static formAssociated = true

  static override shadowRootOptions: ShadowRootInit = {
    mode: 'open',
    delegatesFocus: true,
  }

  static override properties = {
    variant: { type: String, reflect: true },
    type: { type: String },
    href: { type: String },
    target: { type: String },
    rel: { type: String },
    download: { type: String },
    disabled: { type: Boolean, reflect: true },
    disabledReason: { type: String, attribute: 'disabled-reason' },
    loading: { type: Boolean, reflect: true },
    loadingLabel: { type: String, attribute: 'loading-label' },
    block: { type: Boolean, reflect: true },
    toggle: { type: Boolean },
    pressed: { type: Boolean, reflect: true },
    _formDisabled: { state: true },
  }

  declare variant: ButtonVariant
  declare type: ButtonType
  declare href: string
  declare target: string
  declare rel: string
  declare download: string
  declare disabled: boolean
  declare disabledReason: string
  /** Shows a spinner and blocks repeat clicks, keeps focus (`aria-busy`) */
  declare loading: boolean
  /** Text shown while loading, e.g. "Saving..." */
  declare loadingLabel: string
  /** Full width */
  declare block: boolean
  /** Behaves as a toggle button (`aria-pressed`): filters, view options, one-of-many presets */
  declare toggle: boolean
  declare pressed: boolean
  declare _formDisabled: boolean

  readonly #internals = this.attachInternals()

  constructor() {
    super()
    this.variant = 'primary'
    this.type = 'button'
    this.href = ''
    this.target = ''
    this.rel = ''
    this.download = ''
    this.disabled = false
    this.disabledReason = ''
    this.loading = false
    this.loadingLabel = ''
    this.block = false
    this.toggle = false
    this.pressed = false
    this._formDisabled = false
  }

  formDisabledCallback(disabled: boolean): void {
    this._formDisabled = disabled
  }

  static override styles = [
    baseStyles,
    focusStyles,
    visuallyHidden,
    css`
      :host {
        display: inline-flex;
        flex-direction: column;
        align-items: flex-start;
        gap: var(--sub-space-1);
        max-inline-size: 100%;
        vertical-align: middle;
      }

      :host([block]) {
        display: flex;
        align-items: stretch;
      }

      .btn {
        ${controlTypography}
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: var(--sub-button-gap);
        min-block-size: var(--sub-button-min-size);
        min-inline-size: var(--sub-button-min-size);
        max-inline-size: 100%;
        padding: var(--sub-button-padding-block) var(--sub-button-padding-inline);
        border: var(--sub-button-border-width) solid transparent;
        border-radius: var(--sub-button-radius);
        font-size: var(--sub-button-font-size);
        font-weight: var(--sub-button-font-weight);
        background: var(--sub-color-accent);
        color: var(--sub-color-on-accent);
        text-align: center;
        text-decoration: none;
        overflow-wrap: anywhere;
        cursor: pointer;
        touch-action: manipulation;
        transition:
          background-color var(--sub-duration-fast) var(--sub-ease-standard),
          translate var(--sub-duration-fast) var(--sub-ease-standard);
      }

      :host([variant='secondary']) .btn {
        background: var(--sub-color-surface);
        color: var(--sub-color-text);
        border-color: var(--sub-color-border);
      }

      :host([variant='tertiary']) .btn {
        background: transparent;
        color: var(--sub-color-accent);
      }

      :host([variant='danger']) .btn {
        background: var(--sub-color-danger-solid);
        color: var(--sub-color-on-danger-solid);
      }

      @media (hover: hover) {
        .btn:hover {
          background: var(--sub-color-accent-hover);
        }

        :host([variant='secondary']) .btn:hover,
        :host([variant='tertiary']) .btn:hover {
          background: var(--sub-color-surface-hover);
        }

        :host([variant='danger']) .btn:hover {
          background: var(--sub-color-danger-solid-hover);
        }
      }

      /* Toggled on: filled tint + inset ring, so it is not colour alone */
      .btn[aria-pressed='true'] {
        background: var(--sub-color-accent-subtle);
        color: var(--sub-color-on-accent-subtle);
        border-color: var(--sub-color-accent);
        box-shadow: inset 0 0 0 var(--sub-button-border-width) var(--sub-color-accent);
      }

      /* Pressed: differs by more than colour (moves 1px) */
      .btn:active {
        translate: 0 1px;
      }

      /* Soft-disabled and hard-disabled look the same; neither looks like an error */
      .btn:disabled,
      .btn[aria-disabled='true'],
      :host([variant]) .btn:disabled,
      :host([variant]) .btn[aria-disabled='true'] {
        background: var(--sub-color-disabled);
        color: var(--sub-color-on-disabled);
        border-color: transparent;
        cursor: not-allowed;
        translate: none;
      }

      .btn[aria-busy='true'] {
        cursor: progress;
      }

      .spinner {
        flex: none;
        inline-size: 1em;
        block-size: 1em;
        border: 2px solid currentColor;
        border-inline-end-color: transparent;
        border-radius: 50%;
        animation: spin 0.8s linear infinite;
      }

      @keyframes spin {
        to {
          rotate: 1turn;
        }
      }

      /* Slow down, don't stop: the user still needs to know it's working */
      @media (prefers-reduced-motion: reduce) {
        .spinner {
          animation-duration: 4s;
        }
      }

      .reason {
        font-size: var(--sub-text-sm);
        color: var(--sub-color-muted);
      }

      @media (forced-colors: active) {
        .btn {
          border-color: ButtonText;
        }

        .btn:disabled,
        .btn[aria-disabled='true'] {
          border-color: GrayText;
          color: GrayText;
        }
      }
    `,
  ]

  get #softDisabled(): boolean {
    return (this.disabled || this._formDisabled) && Boolean(this.disabledReason)
  }

  get #hardDisabled(): boolean {
    return (this.disabled || this._formDisabled) && !this.disabledReason
  }

  #onClick = (event: Event): void => {
    if (this.loading || this.#softDisabled) {
      // Swallow it before the host's own listeners see it
      event.preventDefault()
      event.stopImmediatePropagation()
      return
    }
    if (this.toggle) this.pressed = !this.pressed
    if (this.type === 'submit') this.#internals.form?.requestSubmit()
    else if (this.type === 'reset') this.#internals.form?.reset()
  }

  #content() {
    const label = this.loading && this.loadingLabel ? this.loadingLabel : html`<slot></slot>`
    return html`${this.loading ? html`<span class="spinner" aria-hidden="true"></span>` : nothing}<slot name="icon-start"></slot
      ><span class="label">${label}</span><slot name="icon-end"></slot>`
  }

  protected override render() {
    const asLink = Boolean(this.href) && !this.disabled && !this._formDisabled
    if (asLink) {
      const newTab = this.target === '_blank'
      return html`<a
        class="btn"
        part="button"
        href=${this.href}
        target=${this.target || nothing}
        rel=${this.rel || (newTab ? 'noopener noreferrer' : nothing)}
        download=${this.download || nothing}
        >${this.#content()}${newTab ? html`<span class="sr-only"> ${messages.opensInNewTab}</span>` : nothing}</a
      >`
    }
    return html`<button
        class="btn"
        part="button"
        type="button"
        ?disabled=${this.#hardDisabled}
        aria-disabled=${this.#softDisabled ? 'true' : nothing}
        aria-busy=${this.loading ? 'true' : nothing}
        aria-pressed=${this.toggle ? String(this.pressed) : nothing}
        aria-describedby=${this.#softDisabled ? 'reason' : nothing}
        @click=${this.#onClick}
      >
        ${this.#content()}
      </button>
      ${this.#softDisabled ? html`<span class="reason" id="reason">${this.disabledReason}</span>` : nothing}`
  }
}

export function defineButton(): void {
  define('sub-button', SubButton)
}

declare global {
  interface HTMLElementTagNameMap {
    'sub-button': SubButton
  }
}
