import { LitElement, css, html, nothing } from 'lit'
import { icons } from './shared/icons'
import { baseStyles, iconStyles } from './shared/styles'
import { define } from './shared/utils'

export type BadgeVariant = 'neutral' | 'info' | 'success' | 'warning' | 'danger'

const GLYPH = { info: 'info-fill', success: 'check_circle-fill', warning: 'warning-fill', danger: 'error-fill' } as const

/**
 * Status label: colour + icon + TEXT (never colour alone). The text is what carries the meaning
 * ("Overdue", not just a red dot). Neutral has no icon.
 */
export class SubBadge extends LitElement {
  static override properties = {
    variant: { type: String, reflect: true },
  }

  declare variant: BadgeVariant

  constructor() {
    super()
    this.variant = 'neutral'
  }

  static override styles = [
    baseStyles,
    iconStyles,
    css`
      :host {
        display: inline-flex;
        vertical-align: middle;
      }

      .badge {
        --_c: var(--sub-color-text);
        --_bg: var(--sub-color-surface-sunken);
        display: inline-flex;
        gap: var(--sub-space-1);
        align-items: center;
        padding: var(--sub-badge-padding-block) var(--sub-badge-padding-inline);
        border: var(--sub-badge-border-width) solid var(--_c);
        border-radius: var(--sub-badge-radius);
        background: var(--_bg);
        color: var(--_c);
        font: var(--sub-weight-semibold) var(--sub-badge-font-size) / var(--sub-leading-snug) var(--sub-font-sans);
        white-space: nowrap;
      }

      :host([variant='info']) .badge {
        --_c: var(--sub-color-info);
        --_bg: var(--sub-color-info-subtle);
      }

      :host([variant='success']) .badge {
        --_c: var(--sub-color-success);
        --_bg: var(--sub-color-success-subtle);
      }

      :host([variant='warning']) .badge {
        --_c: var(--sub-color-warning);
        --_bg: var(--sub-color-warning-subtle);
      }

      :host([variant='danger']) .badge {
        --_c: var(--sub-color-danger);
        --_bg: var(--sub-color-danger-subtle);
      }

      .icon {
        inline-size: 1em;
        block-size: 1em;
      }
    `,
  ]

  protected override render() {
    const glyph = this.variant === 'neutral' ? nothing : icons[GLYPH[this.variant]]()
    return html`<span class="badge" part="badge">${glyph}<slot></slot></span>`
  }
}

export function defineBadge(): void {
  define('sub-badge', SubBadge)
}

declare global {
  interface HTMLElementTagNameMap {
    'sub-badge': SubBadge
  }
}
