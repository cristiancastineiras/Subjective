import { LitElement, css, html, nothing } from 'lit'
import { messages } from './shared/messages'
import { baseStyles, focusStyles, iconStyles, visuallyHidden } from './shared/styles'
import { define, warn } from './shared/utils'
import { iconOpenInNew } from './shared/material-icons'
import { routeLink } from './shared/navigate'

const VAGUE = /^(click here|here|read more|more|link)$/i

/**
 * Navigation link. Always underlined (colour alone fails colour-blind users), visited state
 * distinct, 2px focus ring. External links announce "(opens in a new tab)".
 * Use `<sub-button href>` when it must look like a button.
 * @fires {CustomEvent<{ href: string; url: string }>} sub-navigate - A link inside the component was clicked; cancelable: cancel it to route it yourself (see configure({ navigate }))
 */
export class SubLink extends LitElement {
  static override shadowRootOptions: ShadowRootInit = { mode: 'open', delegatesFocus: true }

  static override properties = {
    href: { type: String },
    external: { type: Boolean, reflect: true },
    download: { type: String },
  }

  declare href: string
  /** Opens in a new tab with `noopener noreferrer` and says so to assistive technology */
  declare external: boolean
  declare download: string

  constructor() {
    super()
    this.href = ''
    this.external = false
    this.download = ''
  }

  static override styles = [
    baseStyles,
    focusStyles,
    visuallyHidden,
    iconStyles,
    css`
      :host {
        display: inline;
      }

      a {
        color: var(--sub-color-link);
        text-decoration: underline;
        text-decoration-thickness: var(--sub-link-underline-thickness);
        text-underline-offset: var(--sub-link-underline-offset);
        border-radius: var(--sub-radius-sm);
        overflow-wrap: anywhere;
      }

      a:visited {
        color: var(--sub-color-link-visited);
      }

      /* Hover keeps the underline and makes it heavier (never removes it) */
      a:hover {
        color: var(--sub-color-link-hover);
        text-decoration-thickness: var(--sub-link-underline-thickness-hover);
      }

      .icon {
        inline-size: 1em;
        block-size: 1em;
        margin-inline-start: 0.25em;
        vertical-align: -0.125em;
      }
    `,
  ]

  protected override firstUpdated(): void {
    const text = this.textContent?.trim() ?? ''
    if (VAGUE.test(text)) warn(`<sub-link> text "${text}" is meaningless out of context. Describe the destination.`)
  }

  protected override render() {
    return html`<a
      href=${this.href || nothing}
      target=${this.external ? '_blank' : nothing}
      rel=${this.external ? 'noopener noreferrer' : nothing}
      download=${this.download || nothing}
      @click=${(e: MouseEvent) => routeLink(this, e)}
      ><slot></slot>${this.external
        ? html`<span class="sr-only"> ${messages.opensInNewTab}</span>${iconOpenInNew()}`
        : nothing}</a
    >`
  }
}

export function defineLink(): void {
  define('sub-link', SubLink)
}

declare global {
  interface HTMLElementTagNameMap {
    'sub-link': SubLink
  }
}
