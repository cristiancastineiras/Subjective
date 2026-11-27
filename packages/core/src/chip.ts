import { LitElement, css, html, nothing } from 'lit'
import { messages } from './shared/messages'
import { baseStyles, focusStyles, iconStyles } from './shared/styles'
import { define, emit } from './shared/utils'
import { iconClose } from './shared/material-icons'

/**
 * Chip / tag, optionally removable (an active filter). The remove button names WHAT it removes:
 * "Remove filter: In stock". Removing fires `sub-remove`; the host app updates the list and moves
 * focus somewhere sensible (e.g. the next chip or the results heading).
 * @fires {CustomEvent} sub-remove - The remove button was pressed
 */
export class SubChip extends LitElement {
  static override shadowRootOptions: ShadowRootInit = { mode: 'open', delegatesFocus: true }

  static override properties = {
    removable: { type: Boolean },
    removeLabel: { type: String, attribute: 'remove-label' },
  }

  declare removable: boolean
  /** Overrides "Remove filter: <text>" */
  declare removeLabel: string

  constructor() {
    super()
    this.removable = false
    this.removeLabel = ''
  }

  static override styles = [
    baseStyles,
    focusStyles,
    iconStyles,
    css`
      :host {
        display: inline-flex;
      }

      .chip {
        display: inline-flex;
        gap: var(--sub-chip-gap);
        align-items: center;
        min-block-size: var(--sub-chip-min-size);
        padding-inline: var(--sub-chip-padding-inline) 0;
        border: var(--sub-chip-border-width) solid var(--sub-color-border);
        border-radius: var(--sub-chip-radius);
        background: var(--sub-color-surface);
        color: var(--sub-color-text);
        font: var(--sub-weight-medium) var(--sub-chip-font-size) / var(--sub-leading-normal) var(--sub-font-sans);
      }

      .chip:not(:has(button)) {
        padding-inline-end: var(--sub-chip-padding-inline);
      }

      button {
        display: grid;
        place-items: center;
        inline-size: var(--sub-chip-min-size);
        block-size: var(--sub-chip-min-size);
        margin-block: calc(var(--sub-chip-border-width) * -1);
        padding: 0;
        border: 0;
        border-radius: var(--sub-chip-radius);
        background: transparent;
        color: inherit;
        cursor: pointer;
        touch-action: manipulation;
      }

      @media (hover: hover) {
        button:hover {
          background: var(--sub-color-surface-hover);
        }
      }
    `,
  ]

  #remove = (): void => {
    emit(this, 'sub-remove')
  }

  protected override render() {
    const text = this.textContent?.trim() ?? ''
    return html`<span class="chip"
      ><span><slot></slot></span>${this.removable
        ? html`<button type="button" aria-label=${this.removeLabel || messages.removeFilter(text)} @click=${this.#remove}>
            ${iconClose()}
          </button>`
        : nothing}</span
    >`
  }
}

export function defineChip(): void {
  define('sub-chip', SubChip)
}

declare global {
  interface HTMLElementTagNameMap {
    'sub-chip': SubChip
  }
}
