import { LitElement, css, nothing } from 'lit'
import { html, unsafeStatic } from 'lit/static-html.js'
import { baseStyles } from './shared/styles'
import { define } from './shared/utils'

/**
 * Application shell (SUB "Layout"): `header`, `sider` (navigation), default (content), `footer`.
 * Real landmarks by default (`header`, `main`, `footer`): one per page. Set `embedded` when the shell
 * lives inside another page region (a preview, a widget) so it adds no duplicate landmarks.
 * Below ~40rem of its own width the sider stacks above the content. The first control inside
 * `main` is reachable after a skip link that targets `#main`.
 */
export class SubLayout extends LitElement {
  static override properties = {
    embedded: { type: Boolean, reflect: true },
    siderOpen: { type: Boolean, attribute: 'sider-open', reflect: true },
  }

  declare embedded: boolean
  /** Show/hide the sider (e.g. from a menu button) */
  declare siderOpen: boolean

  constructor() {
    super()
    this.embedded = false
    this.siderOpen = true
  }

  static override styles = [
    baseStyles,
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

      @container (inline-size < 40rem) {
        .body {
          grid-template-columns: minmax(0, 1fr);
        }

        .sider {
          border-inline-end: 0;
          border-block-end: var(--sub-shell-border-width) solid var(--sub-color-border-subtle);
        }
      }
    `,
  ]

  protected override render() {
    const embedded = this.embedded
    const header = unsafeStatic(embedded ? 'div' : 'header')
    const main = unsafeStatic(embedded ? 'div' : 'main')
    const footer = unsafeStatic(embedded ? 'div' : 'footer')
    return html`<div class="layout" part="layout">
      <${header} class="header" part="header"><slot name="header"></slot></${header}>
      <div class="body">
        <div class="sider" part="sider"><slot name="sider"></slot></div>
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
