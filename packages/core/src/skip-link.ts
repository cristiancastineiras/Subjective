import { LitElement, css, html, nothing } from 'lit'
import { messages } from './shared/messages'
import { baseStyles, focusStyles } from './shared/styles'
import { define, focusElement } from './shared/utils'

/**
 * Skip link: the FIRST focusable element of the page; hidden until it receives keyboard focus,
 * then jumps to the main content (`href="#main"`) and moves focus there.
 */
export class SubSkipLink extends LitElement {
  static override shadowRootOptions: ShadowRootInit = { mode: 'open', delegatesFocus: true }

  static override properties = {
    href: { type: String },
  }

  declare href: string

  constructor() {
    super()
    this.href = '#main'
  }

  static override styles = [
    baseStyles,
    focusStyles,
    css`
      :host {
        display: contents;
      }

      a {
        position: fixed;
        inset-block-start: var(--sub-space-2);
        inset-inline-start: var(--sub-space-2);
        z-index: var(--sub-z-toast);
        padding: var(--sub-skip-link-padding-block) var(--sub-skip-link-padding-inline);
        border: var(--sub-skip-link-border-width) solid var(--sub-color-accent);
        border-radius: var(--sub-skip-link-radius);
        background: var(--sub-color-surface);
        color: var(--sub-color-link);
        font: var(--sub-weight-semibold) var(--sub-text-md) / var(--sub-leading-normal) var(--sub-font-sans);
        translate: 0 -200%;
      }

      a:focus-visible {
        translate: 0;
      }
    `,
  ]

  #onClick = (event: Event): void => {
    if (!this.href.startsWith('#')) return
    const target = (this.getRootNode() as Document | ShadowRoot).getElementById(this.href.slice(1))
    if (!target) return
    event.preventDefault()
    focusElement(target)
    target.scrollIntoView?.()
  }

  protected override render() {
    return html`<a href=${this.href || nothing} @click=${this.#onClick}><slot>${messages.skipToContent}</slot></a>`
  }
}

export function defineSkipLink(): void {
  define('sub-skip-link', SubSkipLink)
}

declare global {
  interface HTMLElementTagNameMap {
    'sub-skip-link': SubSkipLink
  }
}
