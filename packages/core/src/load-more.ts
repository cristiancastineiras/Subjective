import { LitElement, css, html, nothing, type PropertyValues } from 'lit'
import { defineButton } from './button'
import { messages } from './shared/messages'
import { baseStyles, focusStyles } from './shared/styles'
import { define, emit } from './shared/utils'

/**
 * "Load more" for galleries, catalogues and filtered lists. Shows how much is loaded and how much
 * is left, one consistent phrase ("Load 20 more products (64 remaining)"), keeps focus on the
 * button while loading, and when the list is complete moves focus to the "all loaded" message.
 * Append the new items yourself on `sub-load`, then update `loaded` / `total` and clear `loading`.
 * @fires {CustomEvent<{ count: number }>} sub-load - Load more was pressed: how many items to show now
 */
export class SubLoadMore extends LitElement {
  static override properties = {
    loaded: { type: Number },
    total: { type: Number },
    batch: { type: Number },
    itemLabel: { type: String, attribute: 'item-label' },
    loading: { type: Boolean, reflect: true },
  }

  declare loaded: number
  declare total: number
  /** How many items one click loads */
  declare batch: number
  /** Plural noun for what loads: "products", "results" */
  declare itemLabel: string
  declare loading: boolean

  #hadFocus = false

  constructor() {
    super()
    this.loaded = 0
    this.total = 0
    this.batch = 20
    this.itemLabel = 'items'
    this.loading = false
  }

  static override styles = [
    baseStyles,
    focusStyles,
    css`
      :host {
        display: grid;
        gap: var(--sub-load-more-gap);
        justify-items: center;
        font-family: var(--sub-font-sans);
        color: var(--sub-color-text);
      }

      p {
        margin: 0;
        font-size: var(--sub-text-sm);
        color: var(--sub-color-muted);
      }

      progress {
        inline-size: min(100%, 16rem);
        block-size: var(--sub-load-more-progress-height);
        accent-color: var(--sub-color-accent);
      }
    `,
  ]

  get #remaining(): number {
    return Math.max(0, this.total - this.loaded)
  }

  protected override willUpdate(): void {
    this.#hadFocus = this.matches(':focus-within') || Boolean(this.shadowRoot?.activeElement)
  }

  protected override updated(_changed: PropertyValues): void {
    if (this.#remaining === 0 && this.#hadFocus) this.renderRoot.querySelector<HTMLElement>('#done')?.focus()
  }

  protected override render() {
    const next = Math.min(this.batch, this.#remaining)
    return html`<p id="count" aria-live="polite">${messages.showing(Math.min(1, this.loaded), this.loaded, this.total)}</p>
      <progress max=${this.total} value=${this.loaded} aria-label="${messages.showing(1, this.loaded, this.total)}"></progress>
      ${this.#remaining > 0
        ? html`<sub-button
            variant="secondary"
            ?loading=${this.loading}
            loading-label="Loading..."
            @click=${() => emit(this, 'sub-load', { count: next })}
            >${messages.loadMore(next)} ${this.itemLabel} (${messages.remaining(this.#remaining)})</sub-button
          >`
        : html`<p id="done" tabindex="-1">All ${this.total} ${this.itemLabel} loaded.</p>`}`
  }

  override connectedCallback(): void {
    super.connectedCallback()
    defineButton()
  }
}

export function defineLoadMore(): void {
  defineButton()
  define('sub-load-more', SubLoadMore)
}

declare global {
  interface HTMLElementTagNameMap {
    'sub-load-more': SubLoadMore
  }
}
