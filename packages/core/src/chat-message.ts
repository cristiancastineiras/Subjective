import { LitElement, css, html, nothing } from 'lit'
import { announce } from './announce'
import { icons } from './shared/icons'
import { messages } from './shared/messages'
import { baseStyles, focusStyles, iconStyles, visuallyHidden } from './shared/styles'
import { define, emit } from './shared/utils'

/**
 * One message in <sub-chat>. `assistant` messages are labelled as AI (never pretending to be a
 * person) and can offer Copy, Regenerate and Good/Bad feedback (labelled buttons, `aria-pressed`).
 * `sender`: `assistant` (default) or `user`. A visually hidden "Assistant said:" / "You said:" prefix keeps the log readable for screen readers.
 */
export class SubChatMessage extends LitElement {
  static override properties = {
    sender: { type: String, reflect: true },
    actions: { type: Boolean },
    feedback: { type: String },
  }

  declare sender: 'user' | 'assistant'
  /** Show Copy / Regenerate / feedback buttons (assistant messages) */
  declare actions: boolean
  declare feedback: '' | 'up' | 'down'

  constructor() {
    super()
    this.sender = 'assistant'
    this.actions = false
    this.feedback = ''
  }

  static override styles = [
    baseStyles,
    focusStyles,
    iconStyles,
    visuallyHidden,
    css`
      :host {
        display: flex;
        flex-direction: column;
        align-items: flex-start;
        font-family: var(--sub-font-sans);
      }

      :host([sender='user']) {
        align-items: flex-end;
      }

      .who {
        margin: 0 0 var(--sub-space-1);
        font-size: var(--sub-text-sm);
        font-weight: var(--sub-weight-semibold);
        color: var(--sub-color-muted);
      }

      .body {
        max-inline-size: min(100%, 40rem);
        padding: var(--sub-chat-bubble-padding);
        border: var(--sub-border-width-base) solid var(--sub-color-border);
        border-radius: var(--sub-chat-bubble-radius);
        background: var(--sub-color-surface);
        color: var(--sub-color-text);
        overflow-wrap: anywhere;
      }

      :host([sender='user']) .body {
        background: var(--sub-color-accent-subtle);
        color: var(--sub-color-on-accent-subtle);
        border-color: var(--sub-color-accent);
      }

      .actions {
        display: flex;
        gap: var(--sub-target-gap);
        margin-block-start: var(--sub-space-1);
      }

      button {
        display: grid;
        place-items: center;
        inline-size: var(--sub-target-size);
        block-size: var(--sub-target-size);
        padding: 0;
        border: var(--sub-border-width-base) solid transparent;
        border-radius: var(--sub-control-radius);
        background: transparent;
        color: var(--sub-color-text);
        cursor: pointer;
        touch-action: manipulation;
      }

      button[aria-pressed='true'] {
        background: var(--sub-color-accent-subtle);
        color: var(--sub-color-on-accent-subtle);
        border-color: var(--sub-color-accent);
      }

      @media (hover: hover) {
        button:hover {
          background: var(--sub-color-surface-hover);
        }
      }
    `,
  ]

  async #copy(): Promise<void> {
    try {
      await navigator.clipboard.writeText(this.textContent?.trim() ?? '')
      announce(messages.copied)
    } catch {
      announce('Copy is not available here. Select the text and copy it manually.')
    }
    emit(this, 'sub-copy')
  }

  #rate(value: 'up' | 'down'): void {
    this.feedback = this.feedback === value ? '' : value
    emit(this, 'sub-feedback', { value: this.feedback })
  }

  protected override render() {
    const mine = this.sender === 'user'
    return html`<p class="who" aria-hidden=${mine ? 'true' : nothing}>${mine ? messages.you : messages.aiAssistant}</p>
      <div class="body" part="body"><span class="sr-only">${mine ? messages.youSaid : messages.assistantSaid} </span><slot></slot></div>
      ${this.actions && !mine
        ? html`<div class="actions" role="group" aria-label=${messages.messageActions}>
            <button type="button" aria-label=${messages.copy} @click=${() => void this.#copy()}>${icons.copy()}</button>
            <button type="button" aria-label=${messages.regenerate} @click=${() => emit(this, 'sub-regenerate')}>${icons.refresh()}</button>
            <button type="button" aria-label=${messages.goodResponse} aria-pressed=${this.feedback === 'up' ? 'true' : 'false'} @click=${() => this.#rate('up')}>${icons.thumbUp()}</button>
            <button type="button" aria-label=${messages.badResponse} aria-pressed=${this.feedback === 'down' ? 'true' : 'false'} @click=${() => this.#rate('down')}>${icons.thumbDown()}</button>
          </div>`
        : nothing}`
  }
}

export function defineChatMessage(): void {
  define('sub-chat-message', SubChatMessage)
}

declare global {
  interface HTMLElementTagNameMap {
    'sub-chat-message': SubChatMessage
  }
}
