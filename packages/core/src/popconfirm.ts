import { css, html } from 'lit'
import { defineButton } from './button'
import { SubPopover } from './popover'
import { messages } from './shared/messages'
import { define, emit } from './shared/utils'

/**
 * Inline confirmation next to the control ("Delete this row?"), lighter than a modal. Same contract as
 * <sub-confirm-dialog>: the message says what will happen, the confirm label names the action
 * ("Delete row"), and focus starts on the SAFE action (Cancel). Esc or a click outside cancels.
 * Events: `sub-confirm`, `sub-cancel`.
 */
export class SubPopconfirm extends SubPopover {
  static override properties = {
    message: { type: String },
    confirmLabel: { type: String, attribute: 'confirm-label' },
    cancelLabel: { type: String, attribute: 'cancel-label' },
    danger: { type: Boolean },
  }

  declare message: string
  declare confirmLabel: string
  declare cancelLabel: string
  declare danger: boolean

  constructor() {
    super()
    this.message = ''
    this.confirmLabel = ''
    this.cancelLabel = messages.cancel
    this.danger = true
  }

  static override styles = [
    ...SubPopover.styles,
    css`
      .msg {
        margin: 0 0 var(--sub-space-3);
      }

      .actions {
        display: flex;
        flex-wrap: wrap;
        gap: var(--sub-target-gap);
        justify-content: flex-end;
      }
    `,
  ]

  override connectedCallback(): void {
    super.connectedCallback()
    defineButton()
  }

  protected override initialFocus(): HTMLElement | null {
    return this.panel?.querySelector<HTMLElement>('[data-cancel]') ?? this.panel
  }

  #close(kind: 'confirm' | 'cancel'): void {
    this.open = false
    this.trigger?.focus()
    emit(this, kind === 'confirm' ? 'sub-confirm' : 'sub-cancel')
  }

  protected override panelContent() {
    return html`<p class="msg">${this.message}</p>
      <div class="actions">
        <sub-button data-cancel variant="secondary" @click=${() => this.#close('cancel')}>${this.cancelLabel}</sub-button>
        <sub-button variant=${this.danger ? 'danger' : 'primary'} @click=${() => this.#close('confirm')}>${this.confirmLabel}</sub-button>
      </div>`
  }
}

export function definePopconfirm(): void {
  defineButton()
  define('sub-popconfirm', SubPopconfirm)
}

declare global {
  interface HTMLElementTagNameMap {
    'sub-popconfirm': SubPopconfirm
  }
}
