import { LitElement, css, html, nothing, type PropertyValues } from 'lit'
import { messages } from './shared/messages'
import { baseStyles, focusStyles, iconStyles } from './shared/styles'
import { define, emit, warn } from './shared/utils'
import { iconClose } from './shared/material-icons'

const supportsClosedBy = typeof HTMLDialogElement !== 'undefined' && 'closedBy' in HTMLDialogElement.prototype

/**
 * Modal dialog on the native `<dialog>`: inert page, focus containment, top layer, Esc, and focus
 * returning to the opener are all done by the browser (so there is no hand-made focus trap).
 *
 * - `heading` is the dialog's accessible name (an `h1`, the first heading in scope).
 * - `variant="alert"` -> `role="alertdialog"` for urgent/destructive confirmations.
 * - `dismiss`: `esc` (default: Esc + Close button), `any` (also click outside), `none`
 *   (developer closes it, e.g. unsaved changes: listen to `sub-cancel`).
 * - Put the primary control first and mark the safe/first control with `autofocus`.
 * - Footer buttons go in `slot="actions"`.
 *
 * Avoid stacking modals and avoid them for non-critical content (prefer inline disclosure).
 * @fires {CustomEvent<{ returnValue: string }>} close - The dialog closed
 * @fires {CustomEvent} sub-cancel - Esc or the close button; cancelable (call preventDefault to keep it open)
 */
export class SubDialog extends LitElement {
  static override properties = {
    open: { type: Boolean, reflect: true },
    heading: { type: String },
    description: { type: String },
    variant: { type: String, reflect: true },
    dismiss: { type: String },
    mobile: { type: String, reflect: true },
  }

  declare open: boolean
  declare heading: string
  /** Short text under the heading; referenced by `aria-describedby` */
  declare description: string
  declare variant: 'default' | 'alert'
  declare dismiss: 'esc' | 'any' | 'none'
  /** On screens narrower than 40rem: `fullscreen` (default, covers the screen), `sheet` (bottom sheet) or `dialog` (stay a centred box) */
  declare mobile: 'fullscreen' | 'sheet' | 'dialog'

  constructor() {
    super()
    this.open = false
    this.heading = ''
    this.description = ''
    this.variant = 'default'
    this.dismiss = 'esc'
    this.mobile = 'fullscreen'
  }

  static override styles = [
    baseStyles,
    focusStyles,
    iconStyles,
    css`
      :host {
        display: contents;
      }

      dialog {
        box-sizing: border-box;
        inline-size: min(var(--sub-dialog-width), calc(100vw - 2rem));
        max-block-size: calc(100dvh - 2rem);
        padding: 0;
        border: var(--sub-dialog-border-width) solid var(--sub-color-border);
        border-radius: var(--sub-dialog-radius);
        background: var(--sub-color-surface-raised);
        color: var(--sub-color-text);
        font-family: var(--sub-font-sans);
        /* appear: fade + a small scale; durations are 0 when animations are off */
        opacity: 0;
        scale: var(--sub-dialog-enter-scale);
        transition:
          opacity var(--sub-duration-base) var(--sub-ease-standard),
          scale var(--sub-duration-base) var(--sub-ease-standard),
          translate var(--sub-duration-base) var(--sub-ease-standard),
          overlay var(--sub-duration-base) allow-discrete,
          display var(--sub-duration-base) allow-discrete;
      }

      dialog[open] {
        opacity: 1;
        scale: 1;
      }

      @starting-style {
        dialog[open] {
          opacity: 0;
          scale: var(--sub-dialog-enter-scale);
        }
      }

      /* Stops scroll gestures in the dialog (or over the backdrop) from scrolling the page */
      dialog:modal {
        overscroll-behavior: contain;
      }

      dialog::backdrop {
        overflow: hidden;
        overscroll-behavior: contain;
        background: var(--sub-color-overlay);
        opacity: 0;
        transition:
          opacity var(--sub-duration-base) var(--sub-ease-standard),
          overlay var(--sub-duration-base) allow-discrete,
          display var(--sub-duration-base) allow-discrete;
      }

      dialog[open]::backdrop {
        opacity: 1;
      }

      @starting-style {
        dialog[open]::backdrop {
          opacity: 0;
        }
      }

      .panel {
        display: grid;
        grid-template-rows: auto minmax(0, 1fr) auto;
        max-block-size: calc(100dvh - 2rem - 2px);
      }

      header {
        display: flex;
        gap: var(--sub-space-3);
        align-items: flex-start;
        justify-content: space-between;
        padding: var(--sub-dialog-padding) var(--sub-dialog-padding) var(--sub-space-2);
      }

      h1 {
        margin: 0;
        font-size: var(--sub-text-xl);
        font-weight: var(--sub-weight-semibold);
        line-height: var(--sub-leading-snug);
        text-wrap: balance;
      }

      h1:focus {
        outline: none;
      }

      .close {
        flex: none;
        display: grid;
        place-items: center;
        inline-size: var(--sub-target-size);
        block-size: var(--sub-target-size);
        margin: calc(var(--sub-space-2) * -1) calc(var(--sub-space-2) * -1) 0 0;
        padding: 0;
        border: 0;
        border-radius: var(--sub-control-radius);
        background: transparent;
        color: inherit;
        cursor: pointer;
      }

      @media (hover: hover) {
        .close:hover {
          background: var(--sub-color-surface-hover);
        }
      }

      .body {
        padding: var(--sub-space-2) var(--sub-dialog-padding);
        overflow: auto;
      }

      .desc {
        margin: 0 0 var(--sub-space-3);
        color: var(--sub-color-muted);
      }

      footer {
        display: flex;
        flex-wrap: wrap;
        gap: var(--sub-target-gap);
        justify-content: flex-end;
        padding: var(--sub-space-4) var(--sub-dialog-padding) var(--sub-dialog-padding);
      }

      footer:not(:has(::slotted(*))) {
        display: none;
      }

      /* ---- small screens: the modal covers the screen (or becomes a bottom sheet) ---- */
      @media (max-width: 40rem) {
        footer {
          flex-direction: column-reverse;
          align-items: stretch;
          padding-block-end: max(var(--sub-dialog-padding), env(safe-area-inset-bottom));
        }

        /* full-width buttons: easy to hit with a thumb */
        footer ::slotted(*) {
          display: flex;
          align-items: stretch;
        }

        :host([mobile='fullscreen']) dialog {
          inline-size: 100vw;
          block-size: 100dvh;
          max-inline-size: none;
          max-block-size: none;
          margin: 0;
          border: 0;
          border-radius: 0;
          scale: 1;
          translate: 0 var(--sub-motion-distance);
        }

        :host([mobile='fullscreen']) dialog[open] {
          translate: 0 0;
        }

        @starting-style {
          :host([mobile='fullscreen']) dialog[open] {
            translate: 0 var(--sub-motion-distance);
          }
        }

        :host([mobile='fullscreen']) .panel {
          block-size: 100dvh;
          max-block-size: 100dvh;
        }

        :host([mobile='sheet']) dialog {
          inline-size: 100vw;
          max-inline-size: none;
          max-block-size: var(--sub-dialog-sheet-max-height);
          margin: auto 0 0;
          border-inline-width: 0;
          border-block-end-width: 0;
          border-radius: var(--sub-dialog-radius) var(--sub-dialog-radius) 0 0;
          scale: 1;
          translate: 0 100%;
        }

        :host([mobile='sheet']) dialog[open] {
          translate: 0 0;
        }

        @starting-style {
          :host([mobile='sheet']) dialog[open] {
            translate: 0 100%;
          }
        }

        :host([mobile='sheet']) .panel {
          max-block-size: var(--sub-dialog-sheet-max-height);
        }
      }
    `,
  ]

