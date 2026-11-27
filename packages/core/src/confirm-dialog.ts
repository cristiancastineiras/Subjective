import { LitElement, html } from 'lit'
import { defineButton } from './button'
import { SubDialog, defineDialog } from './dialog'
import { messages } from './shared/messages'
import { baseStyles } from './shared/styles'
import { define, emit, warn } from './shared/utils'

/**
 * Confirmation for a destructive or irreversible action (SubUX pattern):
 *  - `heading` states what will happen ("Delete this project permanently?"), never "Are you sure?"
 *  - `confirm-label` is specific ("Delete project"), never "OK / Yes / Confirm"
 *  - initial focus is on Cancel (never on the destructive button); Esc and the backdrop = Cancel
 *  - alertdialog semantics; the message states the consequences
 *
 * Events: `sub-confirm`, `sub-cancel`. Open with `show()` or `open`.
 * @fires {CustomEvent} sub-cancel - The user cancelled
 * @fires {CustomEvent} sub-confirm - The user confirmed
 */
export class SubConfirmDialog extends LitElement {
  static override properties = {
    open: { type: Boolean, reflect: true },
    heading: { type: String },
    message: { type: String },
    confirmLabel: { type: String, attribute: 'confirm-label' },
    cancelLabel: { type: String, attribute: 'cancel-label' },
    danger: { type: Boolean },
  }

  declare open: boolean
  declare heading: string
  /** Consequences, 1-2 sentences: "This will delete Atlas and all its data. This cannot be undone." */
  declare message: string
  declare confirmLabel: string
  declare cancelLabel: string
  /** Destructive styling for the confirm button (default true) */
  declare danger: boolean

  constructor() {
    super()
    this.open = false
    this.heading = ''
    this.message = ''
    this.confirmLabel = ''
    this.cancelLabel = messages.cancel
    this.danger = true
  }

  static override styles = [baseStyles]

  show(): void {
    this.open = true
  }

  protected override firstUpdated(): void {
    if (/^(ok|yes|confirm|submit)$/i.test(this.confirmLabel.trim())) {
      warn(`<sub-confirm-dialog confirm-label="${this.confirmLabel}"> is too vague: name the action ("Delete project").`)
    }
  }

  #dialog(): SubDialog | null {
    return this.renderRoot.querySelector('sub-dialog')
  }

  #confirm = (): void => {
    this.#dialog()?.close('confirm')
    emit(this, 'sub-confirm')
  }

  #onDialogCancel = (event: Event): void => {
    // Esc, backdrop, close button and Cancel all mean "do not do it"
    event.stopPropagation()
    emit(this, 'sub-cancel')
  }

  #onClose = (): void => {
    this.open = false
  }

  protected override render() {
    return html`<sub-dialog
      variant="alert"
      mobile="dialog"
      .open=${this.open}
      heading=${this.heading}
      description=${this.message}
      @sub-cancel=${this.#onDialogCancel}
      @close=${this.#onClose}
    >
      <sub-button slot="actions" variant="secondary" autofocus @click=${() => this.#dialog()?.close('cancel')}
        >${this.cancelLabel}</sub-button
      >
      <sub-button slot="actions" variant=${this.danger ? 'danger' : 'primary'} @click=${this.#confirm}
        >${this.confirmLabel}</sub-button
      >
    </sub-dialog>`
  }

  override connectedCallback(): void {
    super.connectedCallback()
    defineButton()
    defineDialog()
  }
}

export function defineConfirmDialog(): void {
  defineButton()
  defineDialog()
  define('sub-confirm-dialog', SubConfirmDialog)
}

declare global {
  interface HTMLElementTagNameMap {
    'sub-confirm-dialog': SubConfirmDialog
  }
}
