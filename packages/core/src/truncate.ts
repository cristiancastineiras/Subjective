import { LitElement, css, html, nothing } from 'lit'
import { messages } from './shared/messages'
import { baseStyles, focusStyles } from './shared/styles'
import { define } from './shared/utils'
import { defineTooltip } from './tooltip'

/**
 * Overflowing text with a way to read all of it. The full text always stays in the DOM (screen
 * readers, find-in-page and copy get all of it): truncation is only visual.
 *
 *  - `lines="1"` (default): ellipsis; when truncated the text becomes focusable and a tooltip shows
 *    the full text on hover AND keyboard focus.
 *  - `lines="3"`: line clamp + a real "Show more / Show less" button when it overflows.
 *
 * Use only for short labels in constrained places (table cells, cards). Body copy should wrap.
 */
export class SubTruncate extends LitElement {
  static override shadowRootOptions: ShadowRootInit = { mode: 'open', delegatesFocus: true }

  static override properties = {
    lines: { type: Number },
    _truncated: { state: true },
    _expanded: { state: true },
  }

  declare lines: number
  declare _truncated: boolean
  declare _expanded: boolean

  #observer: ResizeObserver | undefined
  #mutations: MutationObserver | undefined

  constructor() {
    super()
    this.lines = 1
    this._truncated = false
    this._expanded = false
  }

  static override styles = [
    baseStyles,
    focusStyles,
    css`
      :host {
        display: block;
        min-inline-size: 0;
        font-family: var(--sub-font-sans);
        color: inherit;
      }

      .text {
        line-height: var(--sub-truncate-line-height);
        overflow-wrap: anywhere;
      }

      .text[data-lines='1'] {
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .text[data-clamp] {
        display: -webkit-box;
        -webkit-box-orient: vertical;
        -webkit-line-clamp: var(--_lines);
        line-clamp: var(--_lines);
        overflow: hidden;
      }

      button {
        min-block-size: var(--sub-target-size);
        padding: 0 var(--sub-space-2);
        margin-inline-start: calc(var(--sub-space-2) * -1);
        border: 0;
        background: transparent;
        color: var(--sub-color-link);
        font: var(--sub-weight-semibold) var(--sub-text-md) / var(--sub-leading-normal) var(--sub-font-sans);
        text-decoration: underline;
        text-underline-offset: 0.2em;
        cursor: pointer;
      }

      @media (forced-colors: active) {
        button {
          color: LinkText;
        }
      }
    `,
  ]

  override connectedCallback(): void {
    super.connectedCallback()
    defineTooltip()
    this.#mutations = new MutationObserver(() => this.#measure())
    this.#mutations.observe(this, { childList: true, characterData: true, subtree: true })
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback()
    this.#observer?.disconnect()
    this.#mutations?.disconnect()
  }

  protected override firstUpdated(): void {
    const el = this.renderRoot.querySelector('.text')
    if (el) {
      this.#observer = new ResizeObserver(() => this.#measure())
      this.#observer.observe(el)
    }
    this.#measure()
  }

  #measure(): void {
    const el = this.renderRoot.querySelector<HTMLElement>('.text')
    if (!el) return
    if (this._expanded) return // measuring an expanded block would say "not truncated" and hide the button
    this._truncated = this.lines <= 1 ? el.scrollWidth > el.clientWidth + 1 : el.scrollHeight > el.clientHeight + 1
  }

  protected override render() {
    const multi = this.lines > 1
    const text = this.textContent?.trim() ?? ''
    return html`<div
        id="text"
        class="text"
        part="text"
        data-lines=${multi ? 'n' : '1'}
        ?data-clamp=${multi && !this._expanded}
        style=${`--_lines:${this.lines}`}
        tabindex=${this._truncated && !multi ? '0' : nothing}
      >
        <slot @slotchange=${() => this.#measure()}></slot>
      </div>
      ${this._truncated && !multi ? html`<sub-tooltip for="text" decorative>${text}</sub-tooltip>` : nothing}
      ${multi && (this._truncated || this._expanded)
        ? html`<button type="button" aria-expanded=${this._expanded ? 'true' : 'false'} @click=${() => (this._expanded = !this._expanded)}>
            ${this._expanded ? messages.showLess : messages.showMore}
          </button>`
        : nothing}`
  }
}

export function defineTruncate(): void {
  defineTooltip()
  define('sub-truncate', SubTruncate)
}

declare global {
  interface HTMLElementTagNameMap {
    'sub-truncate': SubTruncate
  }
}