  get #dialog(): HTMLDialogElement | null {
    return this.renderRoot.querySelector('dialog')
  }

  show(): void {
    this.open = true
  }

  close(returnValue = ''): void {
    const dialog = this.#dialog
    if (dialog?.open) dialog.close(returnValue)
    this.open = false
  }

  protected override firstUpdated(): void {
    if (!this.heading) warn('<sub-dialog> needs a "heading": it is the accessible name of the dialog.')
  }

  protected override updated(changed: PropertyValues): void {
    const dialog = this.#dialog
    if (!dialog || !changed.has('open')) return
    if (this.open && !dialog.open) {
      dialog.showModal()
      this.#focusInitial()
    } else if (!this.open && dialog.open) dialog.close()
  }

  /** `autofocus` on slotted light-DOM controls (Cancel in a confirmation, first field in a form) */
  #focusInitial(): void {
    this.querySelector<HTMLElement>('[autofocus]')?.focus()
  }

  #onCancel = (event: Event): void => {
    // Esc / close request. `none` and a cancelled `sub-cancel` keep it open (e.g. unsaved changes).
    const proceed = emit(this, 'sub-cancel', undefined, { cancelable: true, bubbles: false })
    if (!proceed || this.dismiss === 'none') event.preventDefault()
  }

  #onClose = (): void => {
    const returnValue = this.#dialog?.returnValue ?? ''
    if (this.#dialog) this.#dialog.returnValue = '' // else a stale value leaks into the next close
    this.open = false
    emit(this, 'close', { returnValue }, { bubbles: false })
  }

  // Light dismiss where `closedby` is not supported: press AND release outside the box
  #pressedOutside = false
  #outside(e: PointerEvent, dialog: HTMLDialogElement): boolean {
    const r = dialog.getBoundingClientRect()
    return e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom
  }
  #onPointerDown = (e: PointerEvent): void => {
    const d = this.#dialog
    this.#pressedOutside = !!d && this.dismiss === 'any' && !supportsClosedBy && this.#outside(e, d)
  }
  #onPointerUp = (e: PointerEvent): void => {
    const d = this.#dialog
    if (d && this.#pressedOutside && this.#outside(e, d)) this.#onCancelRequest()
    this.#pressedOutside = false
  }
  #onCancelRequest(): void {
    if (emit(this, 'sub-cancel', undefined, { cancelable: true, bubbles: false })) this.close()
  }

  protected override render() {
    const closedby = this.dismiss === 'any' ? 'any' : this.dismiss === 'none' ? 'none' : 'closerequest'
    return html`<dialog
      aria-labelledby="title"
      aria-describedby=${this.description ? 'desc' : nothing}
      role=${this.variant === 'alert' ? 'alertdialog' : nothing}
      closedby=${closedby}
      @cancel=${this.#onCancel}
      @close=${this.#onClose}
      @pointerdown=${this.#onPointerDown}
      @pointerup=${this.#onPointerUp}
    >
      <div class="panel">
        <header>
          <h1 id="title">${this.heading}</h1>
          <button class="close" type="button" aria-label=${messages.close} @click=${() => this.#onCancelRequest()}>
            ${iconClose()}
          </button>
        </header>
        <div class="body">
          ${this.description ? html`<p id="desc" class="desc">${this.description}</p>` : nothing}
          <slot></slot>
        </div>
        <footer><slot name="actions"></slot></footer>
      </div>
    </dialog>`
  }
}

export function defineDialog(): void {
  define('sub-dialog', SubDialog)
}

declare global {
  interface HTMLElementTagNameMap {
    'sub-dialog': SubDialog
  }
}
