import { LitElement, css, html, nothing } from 'lit'
import { messages } from './shared/messages'
import { baseStyles, focusStyles, iconStyles } from './shared/styles'
import { define, emit, uid } from './shared/utils'
import type { AlertVariant } from './alert'
import { iconClose } from './shared/material-icons'

export interface ToastOptions {
  message: string
  variant?: AlertVariant
  /** Label of an action such as "Undo" (fires `sub-toast-action`) */
  actionLabel?: string
  /** ms before it goes away. Default 5000. 0 = stays until dismissed (default for `error`). */
  duration?: number
}

interface ToastItem extends Required<Pick<ToastOptions, 'message' | 'variant'>> {
  id: string
  actionLabel: string
  duration: number
}

/**
 * Toast region: put ONE `<sub-toaster>` in the page and call `toaster.show({...})`.
 * The region is a polite live region, so messages are announced without stealing focus.
 * Timers pause while the pointer or focus is inside (WCAG 2.2.1); errors never auto-dismiss.
 * Use for confirmations ("Notifications turned off") and short Undo windows (~5 s), never for
 * field errors or anything the user must read.
 * @fires {CustomEvent<{ id: string; message: string }>} sub-toast-action - A toast's action button was pressed
 */
export class SubToaster extends LitElement {
  static override properties = {
    _toasts: { state: true },
  }

  declare _toasts: ToastItem[]

  #timers = new Map<string, ReturnType<typeof setTimeout>>()

  constructor() {
    super()
    this._toasts = []
  }

  static override styles = [
    baseStyles,
    focusStyles,
    iconStyles,
    css`
      :host {
        position: fixed;
        /* clear of the notch and the home indicator on phones (env() is 0 elsewhere) */
        inset-inline: calc(var(--sub-space-4) + max(env(safe-area-inset-left), env(safe-area-inset-right)));
        inset-block-end: calc(var(--sub-space-4) + env(safe-area-inset-bottom));
        z-index: var(--sub-z-toast);
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: var(--sub-space-2);
        pointer-events: none;
        font-family: var(--sub-font-sans);
      }

      .toast {
        display: flex;
        gap: var(--sub-toast-gap);
        align-items: center;
        inline-size: min(100%, var(--sub-toast-width));
        padding: var(--sub-toast-padding) var(--sub-toast-padding) var(--sub-toast-padding) var(--sub-space-4);
        border: var(--sub-toast-border-width) solid var(--sub-color-border);
        border-radius: var(--sub-toast-radius);
        background: var(--sub-color-text);
        color: var(--sub-color-surface);
        pointer-events: auto;
      }

      .message {
        flex: 1;
        min-inline-size: 0;
        overflow-wrap: anywhere;
      }

      button {
        flex: none;
        display: inline-grid;
        place-items: center;
        min-inline-size: var(--sub-target-size);
        min-block-size: var(--sub-target-size);
        padding: 0 var(--sub-space-3);
        border: 0;
        border-radius: var(--sub-control-radius);
        background: transparent;
        color: inherit;
        font: var(--sub-weight-semibold) var(--sub-text-md) / 1 var(--sub-font-sans);
        text-decoration: underline;
        cursor: pointer;
      }

      button.x {
        padding: 0;
        text-decoration: none;
      }

      @media (hover: hover) {
        button:hover {
          background: color-mix(in srgb, currentColor 16%, transparent);
        }
      }

      /* The toast is inverse: its focus ring must contrast with the page, not the toast */
      button:focus-visible {
        outline-color: var(--sub-color-surface);
        outline-offset: -2px;
      }

      @media (forced-colors: active) {
        .toast {
          border-color: CanvasText;
          background: Canvas;
          color: CanvasText;
        }
      }
    `,
  ]

  override connectedCallback(): void {
    super.connectedCallback()
    this.addEventListener('pointerenter', this.#pause)
    this.addEventListener('pointerleave', this.#resume)
    this.addEventListener('focusin', this.#pause)
    this.addEventListener('focusout', this.#resume)
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback()
    this.#pause()
    this.removeEventListener('pointerenter', this.#pause)
    this.removeEventListener('pointerleave', this.#resume)
    this.removeEventListener('focusin', this.#pause)
    this.removeEventListener('focusout', this.#resume)
  }

  show(options: ToastOptions): string {
    const variant = options.variant ?? 'info'
    const item: ToastItem = {
      id: uid('toast'),
      message: options.message,
      variant,
      actionLabel: options.actionLabel ?? '',
      duration: options.duration ?? (variant === 'error' ? 0 : 5000),
    }
    this._toasts = [...this._toasts, item]
    this.#schedule(item)
    return item.id
  }

  dismiss(id: string): void {
    clearTimeout(this.#timers.get(id))
    this.#timers.delete(id)
    this._toasts = this._toasts.filter((t) => t.id !== id)
  }

  #schedule(item: ToastItem): void {
    if (item.duration > 0) this.#timers.set(item.id, setTimeout(() => this.dismiss(item.id), item.duration))
  }

  #pause = (): void => {
    for (const t of this.#timers.values()) clearTimeout(t)
    this.#timers.clear()
  }

  #resume = (): void => {
    if (this.matches(':hover') || this.matches(':focus-within')) return
    for (const item of this._toasts) if (!this.#timers.has(item.id)) this.#schedule(item)
  }

  #act(item: ToastItem): void {
    emit(this, 'sub-toast-action', { id: item.id, message: item.message })
    this.dismiss(item.id)
  }

  protected override render() {
    return html`<div role="status" aria-live="polite" aria-atomic="false" style="display: contents">
      ${this._toasts.map(
        (t) => html`<div class="toast" data-variant=${t.variant}>
          <span class="message">${t.message}</span>
          ${t.actionLabel ? html`<button type="button" @click=${() => this.#act(t)}>${t.actionLabel}</button>` : nothing}
          <button class="x" type="button" aria-label=${messages.close} @click=${() => this.dismiss(t.id)}>${iconClose()}</button>
        </div>`,
      )}
    </div>`
  }
}

export function defineToaster(): void {
  define('sub-toaster', SubToaster)
}

declare global {
  interface HTMLElementTagNameMap {
    'sub-toaster': SubToaster
  }
}
