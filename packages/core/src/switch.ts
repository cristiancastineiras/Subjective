import { css, html } from 'lit'
import { ifDefined } from 'lit/directives/if-defined.js'
import { SubFormControl, formControlStyles, type FormValue } from './shared/form-control'
import { define } from './shared/utils'

/**
 * Toggle switch for a persistent binary SETTING that applies immediately (notifications, dark mode).
 * Not for actions (use a button) nor for values submitted with a Save button (use a checkbox).
 *
 * `label` names the SETTING ("Email notifications"), never the state ("Turn off ..."). The state is
 * shown as position AND text ("On"/"Off"), not colour alone. `button role="switch"`, Space/Enter toggle.
 * @fires {Event} change - The value changed (native event: works with any framework and form library)
 */
export class SubSwitch extends SubFormControl {
  static override properties = {
    checked: { type: Boolean, reflect: true },
    value: { type: String },
    onText: { type: String, attribute: 'on-text' },
    offText: { type: String, attribute: 'off-text' },
  }

  declare checked: boolean
  declare value: string
  declare onText: string
  declare offText: string

  #default = false

  constructor() {
    super()
    this.checked = false
    this.value = 'on'
    this.onText = 'On'
    this.offText = 'Off'
  }

  static override styles = [
    ...formControlStyles,
    css`
      .row {
        display: flex;
        gap: var(--sub-switch-gap);
        align-items: center;
        min-block-size: var(--sub-control-min-size);
      }

      .switch {
        flex: none;
        display: inline-grid;
        place-items: center;
        min-inline-size: var(--sub-control-min-size);
        block-size: var(--sub-control-min-size);
        padding: 0;
        border: 0;
        background: transparent;
        cursor: pointer;
        touch-action: manipulation;
        border-radius: var(--sub-switch-radius);
      }

      .track {
        position: relative;
        display: block;
        --_pad: calc((var(--sub-switch-track-height) - 2 * var(--sub-switch-border-width) - var(--sub-switch-thumb-size)) / 2);
        inline-size: var(--sub-switch-track-width);
        block-size: var(--sub-switch-track-height);
        border: var(--sub-switch-border-width) solid var(--sub-color-border);
        border-radius: var(--sub-switch-radius);
        background: var(--sub-color-surface);
        transition: background-color var(--sub-duration-fast) var(--sub-ease-standard);
      }

      .thumb {
        position: absolute;
        inset-block-start: 50%;
        inset-inline-start: var(--_pad);
        inline-size: var(--sub-switch-thumb-size);
        block-size: var(--sub-switch-thumb-size);
        translate: 0 -50%;
        border-radius: 50%;
        background: var(--sub-color-border);
        transition: inset-inline-start var(--sub-duration-fast) var(--sub-ease-standard);
      }

      /* ON: filled track, thumb moves and shows a tick - three signals, not just colour */
      [aria-checked='true'] .track {
        background: var(--sub-color-accent);
        border-color: var(--sub-color-accent);
      }

      [aria-checked='true'] .thumb {
        inset-inline-start: calc(100% - var(--sub-switch-thumb-size) - var(--_pad));
        background: var(--sub-color-on-accent);
      }

      .switch:disabled {
        cursor: not-allowed;
      }

      .switch:disabled .track {
        border-color: transparent;
        background: var(--sub-color-disabled);
      }

      .switch:disabled .thumb {
        background: var(--sub-color-on-disabled);
      }

      label {
        cursor: pointer;
      }

      :host([disabled]) label {
        cursor: not-allowed;
        color: var(--sub-color-on-disabled);
      }

      .state {
        min-inline-size: 2ch;
        font-size: var(--sub-text-sm);
        font-weight: var(--sub-weight-medium);
        color: var(--sub-color-muted);
      }

      @media (forced-colors: active) {
        .track {
          border-color: ButtonText;
        }

        [aria-checked='true'] .track {
          background: Highlight;
        }

        .thumb {
          background: ButtonText;
        }

        [aria-checked='true'] .thumb {
          background: HighlightText;
        }
      }
    `,
  ]

  override connectedCallback(): void {
    super.connectedCallback()
    this.#default = this.checked
  }

  protected control(): HTMLElement | null {
    return this.renderRoot.querySelector('button')
  }
  protected formValue(): FormValue {
    return this.checked ? this.value : null
  }
  protected resetValue(): void {
    this.checked = this.#default
  }
  protected restoreValue(state: FormValue): void {
    this.checked = state !== null
  }

  #toggle = (): void => {
    this.checked = !this.checked
    this.dispatchEvent(new Event('change', { bubbles: true }))
  }

  protected override render() {
    return html`<div class="field">
      <div class="row">
        <button
          id="control"
          class="switch"
          type="button"
          role="switch"
          aria-checked=${String(this.checked)}
          aria-labelledby="label"
          aria-describedby=${ifDefined(this.hasHint ? 'hint' : undefined)}
          ?disabled=${this.isDisabled}
          @click=${this.#toggle}
        >
          <span class="track"><span class="thumb"></span></span>
        </button>
        <label id="label" for="control">${this.label}</label>
        <span class="state" aria-hidden="true">${this.checked ? this.onText : this.offText}</span>
      </div>
      ${this.renderHint()}
    </div>`
  }
}

export function defineSwitch(): void {
  define('sub-switch', SubSwitch)
}

declare global {
  interface HTMLElementTagNameMap {
    'sub-switch': SubSwitch
  }
}
