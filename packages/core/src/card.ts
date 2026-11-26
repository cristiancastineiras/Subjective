import { LitElement, css, nothing } from 'lit'
import { html, unsafeStatic } from 'lit/static-html.js'
import { baseStyles } from './shared/styles'
import { define, warn } from './shared/utils'

/**
 * Card: a self-contained chunk of content (`<article>`) with an optional heading, `cover`,
 * `extra` (header actions) and `footer`. The heading level follows the page outline (`level`).
 * Do not make the whole card a click target with a script: put a real link in the heading or footer.
 */
export class SubCard extends LitElement {
  static override properties = {
    heading: { type: String },
    level: { type: Number },
  }

  declare heading: string
  declare level: number

  constructor() {
    super()
    this.heading = ''
    this.level = 3
  }

  static override styles = [
    baseStyles,
    css`
      :host {
        display: block;
        font-family: var(--sub-font-sans);
        color: var(--sub-color-text);
      }

      article {
        display: grid;
        gap: var(--sub-card-gap);
        padding: var(--sub-card-padding);
        border: var(--sub-card-border-width) solid var(--sub-color-border-subtle);
        border-radius: var(--sub-card-radius);
        background: var(--sub-color-surface);
      }

      header {
        display: flex;
        flex-wrap: wrap;
        gap: var(--sub-space-2) var(--sub-space-4);
        align-items: center;
        justify-content: space-between;
      }

      h2,
      h3,
      h4,
      h5,
      h6 {
        margin: 0;
        font-size: var(--sub-text-lg);
        font-weight: var(--sub-weight-bold);
        line-height: var(--sub-leading-snug);
      }

      .cover {
        margin: calc(var(--sub-card-padding) * -1) calc(var(--sub-card-padding) * -1) 0;
      }

      .cover:not(:has(::slotted(*))),
      footer:not(:has(::slotted(*))),
      .extra:not(:has(::slotted(*))) {
        display: none;
      }

      ::slotted([slot='cover']) {
        display: block;
        inline-size: 100%;
      }

      footer {
        padding-block-start: var(--sub-card-gap);
        border-block-start: var(--sub-card-border-width) solid var(--sub-color-border-subtle);
      }
    `,
  ]

  protected override firstUpdated(): void {
    if (!this.heading) warn('<sub-card> without "heading": add one so the card has a name in the outline.')
  }

  protected override render() {
    const tag = unsafeStatic(`h${Math.min(6, Math.max(2, this.level))}`)
    return html`<article part="card">
      <div class="cover"><slot name="cover"></slot></div>
      <header>
        ${this.heading ? html`<${tag}>${this.heading}</${tag}>` : nothing}
        <div class="extra"><slot name="extra"></slot></div>
      </header>
      <div class="body"><slot></slot></div>
      <footer><slot name="footer"></slot></footer>
    </article>`
  }
}

export function defineCard(): void {
  define('sub-card', SubCard)
}

declare global {
  interface HTMLElementTagNameMap {
    'sub-card': SubCard
  }
}
