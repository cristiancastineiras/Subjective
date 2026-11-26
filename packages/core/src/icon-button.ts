import { LitElement, css, html, nothing } from 'lit'
import { iconPath, renderIcon } from './shared/icons'
import { baseStyles, focusStyles, iconStyles } from './shared/styles'
import { define, warn } from './shared/utils'
import { defineTooltip } from './tooltip'
import type { ButtonVariant } from './button'

/**
 * Icon-only button. `label` is REQUIRED: it is the accessible name (`aria-label`) and the tooltip.
 * Use only for universal icons (close, search, print...); otherwise use <sub-button> with text.
 *
 * Icon: `icon="close"` (built-in set) or slot your own `<svg>` (it is hidden from assistive tech).
 * Toggle (bold, favourite): set `toggle`, then `pressed` reflects the state (`aria-pressed`).
 */
export class SubIconButton extends LitElement {
  static override shadowRootOptions: ShadowRootInit = { mode: 'open', delegatesFocus: true }

  static override properties = {
    label: { type: String },
    icon: { type: String },
    variant: { type: String, reflect: true },
    shortcut: { type: String },
    toggle: { type: Boolean },
    pressed: { type: Boolean, reflect: true },
    disabled: { type: Boolean, reflect: true },
  }

  declare label: string
  declare icon: string
  declare variant: ButtonVariant
  /** Shown in the tooltip only, e.g. "Ctrl+B" */
  declare shortcut: string
  declare toggle: boolean
  declare pressed: boolean
  declare disabled: boolean

  constructor() {
    super()
    this.label = ''
    this.icon = ''
    this.variant = 'tertiary'
    this.shortcut = ''
    this.toggle = false
    this.pressed = false
    this.disabled = false
  }

  static override styles = [
    baseStyles,
    focusStyles,
    iconStyles,
    css`
      :host {
        display: inline-block;
      }

      button {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        /* 20px glyph inside a 44px hit area */
        inline-size: var(--sub-icon-button-size);
        block-size: var(--sub-icon-button-size);
        padding: 0;
        border: var(--sub-icon-button-border-width) solid transparent;
        border-radius: var(--sub-icon-button-radius);
        background: transparent;
        color: var(--sub-color-text);
        cursor: pointer;
        touch-action: manipulation;
      }

      :host([variant='secondary']) button {
        background: var(--sub-color-surface);
        border-color: var(--sub-color-border);
      }

      :host([variant='primary']) button {
        background: var(--sub-color-accent);
        color: var(--sub-color-on-accent);
      }

      :host([variant='danger']) button {
        background: var(--sub-color-danger-solid);
        color: var(--sub-color-on-danger-solid);
      }

      @media (hover: hover) {
        button:enabled:hover {
          background: var(--sub-color-surface-hover);
        }

        :host([variant='primary']) button:enabled:hover {
          background: var(--sub-color-accent-hover);
        }

        :host([variant='danger']) button:enabled:hover {
          background: var(--sub-color-danger-solid-hover);
        }
      }

      /* Pressed toggle: filled + inset ring (not colour alone) */
      button[aria-pressed='true'] {
        background: var(--sub-color-accent-subtle);
        color: var(--sub-color-on-accent-subtle);
        box-shadow: inset 0 0 0 var(--sub-icon-button-border-width) var(--sub-color-accent);
      }

      button:disabled {
        background: var(--sub-color-disabled);
        color: var(--sub-color-on-disabled);
        cursor: not-allowed;
      }

      ::slotted(svg),
      .icon {
        inline-size: var(--sub-icon-button-icon-size);
        block-size: var(--sub-icon-button-icon-size);
      }

      @media (forced-colors: active) {
        button:disabled {
          border-color: GrayText;
          color: GrayText;
        }
      }
    `,
  ]

  protected override firstUpdated(): void {
    if (!this.label) warn('<sub-icon-button> needs a "label": an icon alone has no accessible name.')
  }

  #hideSlottedIcons = (event: Event): void => {
    for (const el of (event.target as HTMLSlotElement).assignedElements()) {
      el.setAttribute('aria-hidden', 'true')
      el.setAttribute('focusable', 'false')
    }
  }

  protected override render() {
    const tip = this.shortcut ? `${this.label} (${this.shortcut})` : this.label
    return html`<button
        id="btn"
        type="button"
        part="button"
        aria-label=${this.label}
        aria-pressed=${this.toggle ? String(this.pressed) : nothing}
        ?disabled=${this.disabled}
      >
        ${this.icon && iconPath(this.icon) ? renderIcon(this.icon) : html`<slot @slotchange=${this.#hideSlottedIcons}></slot>`}
      </button>
      ${this.disabled ? nothing : html`<sub-tooltip for="btn" decorative>${tip}</sub-tooltip>`}`
  }

  override connectedCallback(): void {
    super.connectedCallback()
    defineTooltip()
    this.addEventListener('click', this.#onClick)
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback()
    this.removeEventListener('click', this.#onClick)
  }

  #onClick = (): void => {
    if (this.toggle && !this.disabled) this.pressed = !this.pressed
  }
}

export function defineIconButton(): void {
  defineTooltip()
  define('sub-icon-button', SubIconButton)
}

declare global {
  interface HTMLElementTagNameMap {
    'sub-icon-button': SubIconButton
  }
}
