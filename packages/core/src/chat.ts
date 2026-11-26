import { LitElement, css, html, nothing } from 'lit'
import { defineButton } from './button'
import { defineChatMessage } from './chat-message'
import { messages } from './shared/messages'
import { baseStyles, focusStyles, iconStyles, visuallyHidden } from './shared/styles'
import { define, emit, warn } from './shared/utils'
import { iconStop } from './shared/material-icons'

/**
 * AI chat shell following SubUX "UX for AI chatbots":
 *  - says what the assistant is (AI badge) and what it can/cannot do (`intro`) BEFORE the first message
 *  - empty state with 3-5 example prompts (never blank)
 *  - conversation in `role="log"` (new messages announced politely), focusable for keyboard scrolling
 *  - visible status while generating, "Still working on that..." after ~3 s, "Stop generating"
 *  - 2-4 contextual quick replies reachable by Tab, labelled composer, focus returns to it after sending
 *  - a clear way out: `escalation-label` ("Talk to a human") that is always visible
 *
 * Put `<sub-chat-message>` children inside. Events: `sub-send` {message, source},
 * `sub-stop`, `sub-escalate`.
 */
export class SubChat extends LitElement {
  static override properties = {
    heading: { type: String },
    intro: { type: String },
    examples: { attribute: false },
    suggestions: { attribute: false },
    generating: { type: Boolean, reflect: true },
    escalationLabel: { type: String, attribute: 'escalation-label' },
    _slow: { state: true },
    _count: { state: true },
  }

  declare heading: string
  /** What the assistant can and cannot do: shown before the first message */
  declare intro: string
  /** Example prompts for the empty state */
  declare examples: string[]
  /** Contextual quick replies (2-4) shown above the composer */
  declare suggestions: string[]
  declare generating: boolean
  declare escalationLabel: string
  declare _slow: boolean
  declare _count: number

  #slowTimer: ReturnType<typeof setTimeout> | undefined

  constructor() {
    super()
    this.heading = 'Assistant'
    this.intro = ''
    this.examples = []
    this.suggestions = []
    this.generating = false
    this.escalationLabel = ''
    this._slow = false
    this._count = 0
  }

  static override styles = [
    baseStyles,
    focusStyles,
    iconStyles,
    visuallyHidden,
    css`
      :host {
        display: block;
        font-family: var(--sub-font-sans);
        color: var(--sub-color-text);
      }

      .chat {
        display: grid;
        grid-template-rows: auto minmax(0, 1fr) auto;
        block-size: var(--sub-chat-height);
        border: var(--sub-chat-border-width) solid var(--sub-color-border);
        border-radius: var(--sub-chat-radius);
        background: var(--sub-color-page);
      }

      header {
        padding: var(--sub-space-3) var(--sub-space-4);
        border-block-end: var(--sub-border-width-thin) solid var(--sub-color-border-subtle);
      }

      h2 {
        display: flex;
        flex-wrap: wrap;
        gap: var(--sub-space-2);
        align-items: center;
        margin: 0;
        font-size: var(--sub-text-lg);
      }

      .ai {
        padding: 0 var(--sub-space-2);
        border: var(--sub-border-width-base) solid var(--sub-color-info);
        color: var(--sub-color-info);
        font-size: var(--sub-text-sm);
        font-weight: var(--sub-weight-semibold);
      }

      .intro {
        margin: var(--sub-space-1) 0 0;
        color: var(--sub-color-muted);
        font-size: var(--sub-text-sm);
      }

      .log {
        display: flex;
        flex-direction: column;
        gap: var(--sub-chat-gap);
        padding: var(--sub-space-4);
        overflow: auto;
      }

      .empty h3 {
        margin: 0 0 var(--sub-space-2);
        font-size: var(--sub-text-md);
      }

      .empty ul,
      .replies {
        display: flex;
        flex-wrap: wrap;
        gap: var(--sub-target-gap);
        margin: 0;
        padding: 0;
        list-style: none;
      }

      .quick {
        min-block-size: var(--sub-target-size);
        padding: var(--sub-space-1) var(--sub-space-3);
        border: var(--sub-border-width-base) solid var(--sub-color-accent);
        border-radius: var(--sub-control-radius);
        background: var(--sub-color-surface);
        color: var(--sub-color-on-accent-subtle);
        font: var(--sub-weight-medium) var(--sub-text-md) / var(--sub-leading-normal) var(--sub-font-sans);
        cursor: pointer;
      }

      @media (hover: hover) {
        .quick:hover {
          background: var(--sub-color-accent-subtle);
        }
      }

      .status {
        display: flex;
        gap: var(--sub-space-2);
        align-items: center;
        color: var(--sub-color-muted);
        font-size: var(--sub-text-sm);
      }

      .dots {
        display: inline-flex;
        gap: 0.25rem;
      }

      .dots span {
        inline-size: 0.5rem;
        block-size: 0.5rem;
        border-radius: 50%;
        background: currentColor;
        animation: pulse 1s ease-in-out infinite;
      }

      .dots span:nth-child(2) {
        animation-delay: 0.15s;
      }

      .dots span:nth-child(3) {
        animation-delay: 0.3s;
      }

      @keyframes pulse {
        50% {
          opacity: 0.25;
        }
      }

      @media (prefers-reduced-motion: reduce) {
        .dots span {
          animation: none;
        }
      }

      footer {
        display: grid;
        gap: var(--sub-space-2);
        padding: var(--sub-space-3) var(--sub-space-4);
        border-block-start: var(--sub-border-width-thin) solid var(--sub-color-border-subtle);
      }

      form {
        display: grid;
        grid-template-columns: minmax(0, 1fr) auto;
        gap: var(--sub-space-2);
        align-items: end;
      }

      label {
        grid-column: 1 / -1;
        font-weight: var(--sub-weight-semibold);
      }

      textarea {
        min-block-size: var(--sub-target-size);
        padding: var(--sub-field-padding-block) var(--sub-field-padding-inline);
        border: var(--sub-field-border-width) solid var(--sub-color-border);
        border-radius: var(--sub-field-radius);
        background: var(--sub-color-surface);
        color: var(--sub-color-text);
        font: var(--sub-weight-regular) var(--sub-field-font-size) / var(--sub-leading-normal) var(--sub-font-sans);
        resize: vertical;
      }

      .hint {
        grid-column: 1 / -1;
        margin: 0;
        color: var(--sub-color-muted);
        font-size: var(--sub-text-sm);
      }

      .escalate {
        justify-self: start;
        min-block-size: var(--sub-target-size);
        padding: 0;
        border: 0;
        background: transparent;
        color: var(--sub-color-link);
        font: var(--sub-weight-semibold) var(--sub-text-md) / var(--sub-leading-normal) var(--sub-font-sans);
        text-decoration: underline;
        text-underline-offset: 0.2em;
        cursor: pointer;
      }
    `,
  ]

