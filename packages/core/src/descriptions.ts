import { LitElement, css, nothing } from 'lit'
import { html, unsafeStatic } from 'lit/static-html.js'
import { ChildrenController } from './shared/children'
import { baseStyles, focusStyles } from './shared/styles'
import { define } from './shared/utils'

/**
 * Read-only label/value pairs on a real `<dl>` (details of an order, a user, a record). Write the pairs
 * as plain children and they render as a definition list:
 *
 *   <sub-descriptions heading="Order 1042">
 *     <sub-desc label="Customer">Ana Ruiz</sub-desc>
 *   </sub-descriptions>
 *
 * (`<sub-desc>` content is the author's own markup, shown in place through a slot: never copied.)
 */
export class SubDescriptions extends LitElement {
  static override properties = {
    heading: { type: String },
    level: { type: Number },
    bordered: { type: Boolean, reflect: true },
  }

  declare heading: string
  declare level: number
  declare bordered: boolean

  readonly #items = new ChildrenController<HTMLElement>(this, 'sub-desc', ['label'])

  constructor() {
    super()
    this.heading = ''
    this.level = 3
    this.bordered = false
  }

  static override styles = [
    baseStyles,
    focusStyles,
    css`
      a {
        color: var(--sub-color-link);
        text-decoration: underline;
        text-underline-offset: 0.2em;
      }

      :host {
        display: block;
        font-family: var(--sub-font-sans);
        color: var(--sub-color-text);
      }

      h2,
      h3,
      h4,
      h5,
      h6 {
        margin: 0 0 var(--sub-space-3);
        font-size: var(--sub-text-lg);
      }

      dl {
        display: grid;
        gap: 0;
        margin: 0;
      }

      .row {
        display: grid;
        grid-template-columns: var(--sub-descriptions-label-width) minmax(0, 1fr);
        gap: var(--sub-space-1) var(--sub-descriptions-gap);
        padding-block: var(--sub-descriptions-gap);
        border-block-end: var(--sub-descriptions-border-width) solid var(--sub-color-border-subtle);
      }

      dt {
        color: var(--sub-color-muted);
        font-weight: var(--sub-weight-semibold);
      }

      dd {
        margin: 0;
        overflow-wrap: anywhere;
      }

      @container (inline-size < 30rem) {
        .row {
          grid-template-columns: minmax(0, 1fr);
        }
      }

      :host {
        inline-size: 100%; /* a container never shrink-wraps its content: fill the line (also inside a flex row) */
        container-type: inline-size;
      }
    `,
  ]

  protected override willUpdate(): void {
    // Each value is projected into its row, not copied: the author's own nodes (links, buttons, listeners) keep working
    // and the text exists once (find in page, screen readers, tests).
    this.#items.elements.forEach((el, i) => el.setAttribute('slot', `value-${i}`))
  }

  protected override render() {
    const tag = unsafeStatic(`h${Math.min(6, Math.max(2, this.level))}`)
    return html`${this.heading ? html`<${tag}>${this.heading}</${tag}>` : nothing}
      <dl part="list">
        ${this.#items.elements.map(
          (el, i) => html`<div class="row"><dt>${el.getAttribute('label')}</dt><dd><slot name=${`value-${i}`}></slot></dd></div>`,
        )}
      </dl>`
  }
}

/** One label/value pair of <sub-descriptions>: `<sub-desc label="Customer">Ana</sub-desc>`. Its content is the value. */
export class SubDesc extends LitElement {
  static override properties = { label: { type: String } }
  declare label: string
  constructor() {
    super()
    this.label = ''
  }
  static override styles = css`
    :host {
      display: contents;
    }
  `
  protected override render() {
    return html`<slot></slot>`
  }
}

export function defineDescriptions(): void {
  define('sub-desc', SubDesc)
  define('sub-descriptions', SubDescriptions)
}

declare global {
  interface HTMLElementTagNameMap {
    'sub-descriptions': SubDescriptions
    'sub-desc': SubDesc
  }
}
