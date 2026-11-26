import { LitElement, css, html } from 'lit'
import { baseStyles } from './shared/styles'
import { define, warn } from './shared/utils'

/**
 * Item of <sub-list>: `slot="start"` (avatar, icon), default content (title + description) and
 * `slot="end"` (actions, badges). Actions inside must be real controls with names.
 */
export class SubListItem extends LitElement {
  static override styles = [
    baseStyles,
    css`
      :host {
        display: block;
        font-family: var(--sub-font-sans);
        color: var(--sub-color-text);
      }

      .item {
        display: flex;
        gap: var(--sub-list-gap);
        align-items: center;
        padding: var(--sub-list-padding-block) var(--sub-list-padding-inline);
        border-block-end: var(--sub-list-border-width) solid var(--sub-color-border-subtle);
      }

      :host(:last-child) .item {
        border-block-end: 0;
      }

      .main {
        flex: 1;
        min-inline-size: 0;
      }

      .start:not(:has(::slotted(*))),
      .end:not(:has(::slotted(*))) {
        display: none;
      }

      .end {
        display: flex;
        flex-wrap: wrap;
        gap: var(--sub-target-gap);
        align-items: center;
      }
    `,
  ]

  override connectedCallback(): void {
    super.connectedCallback()
    this.setAttribute('role', 'listitem')
  }

  protected override render() {
    return html`<div class="item" part="item">
      <div class="start"><slot name="start"></slot></div>
      <div class="main"><slot></slot></div>
      <div class="end"><slot name="end"></slot></div>
    </div>`
  }
}

/** List of items (`role="list"` + name). `bordered` draws a frame; `item-layout` is up to the items. */
export class SubList extends LitElement {
  static override properties = {
    label: { type: String },
    bordered: { type: Boolean, reflect: true },
  }

  declare label: string
  declare bordered: boolean

  constructor() {
    super()
    this.label = ''
    this.bordered = false
  }

  static override styles = [
    baseStyles,
    css`
      :host {
        display: block;
      }

      :host([bordered]) {
        border: var(--sub-list-border-width) solid var(--sub-color-border-subtle);
        background: var(--sub-color-surface);
      }
    `,
  ]

  override connectedCallback(): void {
    super.connectedCallback()
    this.setAttribute('role', 'list')
  }

  protected override firstUpdated(): void {
    if (!this.label) warn('<sub-list> needs a "label".')
  }

  protected override updated(): void {
    if (this.label) this.setAttribute('aria-label', this.label)
  }

  protected override render() {
    return html`<slot></slot>`
  }
}

export function defineList(): void {
  define('sub-list-item', SubListItem)
  define('sub-list', SubList)
}

declare global {
  interface HTMLElementTagNameMap {
    'sub-list-item': SubListItem
    'sub-list': SubList
  }
}
