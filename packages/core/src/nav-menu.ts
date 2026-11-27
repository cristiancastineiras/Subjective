import { LitElement, css, html, nothing } from 'lit'
import { ChildrenController } from './shared/children'
import { baseStyles, focusInset, focusStyles, iconStyles } from './shared/styles'
import { define } from './shared/utils'
import { iconKeyboardArrowDown } from './shared/material-icons'
import { forwardClick } from './shared/navigate'

/**
 * Site / app navigation (SUB "Menu"). A `nav` of links with optional groups, using the disclosure
 * pattern (a button with `aria-expanded` reveals a nested list), NOT the ARIA `menu` role (that is for
 * application menus: see <sub-menu>). Mark the current page with `aria-current="page"` on its link.
 *
 *   <sub-nav-menu label="Main">
 *     <a href="/" aria-current="page">Dashboard</a>
 *     <sub-nav-group label="Reports"><a href="/sales">Sales</a></sub-nav-group>
 *   </sub-nav-menu>
 *
 * `orientation="horizontal"` lays the top level in a row. Tab walks links; Enter/Space opens a group.
 * @fires {CustomEvent<{ href: string; url: string }>} sub-navigate - A link inside the component was clicked; cancelable: cancel it to route it yourself (see configure({ navigate }))
 */
export class SubNavMenu extends LitElement {
  static override properties = {
    label: { type: String },
    orientation: { type: String, reflect: true },
    _open: { state: true },
  }

  declare label: string
  declare orientation: 'vertical' | 'horizontal'
  declare _open: Set<string>

  readonly #items = new ChildrenController<HTMLElement>(this, 'a, sub-nav-group', ['href', 'aria-current', 'label'])

  constructor() {
    super()
    this.label = ''
    this.orientation = 'vertical'
    this._open = new Set()
  }

  static override styles = [
    baseStyles,
    focusStyles,
    iconStyles,
    css`
      :host {
        display: block;
        font-family: var(--sub-font-sans);
      }

      ul {
        display: grid;
        gap: var(--sub-nav-menu-gap);
        margin: 0;
        padding: 0;
        list-style: none;
      }

      :host([orientation='horizontal']) > nav > ul {
        display: flex;
        flex-wrap: wrap;
        align-items: flex-start;
      }

      ul ul {
        margin-block-start: var(--sub-nav-menu-gap);
        padding-inline-start: var(--sub-nav-menu-indent);
      }

      a,
      button {
        display: flex;
        gap: var(--sub-space-2);
        align-items: center;
        justify-content: space-between;
        inline-size: 100%;
        min-block-size: var(--sub-nav-menu-min-size);
        padding-inline: var(--sub-nav-menu-padding-inline);
        border: 0;
        border-inline-start: var(--sub-nav-menu-indicator-width) solid transparent;
        border-radius: var(--sub-nav-menu-radius);
        background: transparent;
        color: var(--sub-color-text);
        font: var(--sub-weight-medium) var(--sub-text-md) / var(--sub-leading-normal) var(--sub-font-sans);
        text-align: start;
        text-decoration: none;
        cursor: pointer;
      }

      a:hover,
      button:hover {
        background: var(--sub-color-surface-hover);
      }

      a[aria-current='page'] {
        border-inline-start-color: var(--sub-color-accent);
        background: var(--sub-color-accent-subtle);
        color: var(--sub-color-on-accent-subtle);
        font-weight: var(--sub-weight-bold);
      }

      ${focusInset('a, button')}

      .chev {
        display: grid;
        transition: rotate var(--sub-duration-base) var(--sub-ease-standard);
      }

      [aria-expanded='true'] .chev {
        rotate: 180deg;
      }
    `,
  ]

  #link(a: HTMLElement) {
    return html`<a href=${a.getAttribute('href') ?? '#'} @click=${(e: MouseEvent) => forwardClick(this, e, a)} aria-current=${a.getAttribute('aria-current') ?? nothing}>${a.textContent?.trim()}</a>`
  }

  #toggle(id: string): void {
    const next = new Set(this._open)
    next.has(id) ? next.delete(id) : next.add(id)
    this._open = next
  }

  protected override render() {
    return html`<nav aria-label=${this.label}>
      <ul>
        ${this.#items.elements.map((el, i) => {
          if (el.localName !== 'sub-nav-group') return html`<li>${this.#link(el)}</li>`
          const links = [...el.querySelectorAll<HTMLElement>(':scope > a')]
          const id = `g${i}`
          // A group that contains the current page starts open
          const open = this._open.has(id) || links.some((a) => a.getAttribute('aria-current') === 'page')
          return html`<li>
            <button type="button" aria-expanded=${open ? 'true' : 'false'} aria-controls=${id} @click=${() => this.#toggle(id)}>
              <span>${el.getAttribute('label')}</span><span class="chev">${iconKeyboardArrowDown()}</span>
            </button>
            <ul id=${id} ?hidden=${!open}>
              ${links.map((a) => html`<li>${this.#link(a)}</li>`)}
            </ul>
          </li>`
        })}
      </ul>
    </nav>`
  }
}

/** Group of links inside <sub-nav-menu>. Renders nothing itself (the menu draws the disclosure). */
export class SubNavGroup extends LitElement {
  static override properties = { label: { type: String } }
  declare label: string
  constructor() {
    super()
    this.label = ''
  }
  static override styles = css`
    :host {
      display: none;
    }
  `
  protected override render() {
    return nothing
  }
}

export function defineNavMenu(): void {
  define('sub-nav-group', SubNavGroup)
  define('sub-nav-menu', SubNavMenu)
}

declare global {
  interface HTMLElementTagNameMap {
    'sub-nav-menu': SubNavMenu
    'sub-nav-group': SubNavGroup
  }
}
