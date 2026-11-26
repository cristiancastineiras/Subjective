import { LitElement, css, html } from 'lit'
import { baseStyles } from './shared/styles'
import { define } from './shared/utils'

/**
 * Responsive grid. Without `columns` it auto-fits columns of at least `--sub-grid-min` (no media
 * queries: it reflows by itself, also at 200% zoom). With `columns="3"` it is a fixed N-column grid.
 * Children may use `style="grid-column: span 2"`. DOM order is visual order.
 */
export class SubGrid extends LitElement {
  static override properties = {
    columns: { type: Number, reflect: true },
  }

  declare columns: number | undefined

  constructor() {
    super()
    this.columns = undefined
  }

  static override styles = [
    baseStyles,
    css`
      :host {
        display: grid;
        gap: var(--sub-grid-gap);
        grid-template-columns: repeat(auto-fit, minmax(min(100%, var(--sub-grid-min)), 1fr));
      }

      :host([columns]) {
        grid-template-columns: repeat(var(--_columns), minmax(0, 1fr));
      }

      /* A grid item never forces its track wider than the grid (wide tables inside a card scroll instead) */
      ::slotted(*) {
        min-inline-size: 0;
      }
    `,
  ]

  protected override updated(): void {
    if (this.columns) this.style.setProperty('--_columns', String(this.columns))
    else this.style.removeProperty('--_columns')
  }

  protected override render() {
    return html`<slot></slot>`
  }
}

export function defineGrid(): void {
  define('sub-grid', SubGrid)
}

declare global {
  interface HTMLElementTagNameMap {
    'sub-grid': SubGrid
  }
}
