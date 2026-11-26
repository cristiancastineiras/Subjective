import { LitElement, css, html, nothing } from 'lit'
import { messages } from './shared/messages'
import { baseStyles } from './shared/styles'
import { define } from './shared/utils'

/**
 * Indeterminate activity for waits of unknown length. Prefer a message that says WHAT is happening
 * ("Generating report") over a bare spinner; use <sub-progress> when the amount is known.
 * `role="status"`; with reduced motion it turns slowly instead of stopping, so it still reads as busy.
 */
export class SubSpinner extends LitElement {
  static override properties = {
    label: { type: String },
    showLabel: { type: Boolean, attribute: 'show-label' },
  }

  /** Accessible name (and visible text with `show-label`). Default "Loading". */
  declare label: string
  declare showLabel: boolean

  constructor() {
    super()
    this.label = ''
    this.showLabel = false
  }

  static override styles = [
    baseStyles,
    css`
      :host {
        display: inline-flex;
        gap: var(--sub-space-2);
        align-items: center;
        font-family: var(--sub-font-sans);
        color: var(--sub-color-text);
      }

      .ring {
        flex: none;
        inline-size: var(--sub-spinner-size);
        block-size: var(--sub-spinner-size);
        border: var(--sub-spinner-thickness) solid var(--sub-color-surface-sunken);
        border-block-start-color: var(--sub-color-accent);
        border-radius: 50%;
        animation: spin 0.9s linear infinite;
      }

      @keyframes spin {
        to {
          rotate: 1turn;
        }
      }

      @media (prefers-reduced-motion: reduce) {
        .ring {
          animation-duration: 6s;
        }
      }

      @media (forced-colors: active) {
        .ring {
          border-color: GrayText;
          border-block-start-color: Highlight;
        }
      }
    `,
  ]

  protected override render() {
    const label = this.label || messages.loading
    return html`<span role="status" aria-label=${this.showLabel ? nothing : label} style="display: contents"
      ><span class="ring" aria-hidden="true"></span>${this.showLabel ? html`<span>${label}</span>` : nothing}</span
    >`
  }
}

export function defineSpinner(): void {
  define('sub-spinner', SubSpinner)
}

declare global {
  interface HTMLElementTagNameMap {
    'sub-spinner': SubSpinner
  }
}
