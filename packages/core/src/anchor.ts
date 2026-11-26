import { LitElement, css, html, nothing } from 'lit'
import { moveFocus } from './focus'
import { ChildrenController } from './shared/children'
import { messages } from './shared/messages'
import { baseStyles, focusStyles } from './shared/styles'
import { define } from './shared/utils'

/**
 * In-page navigation ("On this page"): a `nav` of links to sections. The link of the section being read
 * gets `aria-current="location"` (bar + bold, not colour alone) via IntersectionObserver. Activating a
 * link jumps there AND moves keyboard focus to the target heading (a plain hash jump leaves focus behind).
 *
 *   <sub-anchor label="On this page"><a href="#intro">Introduction</a><a href="#api">API</a></sub-anchor>
 */
export class SubAnchor extends LitElement {
  static override properties = {
    label: { type: String },
    _current: { state: true },
  }

  declare label: string
  declare _current: string

  readonly #links = new ChildrenController<HTMLAnchorElement>(this, 'a', ['href'])
  #observer: IntersectionObserver | undefined

  constructor() {
    super()
    this.label = ''
    this._current = ''
  }

  static override styles = [
    baseStyles,
    focusStyles,
    css`
      :host {
        display: block;
        font-family: var(--sub-font-sans);
      }

      ul {
        display: grid;
        gap: var(--sub-anchor-gap);
        margin: 0;
        padding: 0;
        list-style: none;
      }

      a {
        display: flex;
        align-items: center;
        min-block-size: var(--sub-anchor-min-size);
        padding-inline: var(--sub-anchor-padding-inline);
        border-inline-start: var(--sub-anchor-indicator-width) solid var(--sub-color-border-subtle);
        color: var(--sub-color-link);
        text-decoration: underline;
        text-underline-offset: 0.2em;
      }

      a:hover {
        color: var(--sub-color-link-hover);
        text-decoration-thickness: 2px;
      }

      a[aria-current='location'] {
        border-inline-start-color: var(--sub-color-accent);
        background: var(--sub-color-accent-subtle);
        color: var(--sub-color-on-accent-subtle);
        font-weight: var(--sub-weight-bold);
      }
    `,
  ]

  override connectedCallback(): void {
    super.connectedCallback()
    void this.updateComplete.then(() => this.#observe())
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback()
    this.#observer?.disconnect()
  }

  #ids(): string[] {
    return this.#links.elements.map((a) => a.getAttribute('href') ?? '').filter((h) => h.startsWith('#')).map((h) => h.slice(1))
  }

  #observe(): void {
    this.#observer?.disconnect()
    if (typeof IntersectionObserver === 'undefined') return
    const root = this.getRootNode() as Document | ShadowRoot
    const visible = new Map<string, number>()
    this.#observer = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) visible.set(e.target.id, e.boundingClientRect.top)
          else visible.delete(e.target.id)
        }
        const first = [...visible].sort((a, b) => a[1] - b[1])[0]
        if (first) this._current = first[0]
      },
      { rootMargin: '0px 0px -60% 0px' },
    )
    for (const id of this.#ids()) {
      const target = root.getElementById(id)
      if (target) this.#observer.observe(target)
    }
  }

  #go(event: Event, href: string): void {
    const id = href.slice(1)
    const target = (this.getRootNode() as Document | ShadowRoot).getElementById(id)
    if (!target) return
    event.preventDefault()
    target.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' })
    moveFocus(target, { preventScroll: true })
    this._current = id
  }

  protected override render() {
    return html`<nav aria-label=${this.label || messages.onThisPage}>
      <ul>
        ${this.#links.elements.map((a) => {
          const href = a.getAttribute('href') ?? '#'
          return html`<li>
            <a href=${href} aria-current=${href.slice(1) === this._current ? 'location' : nothing} @click=${(e: Event) => this.#go(e, href)}>${a.textContent?.trim()}</a>
          </li>`
        })}
      </ul>
    </nav>`
  }
}

export function defineAnchor(): void {
  define('sub-anchor', SubAnchor)
}

declare global {
  interface HTMLElementTagNameMap {
    'sub-anchor': SubAnchor
  }
}
