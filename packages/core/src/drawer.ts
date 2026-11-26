import { css } from 'lit'
import { SubDialog } from './dialog'
import { define } from './shared/utils'

/**
 * Drawer: a modal panel docked to an edge (`placement`: right, left, bottom, top). Exactly the same
 * native `<dialog>` behaviour and API as <sub-dialog> (inert page, Esc, focus return, `heading`,
 * `dismiss`, `slot="actions"`); only the geometry differs. Use for secondary tasks (filters, details,
 * settings) that should not lose the page behind them.
 */
export class SubDrawer extends SubDialog {
  static override properties = {
    ...SubDialog.properties,
    placement: { type: String, reflect: true },
  }

  declare placement: 'right' | 'left' | 'bottom' | 'top'

  constructor() {
    super()
    this.placement = 'right'
    this.mobile = 'dialog'
  }

  static override styles = [
    ...SubDialog.styles,
    css`
      :host {
        --sub-dialog-padding: var(--sub-drawer-padding);
        --sub-dialog-radius: var(--sub-drawer-radius);
        --sub-dialog-border-width: var(--sub-drawer-border-width);
      }

      dialog {
        scale: 1;
        translate: 100% 0;
        margin: 0;
        max-inline-size: 100vw;
        max-block-size: 100dvh;
        block-size: 100dvh;
        inline-size: min(var(--sub-drawer-width), 100vw);
        inset-block: 0;
        inset-inline: auto 0;
      }

      .panel {
        block-size: 100%;
        max-block-size: 100dvh;
      }

      dialog[open] {
        translate: 0 0;
      }

      @starting-style {
        dialog[open] {
          translate: 100% 0;
        }
      }

      :host([placement='left']) dialog {
        inset-inline: 0 auto;
        translate: -100% 0;
      }

      :host([placement='left']) dialog[open] {
        translate: 0 0;
      }

      @starting-style {
        :host([placement='left']) dialog[open] {
          translate: -100% 0;
        }
      }

      :host([placement='bottom']) dialog,
      :host([placement='top']) dialog {
        inline-size: 100vw;
        block-size: auto;
        max-block-size: 80dvh;
        inset-inline: 0;
      }

      :host([placement='bottom']) dialog {
        inset-block: auto 0;
        translate: 0 100%;
      }

      :host([placement='top']) dialog {
        inset-block: 0 auto;
        translate: 0 -100%;
      }

      :host([placement='bottom']) dialog[open],
      :host([placement='top']) dialog[open] {
        translate: 0 0;
      }

      @starting-style {
        :host([placement='bottom']) dialog[open] {
          translate: 0 100%;
        }

        :host([placement='top']) dialog[open] {
          translate: 0 -100%;
        }
      }
    `,
  ]
}

export function defineDrawer(): void {
  define('sub-drawer', SubDrawer)
}

declare global {
  interface HTMLElementTagNameMap {
    'sub-drawer': SubDrawer
  }
}
