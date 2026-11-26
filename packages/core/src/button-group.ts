import { LitElement, css, html } from 'lit'
import { baseStyles } from './shared/styles'
import { define, warn } from './shared/utils'

/**
 * Groups related actions (`role="group"` + name). `form-actions`: Cancel left, primary right on
 * desktop; stacked with the primary on top on narrow containers (SubUX button hierarchy).
 *
 * Put the buttons in visual order for desktop: <cancel> then <primary>.
 */
export class SubButtonGroup extends LitElement {
  static override properties = {
    label: { type: String },
    layout: { type: String, reflect: true },
  }

  declare label: string
  /** `inline` (default) wraps and aligns start; `form-actions` right-aligns, stacks on mobile */
  declare layout: 'inline' | 'form-actions'

  constructor() {
    super()
    this.label = ''
    this.layout = 'inline'
  }

  static override styles = [
    baseStyles,
    css`
      :host {
        display: block;
        inline-size: 100%; /* a container never shrink-wraps its content: fill the line (also inside a flex row) */
        container-type: inline-size;
      }

      .group {
        display: flex;
        flex-wrap: wrap;
        gap: var(--sub-target-gap);
        align-items: flex-start;
      }

      :host([layout='form-actions']) .group {
        justify-content: flex-end;
        align-items: center;
      }

      @container (inline-size < 30rem) {
        :host([layout='form-actions']) .group {
          flex-direction: column-reverse;
          align-items: stretch;
        }

        :host([layout='form-actions']) ::slotted(*) {
          inline-size: 100%;
        }
      }
    `,
  ]

  protected override firstUpdated(): void {
    if (!this.label) warn('<sub-button-group> needs a "label" so the group has an accessible name.')
  }

  protected override render() {
    return html`<div class="group" role="group" aria-label=${this.label}><slot></slot></div>`
  }
}

export function defineButtonGroup(): void {
  define('sub-button-group', SubButtonGroup)
}

declare global {
  interface HTMLElementTagNameMap {
    'sub-button-group': SubButtonGroup
  }
}
