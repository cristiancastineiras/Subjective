import { LitElement, css, html } from 'lit'
import { baseStyles } from './shared/styles'
import { define } from './shared/utils'

/**
 * Masonry via CSS multi-column: items keep DOM order (it fills column by column, top to bottom),
 * which is also the reading and tab order. No JavaScript layout, reflows by itself.
 */
export class SubMasonry extends LitElement {
  static override styles = [
    baseStyles,
    css`
      :host {
        display: block;
        column-width: var(--sub-masonry-column-width);
        column-gap: var(--sub-masonry-gap);
      }

      ::slotted(*) {
        display: block;
        break-inside: avoid;
        margin-block-end: var(--sub-masonry-gap);
      }
    `,
  ]

  protected override render() {
    return html`<slot></slot>`
  }
}

export function defineMasonry(): void {
  define('sub-masonry', SubMasonry)
}

declare global {
  interface HTMLElementTagNameMap {
    'sub-masonry': SubMasonry
  }
}
