import { LitElement, css, html, nothing } from 'lit'
import { messages } from './shared/messages'
import { baseStyles, focusStyles, iconStyles } from './shared/styles'
import { define, emit } from './shared/utils'
import { iconChevronLeft, iconChevronRight } from './shared/material-icons'
import { routeLink } from './shared/navigate'

type Slot = number | 'gap'

/** Page numbers to show: first, last, current +/- siblings, with gaps */
export function pageWindow(page: number, pages: number, siblings: number): Slot[] {
  const want = new Set([1, pages, page])
  for (let i = 1; i <= siblings; i++) {
    want.add(page - i)
    want.add(page + i)
  }
  const sorted = [...want].filter((n) => n >= 1 && n <= pages).sort((a, b) => a - b)
  const out: Slot[] = []
  sorted.forEach((n, i) => {
    const prev = sorted[i - 1]
    if (prev !== undefined && n - prev === 2) out.push(n - 1)
    else if (prev !== undefined && n - prev > 2) out.push('gap')
    out.push(n)
  })
  return out
}

/**
 * Pagination for goal-driven, structured, shareable content (results, docs, tables).
 * Always tells where you are: "Page 3 of 24" and, with `total-items`/`page-size`, "Showing 41-60 of 247".
 * Navigation = links when `href-template` is set (`?page={page}`), buttons otherwise.
 * On narrow containers: Previous, "Page x of y", Next.
 * @fires {CustomEvent<{ href: string; url: string }>} sub-navigate - A link inside the component was clicked; cancelable: cancel it to route it yourself (see configure({ navigate }))
 * @fires {CustomEvent<{ page: number }>} sub-page-change - A page was requested; cancelable (an SPA routes it itself)
 */
export class SubPagination extends LitElement {
  static override shadowRootOptions: ShadowRootInit = { mode: 'open', delegatesFocus: true }

  static override properties = {
    page: { type: Number, reflect: true },
    pages: { type: Number },
    siblings: { type: Number },
    hrefTemplate: { type: String, attribute: 'href-template' },
    totalItems: { type: Number, attribute: 'total-items' },
    pageSize: { type: Number, attribute: 'page-size' },
    label: { type: String },
  }

  declare page: number
  /** Total number of pages */
  declare pages: number
  declare siblings: number
  declare hrefTemplate: string
  declare totalItems: number
  declare pageSize: number
  declare label: string

  constructor() {
    super()
    this.page = 1
    this.pages = 1
    this.siblings = 1
    this.hrefTemplate = ''
    this.totalItems = 0
    this.pageSize = 0
    this.label = ''
  }

  static override styles = [
    baseStyles,
    focusStyles,
    iconStyles,
    css`
      :host {
        display: block;
        inline-size: 100%; /* a container never shrink-wraps its content: fill the line (also inside a flex row) */
        container-type: inline-size;
        font-family: var(--sub-font-sans);
        color: var(--sub-color-text);
      }

      nav {
        display: grid;
        gap: var(--sub-space-3);
        justify-items: center;
      }

      .summary {
        margin: 0;
        font-size: var(--sub-text-sm);
        color: var(--sub-color-muted);
      }

      ul {
        display: flex;
        flex-wrap: wrap;
        gap: var(--sub-pagination-gap);
        align-items: center;
        justify-content: center;
        margin: 0;
        padding: 0;
        list-style: none;
      }

      .item {
        display: inline-flex;
        gap: var(--sub-space-1);
        align-items: center;
        justify-content: center;
        min-block-size: var(--sub-pagination-min-size);
        min-inline-size: var(--sub-pagination-min-size);
        padding: var(--sub-control-padding-block) var(--sub-pagination-padding-inline);
        border: var(--sub-pagination-border-width) solid transparent;
        border-radius: var(--sub-pagination-radius);
        background: transparent;
        color: var(--sub-color-text);
        font: var(--sub-weight-medium) var(--sub-pagination-font-size) / var(--sub-leading-normal) var(--sub-font-sans);
        text-decoration: none;
        cursor: pointer;
        touch-action: manipulation;
      }

      @media (hover: hover) {
        .item:hover:not([aria-current], :disabled) {
          background: var(--sub-color-surface-hover);
        }
      }

      /* Current page: filled + bold + aria-current */
      .item[aria-current='page'] {
        border-color: var(--sub-color-accent);
        background: var(--sub-color-accent);
        color: var(--sub-color-on-accent);
        font-weight: var(--sub-weight-bold);
        cursor: default;
      }

      .item:disabled {
        color: var(--sub-color-on-disabled);
        cursor: not-allowed;
      }

      .gap {
        min-inline-size: var(--sub-pagination-min-size);
        text-align: center;
        color: var(--sub-color-muted);
      }

      @container (inline-size < 36rem) {
        .num {
          display: none;
        }
      }
    `,
  ]

  #href(n: number): string {
    return this.hrefTemplate.replace('{page}', String(n))
  }

  #go(event: Event, n: number): void {
    if (n === this.page) return
    // Cancelable so an SPA can intercept link navigation
    const proceed = emit(this, 'sub-page-change', { page: n }, { cancelable: true })
    if (!proceed) event.preventDefault()
    else if (!this.hrefTemplate) this.page = n
    else routeLink(this, event as MouseEvent) // a link: offered to the app's router (sub-navigate)
  }

  #control(n: number, content: unknown, opts: { current?: boolean; disabled?: boolean; name?: string; cls?: string } = {}) {
    const cls = `item ${opts.cls ?? ''}`
    if (this.hrefTemplate && !opts.disabled) {
      return html`<a
        class=${cls}
        href=${this.#href(n)}
        aria-label=${opts.name ?? nothing}
        aria-current=${opts.current ? 'page' : nothing}
        @click=${(e: Event) => this.#go(e, n)}
        >${content}</a
      >`
    }
    return html`<button
      class=${cls}
      type="button"
      aria-label=${opts.name ?? nothing}
      aria-current=${opts.current ? 'page' : nothing}
      ?disabled=${opts.disabled}
      @click=${(e: Event) => this.#go(e, n)}
    >
      ${content}
    </button>`
  }

  protected override render() {
    const total = Math.max(1, this.pages)
    const page = Math.min(Math.max(1, this.page), total)
    const from = this.pageSize ? (page - 1) * this.pageSize + 1 : 0
    const to = this.pageSize && this.totalItems ? Math.min(page * this.pageSize, this.totalItems) : 0
    return html`<nav aria-label=${this.label || messages.pagination}>
      <p class="summary" aria-live="polite">
        ${messages.pageOf(page, total)}${this.totalItems && this.pageSize ? html` &middot; ${messages.showing(from, to, this.totalItems)}` : nothing}
      </p>
      <ul>
        <li>${this.#control(page - 1, html`${iconChevronLeft()}${messages.previous}`, { disabled: page <= 1 })}</li>
        ${pageWindow(page, total, this.siblings).map((s) =>
          s === 'gap'
            ? html`<li class="num gap" aria-hidden="true">&hellip;</li>`
            : html`<li class="num">${this.#control(s, String(s), { current: s === page, name: `Page ${s}` })}</li>`,
        )}
        <li>${this.#control(page + 1, html`${messages.next}${iconChevronRight()}`, { disabled: page >= total })}</li>
      </ul>
    </nav>`
  }
}

export function definePagination(): void {
  define('sub-pagination', SubPagination)
}

declare global {
  interface HTMLElementTagNameMap {
    'sub-pagination': SubPagination
  }
}
