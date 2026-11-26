import { LitElement, css, html, nothing } from 'lit'
import { baseStyles } from './shared/styles'
import { define } from './shared/utils'

/**
 * Separator between groups of content. Semantic (`role="separator"`) by default; add `decorative`
 * when it is only visual (assistive tech skips it). A `label` shows text in the line and names it.
 * Drawn with borders (not backgrounds) so it survives forced-colors mode.
 */
export class SubDivider extends LitElement {
  static override properties = {
    orientation: { type: String, reflect: true },
    label: { type: String },
    decorative: { type: Boolean },
  }

  declare orientation: 'horizontal' | 'vertical'
  declare label: string
  declare decorative: boolean

  constructor() {
    super()
    this.orientation = 'horizontal'
    this.label = ''
    this.decorative = false
  }

  static override styles = [
    baseStyles,
    css`
      :host {
        display: block;
        margin-block: var(--sub-divider-spacing);
        color: var(--sub-color-muted);
        font-family: var(--sub-font-sans);
        font-size: var(--sub-text-sm);
      }

      .divider {
        display: flex;
        align-items: center;
        gap: var(--sub-space-3);
      }

      .divider::before,
      .divider::after {
        content: '';
        flex: 1;
        border-block-start: var(--sub-divider-thickness) solid var(--sub-divider-color);
      }

      .divider:not(:has(.text))::after {
        display: none;
      }

      :host([orientation='vertical']) {
        display: inline-block;
        align-self: stretch;
        margin-block: 0;
        margin-inline: var(--sub-divider-spacing);
        min-block-size: 1em;
      }

      :host([orientation='vertical']) .divider {
        flex-direction: column;
        block-size: 100%;
      }

      :host([orientation='vertical']) .divider::before,
      :host([orientation='vertical']) .divider::after {
        border-block-start: 0;
        border-inline-start: var(--sub-divider-thickness) solid var(--sub-divider-color);
      }
    `,
  ]

  protected override render() {
    return html`<div
      class="divider"
      role=${this.decorative ? 'presentation' : 'separator'}
      aria-orientation=${this.decorative || this.orientation === 'horizontal' ? nothing : 'vertical'}
      aria-label=${!this.decorative && this.label ? this.label : nothing}
    >
      ${this.label ? html`<span class="text" aria-hidden="true">${this.label}</span>` : nothing}
    </div>`
  }
}

export function defineDivider(): void {
  define('sub-divider', SubDivider)
}

declare global {
  interface HTMLElementTagNameMap {
    'sub-divider': SubDivider
  }
}
