import { html, nothing } from 'lit'
import { defineButton, type ButtonVariant } from './button'
import { SubDialog } from './dialog'
import { define, warn } from './shared/utils'

/**
 * Modal with its own opener: the button, the dialog and the wiring in one element.
 *
 *   <sub-modal trigger="Edit profile" heading="Edit profile">
 *     ...content...
 *     <sub-button slot="actions" variant="primary">Save</sub-button>
 *   </sub-modal>
 *
 * It is a <sub-dialog> (native `<dialog>`, inert page, Esc, focus returns to the opener) plus a trigger.
 * Below 40rem the modal covers the whole screen (`mobile="sheet"` for a bottom sheet, `mobile="dialog"` to keep
 * the box). Use `slot="trigger"` to bring your own opener instead of the default button.
 */
export class SubModal extends SubDialog {
  static override properties = {
    ...SubDialog.properties,
    trigger: { type: String },
    triggerVariant: { type: String, attribute: 'trigger-variant' },
  }

  /** Text of the opening button */
  declare trigger: string
  declare triggerVariant: ButtonVariant

  constructor() {
    super()
    this.trigger = ''
    this.triggerVariant = 'secondary'
  }

  override connectedCallback(): void {
    super.connectedCallback()
    defineButton()
  }

  protected override firstUpdated(): void {
    super.firstUpdated()
    if (!this.trigger && !this.querySelector(':scope > [slot="trigger"]')) warn('<sub-modal> needs a "trigger" text or a slot="trigger" element.')
  }

  protected override render() {
    return html`<slot name="trigger" @click=${() => this.show()}>
        ${this.trigger ? html`<sub-button variant=${this.triggerVariant} @click=${() => this.show()}>${this.trigger}</sub-button>` : nothing}
      </slot>
      ${super.render()}`
  }
}

export function defineModal(): void {
  defineButton()
  define('sub-modal', SubModal)
}

declare global {
  interface HTMLElementTagNameMap {
    'sub-modal': SubModal
  }
}