  override connectedCallback(): void {
    super.connectedCallback()
    defineButton()
    defineChatMessage()
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback()
    clearTimeout(this.#slowTimer)
  }

  protected override firstUpdated(): void {
    if (!this.intro) warn('<sub-chat> should state what the assistant can and cannot do (`intro`).')
  }

  protected override updated(changed: Map<string, unknown>): void {
    if (changed.has('generating')) {
      clearTimeout(this.#slowTimer)
      this._slow = false
      if (this.generating) this.#slowTimer = setTimeout(() => (this._slow = true), 3000)
    }
  }

  get #input(): HTMLTextAreaElement | null {
    return this.renderRoot.querySelector('textarea')
  }

  #send(message: string, source: 'composer' | 'suggestion' | 'example'): void {
    const text = message.trim()
    if (!text) return
    emit(this, 'sub-send', { message: text, source })
    if (source === 'composer' && this.#input) this.#input.value = ''
    this.#input?.focus() // never leave focus on a button that just changed
  }

  #onKey = (event: KeyboardEvent): void => {
    if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) {
      event.preventDefault()
      this.#send((event.target as HTMLTextAreaElement).value, 'composer')
    }
  }

  #scroll = (): void => {
    const log = this.renderRoot.querySelector('.log')
    if (log) log.scrollTop = log.scrollHeight
  }

  protected override render() {
    const empty = this._count === 0
    return html`<section class="chat" aria-labelledby="title">
      <header>
        <h2 id="title">${this.heading}<span class="ai">${messages.aiAssistant}</span></h2>
        ${this.intro ? html`<p class="intro">${this.intro}</p>` : nothing}
      </header>

      <div class="log" role="log" aria-label=${messages.conversation} aria-live="polite" tabindex="0">
        ${empty && this.examples.length
          ? html`<div class="empty">
              <h3>Try asking</h3>
              <ul>
                ${this.examples.map((e) => html`<li><button class="quick" type="button" @click=${() => this.#send(e, 'example')}>${e}</button></li>`)}
              </ul>
            </div>`
          : nothing}
        <slot
          @slotchange=${(e: Event) => {
            this._count = (e.target as HTMLSlotElement).assignedElements().length
            this.#scroll()
          }}
        ></slot>
        ${this.generating
          ? html`<div class="status" role="status" aria-label=${messages.assistantTyping}>
              <span class="dots" aria-hidden="true"><span></span><span></span><span></span></span>
              <span>${this._slow ? messages.stillWorking : messages.assistantTyping}</span>
            </div>`
          : nothing}
      </div>

      <footer>
        ${this.suggestions.length
          ? html`<ul class="replies" aria-label=${messages.suggestedReplies}>
              ${this.suggestions.map((s) => html`<li><button class="quick" type="button" @click=${() => this.#send(s, 'suggestion')}>${s}</button></li>`)}
            </ul>`
          : nothing}
        <form @submit=${(e: Event) => { e.preventDefault(); this.#send(this.#input?.value ?? '', 'composer') }}>
          <label for="msg">${messages.message}</label>
          <textarea id="msg" rows="2" enterkeyhint="send" aria-describedby="hint" @keydown=${this.#onKey}></textarea>
          ${this.generating
            ? html`<sub-button variant="secondary" @click=${() => emit(this, 'sub-stop')}>${iconStop()}${messages.stopGenerating}</sub-button>`
            : html`<sub-button type="submit">${messages.send}</sub-button>`}
          <p id="hint" class="hint">${messages.chatHint}</p>
        </form>
        ${this.escalationLabel
          ? html`<button class="escalate" type="button" @click=${() => emit(this, 'sub-escalate')}>${this.escalationLabel}</button>`
          : nothing}
      </footer>
    </section>`
  }
}

export function defineChat(): void {
  defineButton()
  defineChatMessage()
  define('sub-chat', SubChat)
}

declare global {
  interface HTMLElementTagNameMap {
    'sub-chat': SubChat
  }
}
