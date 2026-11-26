import { LitElement, css, nothing } from 'lit'
import { html, unsafeStatic } from 'lit/static-html.js'
import { baseStyles } from './shared/styles'
import { define } from './shared/utils'

/**
 * Heading whose SEMANTIC level and VISUAL size are independent: `level` follows the page outline
 * (never skip levels, one h1 per page), `size` (1-6) restyles it without breaking the outline.
 * Sizes follow a 1.25 modular scale and shrink fluidly on small screens (rem + clamp, never px).
 */
export class SubHeading extends LitElement {
  static override properties = {
    level: { type: Number },
    size: { type: Number, reflect: true },
  }

  declare level: number
  /** 1 (largest) to 6. Defaults to the same number as `level`. */
  declare size: number

  constructor() {
    super()
    this.level = 2
    this.size = 0
  }

  static override styles = [
    baseStyles,
    css`
      :host {
        display: block;
      }

      .h {
        margin-block: var(--sub-heading-margin-block);
        font-family: var(--sub-font-sans);
        font-weight: var(--sub-weight-semibold);
        line-height: var(--sub-leading-snug);
        color: var(--sub-color-text);
        text-wrap: balance;
      }

      :host([size='1']) .h {
        font-size: clamp(1.75rem, 4vw, var(--sub-text-3xl));
        font-weight: var(--sub-weight-bold);
        line-height: var(--sub-leading-tight);
      }

      :host([size='2']) .h {
        font-size: clamp(1.563rem, 3vw, var(--sub-text-2xl));
      }

      :host([size='3']) .h {
        font-size: clamp(1.25rem, 2.5vw, var(--sub-text-xl));
      }

      :host([size='4']) .h {
        font-size: var(--sub-text-lg);
        font-weight: var(--sub-weight-medium);
      }

      :host([size='5']) .h {
        font-size: var(--sub-text-md);
      }

      :host([size='6']) .h {
        font-size: var(--sub-text-sm);
      }
    `,
  ]

  protected override willUpdate(): void {
    if (!this.size) this.size = Math.min(6, Math.max(1, this.level))
  }

  protected override render() {
    const tag = unsafeStatic(`h${Math.min(6, Math.max(1, this.level))}`)
    return html`<${tag} class="h" part="heading"><slot></slot></${tag}>${nothing}`
  }
}

export function defineHeading(): void {
  define('sub-heading', SubHeading)
}

declare global {
  interface HTMLElementTagNameMap {
    'sub-heading': SubHeading
  }
}
