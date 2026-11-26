import { LitElement, css, nothing } from 'lit'
import { html, unsafeStatic } from 'lit/static-html.js'
import { icons } from './shared/icons'
import { messages } from './shared/messages'
import { baseStyles, focusInset, focusStyles, iconStyles, visuallyHidden } from './shared/styles'
import { define, emit, warn } from './shared/utils'

/**
 * One accordion section: `<h{level}><button aria-expanded>` + a `region` panel. The whole header is
 * the target, the chevron sits next to the label. The panel is `hidden="until-found"` so
 * find-in-page can open it. Never collapse critical information by default.
 */
export class SubAccordionItem extends LitElement {
  static override shadowRootOptions: ShadowRootInit = { mode: 'open', delegatesFocus: true }

  static override properties = {
    heading: { type: String },
    level: { type: Number },
    open: { type: Boolean, reflect: true },
    invalid: { type: Boolean, reflect: true },
  }

  /** Header text: descriptive, under 10 words, self-explanatory ("Notification settings", not "More") */
  declare heading: string
  /** Heading level (2-6) matching the page outline */
  declare level: number
  declare open: boolean
  /** Section contains an error: adds an icon and "contains an error" to the accessible name */
  declare invalid: boolean

  constructor() {
    super()
    this.heading = ''
    this.level = 3
    this.open = false
    this.invalid = false
  }

  static override styles = [
    baseStyles,
    focusStyles,
    visuallyHidden,
    iconStyles,
    css`
      :host {
        display: block;
        border-block-end: var(--sub-accordion-border-width) solid var(--sub-color-border-subtle);
        font-family: var(--sub-font-sans);
        color: var(--sub-color-text);
      }

      h2,
      h3,
      h4,
      h5,
      h6 {
        margin: 0;
        font-size: inherit;
        font-weight: inherit;
      }

      button {
        display: flex;
        gap: var(--sub-accordion-gap);
        align-items: center;
        inline-size: 100%;
        min-block-size: var(--sub-accordion-min-size);
        padding: var(--sub-accordion-padding-block) var(--sub-accordion-padding-inline);
        border: 0;
        background: transparent;
        color: inherit;
        font: var(--sub-weight-semibold) var(--sub-accordion-font-size) / var(--sub-leading-snug) var(--sub-font-sans);
        text-align: start;
        cursor: pointer;
        touch-action: manipulation;
      }

      @media (hover: hover) {
        button:hover {
          background: var(--sub-color-surface-hover);
        }
      }

      ${focusInset('button')}

      /* Chevron right = closed, down = open: it rotates, so the shape changes (not colour) */
      .chevron {
        display: grid;
        transition: rotate var(--sub-duration-base) var(--sub-ease-standard);
        rotate: -90deg;
      }

      [aria-expanded='true'] .chevron {
        rotate: 0deg;
      }

      .invalid {
        color: var(--sub-color-danger);
      }

      .panel {
        padding: var(--sub-accordion-panel-padding-block) var(--sub-accordion-padding-inline) var(--sub-space-4) calc(var(--sub-accordion-padding-inline) + var(--sub-icon-md) + var(--sub-accordion-gap));
      }

    `,
  ]

  protected override firstUpdated(): void {
    if (!this.heading) warn('<sub-accordion-item> needs a "heading".')
  }

  toggle(force?: boolean): void {
    const next = force ?? !this.open
    if (next === this.open) return
    this.open = next
    emit(this, 'sub-toggle', { open: next })
  }

  protected override render() {
    const tag = unsafeStatic(`h${Math.min(6, Math.max(2, this.level))}`)
    return html`<${tag}>
        <button
          id="trigger"
          type="button"
          aria-expanded=${this.open ? 'true' : 'false'}
          aria-controls="panel"
          @click=${() => this.toggle()}
        >
          <span class="chevron">${icons.chevronDown()}</span>
          <span>${this.heading}${this.invalid ? html`<span class="sr-only"> - contains an error</span>` : nothing}</span>
          ${this.invalid ? html`<span class="invalid">${icons.error()}</span>` : nothing}
        </button>
      </${tag}>
      <div
        id="panel"
        class="panel"
        role="region"
        aria-labelledby="trigger"
        .hidden=${this.open ? false : 'until-found'}
        @beforematch=${() => this.toggle(true)}
      >
        <slot></slot>
      </div>`
  }
}

/**
 * Group of <sub-accordion-item>. Default: several can be open (FAQ). `exclusive`: one at a time.
 * `expand-all` adds "Expand all / Collapse all" above the list (label flips, `aria-expanded` synced).
 */
export class SubAccordion extends LitElement {
  static override properties = {
    exclusive: { type: Boolean },
    expandAll: { type: Boolean, attribute: 'expand-all' },
    _allOpen: { state: true },
  }

  declare exclusive: boolean
  declare expandAll: boolean
  declare _allOpen: boolean

  constructor() {
    super()
    this.exclusive = false
    this.expandAll = false
    this._allOpen = false
  }

  static override styles = [
    baseStyles,
    focusStyles,
    css`
      :host {
        display: block;
        border-block-start: var(--sub-accordion-border-width) solid var(--sub-color-border-subtle);
        font-family: var(--sub-font-sans);
      }

      .all {
        display: flex;
        justify-content: flex-end;
        padding-block: var(--sub-space-1);
      }

      .all button {
        min-block-size: var(--sub-target-size);
        padding: var(--sub-space-2) var(--sub-space-3);
        border: 0;
        border-radius: var(--sub-radius-md);
        background: transparent;
        color: var(--sub-color-accent);
        font: var(--sub-weight-semibold) var(--sub-text-md) / var(--sub-leading-normal) var(--sub-font-sans);
        cursor: pointer;
      }

      @media (hover: hover) {
        .all button:hover {
          background: var(--sub-color-surface-hover);
        }
      }
    `,
  ]

  override connectedCallback(): void {
    super.connectedCallback()
    this.addEventListener('sub-toggle', this.#onToggle)
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback()
    this.removeEventListener('sub-toggle', this.#onToggle)
  }

  get #items(): SubAccordionItem[] {
    return [...this.querySelectorAll<SubAccordionItem>(':scope > sub-accordion-item')]
  }

  #sync = (): void => {
    const items = this.#items
    this._allOpen = items.length > 0 && items.every((i) => i.open)
  }

  #onToggle = (event: Event): void => {
    const item = event.target as SubAccordionItem
    if (this.exclusive && item.open) for (const other of this.#items) if (other !== item) other.open = false
    this.#sync()
  }

  #setAll = (): void => {
    const open = !this._allOpen
    for (const item of this.#items) item.toggle(open)
    this.#sync()
  }

  protected override firstUpdated(): void {
    this.#sync()
  }

  protected override render() {
    return html`${this.expandAll && !this.exclusive
        ? html`<div class="all">
            <button type="button" aria-expanded=${this._allOpen ? 'true' : 'false'} @click=${this.#setAll}>
              ${this._allOpen ? messages.collapseAll : messages.expandAll}
            </button>
          </div>`
        : nothing}<slot @slotchange=${this.#sync}></slot>`
  }
}

export function defineAccordion(): void {
  define('sub-accordion-item', SubAccordionItem)
  define('sub-accordion', SubAccordion)
}

declare global {
  interface HTMLElementTagNameMap {
    'sub-accordion-item': SubAccordionItem
    'sub-accordion': SubAccordion
  }
}
