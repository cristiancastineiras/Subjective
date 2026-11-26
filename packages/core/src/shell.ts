import { LitElement, css, nothing } from 'lit'
import { html, unsafeStatic } from 'lit/static-html.js'
import { iconMenu } from './shared/material-icons'
import { messages } from './shared/messages'
import { baseStyles, focusStyles, iconStyles } from './shared/styles'
import { define } from './shared/utils'

/**
 * Application shell (SUB "Layout"): `header`, `sider` (navigation), default (content), `footer`.
 * Real landmarks by default (`header`, `main`, `footer`): one per page. Set `embedded` when the shell
 * lives inside another page region (a preview, a widget) so it adds no duplicate landmarks.
 * Below 40rem of its own width (a phone) the sider folds behind a "Menu" button in the header (a disclosure:
 * `aria-expanded`, Esc closes it and returns focus to the button, following a link folds it again) and
 * opens above the content. The first control inside `main` is reachable after a skip link that targets `#main`.
 */
export class SubLayout extends LitElement {
  static override properties = {
    embedded: { type: Boolean, reflect: true },
    siderOpen: { type: Boolean, attribute: 'sider-open', reflect: true },
    _navOpen: { state: true },
    _hasSider: { state: true },
  }

  declare embedded: boolean
  /** Show/hide the sider (e.g. from a menu button) */
  declare siderOpen: boolean
  /** Narrow screens: the sider is shown (the Menu button is pressed) */
  declare _navOpen: boolean
  declare _hasSider: boolean

  constructor() {
    super()
    this.embedded = false
    this.siderOpen = true
    this._navOpen = false
    this._hasSider = false
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
        background: var(--sub-color-page);
      }

      .layout {
        display: grid;
        grid-template-rows: auto minmax(0, 1fr) auto;
        min-block-size: 100%;
      }

      .header {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: var(--sub-space-3) var(--sub-space-6);
        min-block-size: var(--sub-shell-header-height);
        padding-inline: var(--sub-shell-padding);
        border-block-end: var(--sub-shell-border-width) solid var(--sub-color-border);
        background: var(--sub-color-surface);
      }

      .body {
        display: grid;
        grid-template-columns: var(--sub-shell-sider-width) minmax(0, 1fr);
        min-block-size: 0;
      }

      :host(:not([sider-open])) .body {
        grid-template-columns: minmax(0, 1fr);
      }

      :host(:not([sider-open])) .sider {
        display: none;
      }

      .sider {
        padding: var(--sub-shell-padding);
        border-inline-end: var(--sub-shell-border-width) solid var(--sub-color-border-subtle);
        background: var(--sub-color-surface);
        overflow: auto;
      }

      .content {
        min-inline-size: 0;
        padding: var(--sub-shell-padding);
      }

      .content:focus {
        outline: none;
      }

      .footer {
        padding: var(--sub-space-3) var(--sub-shell-padding);
        border-block-start: var(--sub-shell-border-width) solid var(--sub-color-border-subtle);
        background: var(--sub-color-surface);
        color: var(--sub-color-muted);
        font-size: var(--sub-text-sm);
      }

      .header:not(:has(::slotted(*))),
      .footer:not(:has(::slotted(*))) {
        display: none;
      }

      .nav-toggle {
        display: none;
        gap: var(--sub-space-2);
        align-items: center;
        min-block-size: var(--sub-target-size);
        padding: 0 var(--sub-space-3);
        border: var(--sub-control-border-width) solid var(--sub-color-border);
        border-radius: var(--sub-control-radius);
        background: var(--sub-color-surface);
        color: var(--sub-color-text);
        font: var(--sub-weight-semibold) var(--sub-text-md) / 1 var(--sub-font-sans);
        cursor: pointer;
      }

      .nav-toggle[aria-expanded='true'] {
        background: var(--sub-color-accent-subtle);
        color: var(--sub-color-on-accent-subtle);
      }

      @container (inline-size < 40rem) {
        .body {
          grid-template-columns: minmax(0, 1fr);
        }

        /* the navigation folds behind the Menu button */
        :host .header.with-nav {
          display: flex;
        }

        .with-nav .nav-toggle {
          display: inline-flex;
        }

        .sider {
          display: none;
          border-inline-end: 0;
          border-block-end: var(--sub-shell-border-width) solid var(--sub-color-border-subtle);
        }

        :host .sider[data-open] {
          display: block;
        }
      }
    `,
  ]

  #toggle = (): void => {
    this._navOpen = !this._navOpen
  }

  /** Narrow screens: following a link in the navigation folds it (the page changed) */
  #onSiderClick = (event: Event): void => {
    if (this._navOpen && event.composedPath().some((n) => n instanceof HTMLAnchorElement && n.hasAttribute('href'))) this._navOpen = false
  }

  #onSiderKey = (event: KeyboardEvent): void => {
    if (event.key !== 'Escape' || !this._navOpen) return
    event.stopPropagation()
    this._navOpen = false
    this.renderRoot.querySelector<HTMLElement>('.nav-toggle')?.focus()
  }

  #onSiderSlot = (event: Event): void => {
    this._hasSider = (event.target as HTMLSlotElement).assignedElements().length > 0
  }

  protected override render() {
    const embedded = this.embedded
    const header = unsafeStatic(embedded ? 'div' : 'header')
    const main = unsafeStatic(embedded ? 'div' : 'main')
    const footer = unsafeStatic(embedded ? 'div' : 'footer')
    return html`<div class="layout" part="layout">
      <${header} class="header ${this._hasSider ? 'with-nav' : ''}" part="header">
        <button class="nav-toggle" part="nav-toggle" type="button" aria-expanded=${this._navOpen ? 'true' : 'false'} aria-controls="sider" @click=${this.#toggle}>
          ${iconMenu()}<span>${messages.navigationMenu}</span>
        </button>
        <slot name="header"></slot>
      </${header}>
      <div class="body">
        <div class="sider" id="sider" part="sider" ?data-open=${this._navOpen} @click=${this.#onSiderClick} @keydown=${this.#onSiderKey}>
          <slot name="sider" @slotchange=${this.#onSiderSlot}></slot>
        </div>
        <${main} class="content" part="content" id=${embedded ? nothing : 'main'} tabindex=${embedded ? nothing : '-1'}><slot></slot></${main}>
      </div>
      <${footer} class="footer" part="footer"><slot name="footer"></slot></${footer}>
    </div>`
  }
}

export function defineShell(): void {
  define('sub-layout', SubLayout)
}

declare global {
  interface HTMLElementTagNameMap {
    'sub-layout': SubLayout
  }
}
