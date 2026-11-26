import { LitElement, css, html, nothing } from 'lit'
import { announce } from './announce'
import { icons } from './shared/icons'
import { messages } from './shared/messages'
import { baseStyles, focusStyles, iconStyles } from './shared/styles'
import { define } from './shared/utils'

export type TextTone = 'default' | 'muted' | 'danger' | 'success' | 'warning' | 'info'

/**
 * Inline text with the right element for the job: `code` -> <code>, `mark` -> <mark>, `strike` -> <del>.
 * `tone` is never the only signal for meaning (add words). `copyable` adds a labelled copy button.
 * For long-form copy use <sub-prose>; for headings <sub-heading>; to clip use <sub-truncate>.
 */
export class SubText extends LitElement {
  static override properties = {
    tone: { type: String, reflect: true },
    size: { type: String, reflect: true },
    strong: { type: Boolean, reflect: true },
    code: { type: Boolean },
    mark: { type: Boolean },
    strike: { type: Boolean },
    copyable: { type: Boolean },
  }

  declare tone: TextTone
  declare size: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  declare strong: boolean
  declare code: boolean
  declare mark: boolean
  declare strike: boolean
  declare copyable: boolean

  constructor() {
    super()
    this.tone = 'default'
    this.size = 'md'
    this.strong = false
    this.code = false
    this.mark = false
    this.strike = false
    this.copyable = false
  }

  static override styles = [
    baseStyles,
    focusStyles,
    iconStyles,
    css`
      :host {
        display: inline;
        font-family: var(--sub-font-sans);
        font-size: var(--sub-text-md);
        color: var(--sub-color-text);
      }

      :host([size='xs']) {
        font-size: var(--sub-text-xs);
      }
      :host([size='sm']) {
        font-size: var(--sub-text-sm);
      }
      :host([size='lg']) {
        font-size: var(--sub-text-lg);
      }
      :host([size='xl']) {
        font-size: var(--sub-text-xl);
      }
      :host([strong]) {
        font-weight: var(--sub-weight-bold);
      }
      :host([tone='muted']) {
        color: var(--sub-color-muted);
      }
      :host([tone='danger']) {
        color: var(--sub-color-danger);
      }
      :host([tone='success']) {
        color: var(--sub-color-success);
      }
      :host([tone='warning']) {
        color: var(--sub-color-warning);
      }
      :host([tone='info']) {
        color: var(--sub-color-info);
      }

      code {
        padding-inline: var(--sub-text-code-padding-inline);
        border-radius: var(--sub-text-code-radius);
        background: var(--sub-color-surface-sunken);
        color: var(--sub-color-text);
        font-family: var(--sub-font-mono);
        font-size: 0.9em;
      }

      mark {
        background: var(--sub-color-warning-subtle);
        color: var(--sub-color-text);
        outline: 1px solid var(--sub-color-warning);
      }

      button {
        display: inline-grid;
        place-items: center;
        inline-size: var(--sub-target-size);
        block-size: var(--sub-target-size);
        margin-block: calc((var(--sub-target-size) - 1.5em) / -2);
        padding: 0;
        border: 0;
        border-radius: var(--sub-control-radius);
        background: transparent;
        color: var(--sub-color-link);
        vertical-align: middle;
        cursor: pointer;
      }
    `,
  ]

  async #copy(): Promise<void> {
    try {
      await navigator.clipboard.writeText(this.textContent?.trim() ?? '')
      announce(messages.copied)
    } catch {
      announce('Copy is not available here.')
    }
  }

  protected override render() {
    const body = this.code
      ? html`<code><slot></slot></code>`
      : this.mark
        ? html`<mark><slot></slot></mark>`
        : this.strike
          ? html`<del><slot></slot></del>`
          : html`<slot></slot>`
    return html`${body}${this.copyable
      ? html`<button type="button" aria-label=${messages.copy} @click=${() => void this.#copy()}>${icons.content_copy()}</button>`
      : nothing}`
  }
}

export function defineText(): void {
  define('sub-text', SubText)
}

declare global {
  interface HTMLElementTagNameMap {
    'sub-text': SubText
  }
}
