import { LitElement, css, html, nothing } from 'lit'
import { ChildrenController } from './shared/children'
import { messages } from './shared/messages'
import { baseStyles, focusStyles, iconStyles } from './shared/styles'
import { define, warn } from './shared/utils'
import { iconArrowBack, iconChevronRight } from './shared/material-icons'

/**
 * Breadcrumb trail for hierarchies of 3+ levels: Home > Category > Sub > Current.
 * Write the path as plain children; the LAST one is the current page (text, `aria-current="page"`,
 * should match the page's h1). On narrow containers only the parent shows: "<- Category".
 *
 *   <sub-breadcrumbs><a href="/">Home</a><a href="/shoes">Shoes</a><span>Running shoes</span></sub-breadcrumbs>
 */
export class SubBreadcrumbs extends LitElement {
  static override properties = {
    label: { type: String },
  }

  declare label: string

  readonly #items = new ChildrenController<HTMLElement>(this, 'a, span', ['href'])

  constructor() {
    super()
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
        font-size: var(--sub-breadcrumbs-font-size);
      }

      ol {
        display: flex;
        flex-wrap: wrap;
        gap: var(--sub-breadcrumbs-gap);
        align-items: center;
        margin: 0;
        padding: 0;
        list-style: none;
      }

      li {
        display: inline-flex;
        gap: var(--sub-space-1);
        align-items: center;
      }

      a {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: var(--sub-space-1);
        min-block-size: var(--sub-breadcrumbs-min-size);
        min-inline-size: var(--sub-breadcrumbs-min-size);
        color: var(--sub-color-link);
        text-decoration: underline;
        text-underline-offset: 0.2em;
        border-radius: var(--sub-radius-sm);
      }

      a:hover {
        color: var(--sub-color-link-hover);
        text-decoration-thickness: 2px;
      }

      [aria-current='page'] {
        color: var(--sub-color-text);
        font-weight: var(--sub-weight-semibold);
      }

      .sep {
        color: var(--sub-color-muted);
      }

      .sep .icon {
        inline-size: var(--sub-icon-sm);
        block-size: var(--sub-icon-sm);
      }

      .icon {
        inline-size: var(--sub-icon-sm);
        block-size: var(--sub-icon-sm);
      }

      .back {
        display: none;
      }

      @container (inline-size < 30rem) {
        ol {
          display: none;
        }

        .back {
          display: inline-flex;
        }
      }
    `,
  ]

  protected override updated(): void {
    // 0 items = still being filled (frameworks and routers often add the children after connecting): not a mistake yet
    const count = this.#items.elements.length
    if (count > 0 && count < 3) warn('<sub-breadcrumbs> is for hierarchies of 3+ levels.')
  }

  protected override render() {
    const items = this.#items.elements
    const parent = items.length > 1 ? items[items.length - 2] : undefined
    return html`<nav aria-label=${this.label || messages.breadcrumb}>
      <ol>
        ${items.map((el, i) => {
          const last = i === items.length - 1
          const text = el.textContent?.trim() ?? ''
          return html`<li>
            ${last
              ? html`<span aria-current="page">${text}</span>`
              : html`<a href=${el.getAttribute('href') ?? '#'}>${text}</a
                  ><span class="sep" aria-hidden="true">${iconChevronRight()}</span>`}
          </li>`
        })}
      </ol>
      ${parent
        ? html`<a class="back" href=${parent.getAttribute('href') ?? '#'}>${iconArrowBack()}${parent.textContent?.trim()}</a>`
        : nothing}
    </nav>`
  }
}

export function defineBreadcrumbs(): void {
  define('sub-breadcrumbs', SubBreadcrumbs)
}

declare global {
  interface HTMLElementTagNameMap {
    'sub-breadcrumbs': SubBreadcrumbs
  }
}
