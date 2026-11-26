import { css, html } from 'lit'
import { announce } from './announce'
import { SubFormControl, formControlStyles, type FormValue } from './shared/form-control'
import { icons } from './shared/icons'
import { messages } from './shared/messages'
import { define } from './shared/utils'

export interface TransferItem {
  key: string
  label: string
  disabled?: boolean
}

/**
 * Move items between two lists ("Available" -> "Selected"). Each list is a labelled group of NATIVE
 * checkboxes with a select-all; two real buttons move the ticked items and announce the result. No
 * drag-only interaction. The selected keys are submitted under `name`.
 */
export class SubTransfer extends SubFormControl {
  static override properties = {
    items: { attribute: false },
    value: { attribute: false },
    titles: { attribute: false },
    _left: { state: true },
    _right: { state: true },
  }

  declare items: TransferItem[]
  /** Keys in the right-hand list */
  declare value: string[]
  declare titles: [string, string]
  declare _left: Set<string>
  declare _right: Set<string>

  #default: string[] = []

  constructor() {
    super()
    this.items = []
    this.value = []
    this.titles = ['Available', 'Selected']
    this._left = new Set()
    this._right = new Set()
  }

  static override styles = [
    ...formControlStyles,
    css`
      .wrap {
        display: grid;
        grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
        gap: var(--sub-transfer-gap);
        align-items: center;
      }

      @container (inline-size < 36rem) {
        .wrap {
          grid-template-columns: minmax(0, 1fr);
        }
      }

      :host {
        inline-size: 100%; /* a container never shrink-wraps its content: fill the line (also inside a flex row) */
        container-type: inline-size;
      }

      fieldset.list {
        margin: 0;
        padding: var(--sub-transfer-padding);
        border: var(--sub-transfer-border-width) solid var(--sub-color-border);
        border-radius: var(--sub-transfer-radius);
        background: var(--sub-color-surface);
      }

      legend {
        font-weight: var(--sub-weight-bold);
      }

      ul {
        max-block-size: var(--sub-transfer-list-height);
        margin: var(--sub-space-2) 0 0;
        padding: 0;
        overflow: auto;
        list-style: none;
      }

      .row {
        display: flex;
        gap: var(--sub-space-3);
        align-items: center;
        min-block-size: var(--sub-target-size);
        cursor: pointer;
      }

      .row input {
        inline-size: 1.375rem;
        block-size: 1.375rem;
        margin: 0;
        accent-color: var(--sub-color-accent);
      }

      .all {
        padding-block-end: var(--sub-space-2);
        border-block-end: var(--sub-border-width-thin) solid var(--sub-color-border-subtle);
      }

      .moves {
        display: grid;
        gap: var(--sub-target-gap);
        justify-items: center;
      }

      @container (inline-size < 36rem) {
        .moves {
          grid-auto-flow: column;
          justify-content: center;
        }
      }

      button {
        display: inline-flex;
        gap: var(--sub-space-1);
        align-items: center;
        min-block-size: var(--sub-target-size);
        padding: 0 var(--sub-space-3);
        border: var(--sub-field-border-width) solid var(--sub-color-border);
        border-radius: var(--sub-field-radius);
        background: var(--sub-color-surface);
        color: var(--sub-color-text);
        font: var(--sub-weight-semibold) var(--sub-text-md) / 1 var(--sub-font-sans);
        cursor: pointer;
      }

      button:disabled {
        background: var(--sub-color-disabled);
        color: var(--sub-color-on-disabled);
        cursor: not-allowed;
      }
    `,
  ]

  override connectedCallback(): void {
    super.connectedCallback()
    this.#default = [...this.value]
  }

  protected control(): HTMLElement | null {
    return this.renderRoot.querySelector('input')
  }
  protected formValue(): FormValue {
    const data = new FormData()
    for (const k of this.value) data.append(this.name || 'items', k)
    return this.value.length ? data : null
  }
  protected resetValue(): void {
    this.value = [...this.#default]
  }
  protected restoreValue(): void {
    /* not restorable */
  }
  protected override customFlags(): ValidityStateFlags {
    return this.required && !this.value.length ? { valueMissing: true } : {}
  }

  #label(key: string): string {
    return this.items.find((i) => i.key === key)?.label ?? key
  }

  #toggle(side: '_left' | '_right', key: string, on: boolean): void {
    const next = new Set(this[side])
    on ? next.add(key) : next.delete(key)
    this[side] = next
  }

  #move(toRight: boolean): void {
    const picked = [...(toRight ? this._left : this._right)]
    if (!picked.length) return
    this.value = toRight ? [...this.value, ...picked] : this.value.filter((k) => !picked.includes(k))
    this._left = new Set()
    this._right = new Set()
    announce(`${picked.length} moved to ${this.titles[toRight ? 1 : 0]}: ${picked.map((k) => this.#label(k)).join(', ')}`)
    this.dispatchEvent(new Event('change', { bubbles: true }))
  }

  #list(side: '_left' | '_right', title: string, keys: string[]) {
    const selected = this[side]
    const enabled = keys.filter((k) => !this.items.find((i) => i.key === k)?.disabled)
    const all = enabled.length > 0 && enabled.every((k) => selected.has(k))
    const some = enabled.some((k) => selected.has(k))
    return html`<fieldset class="list">
      <legend>${title} (${selected.size}/${keys.length})</legend>
      <label class="row all">
        <input
          type="checkbox"
          .checked=${all}
          .indeterminate=${some && !all}
          ?disabled=${!enabled.length || this.isDisabled}
          @change=${(e: Event) => (this[side] = (e.target as HTMLInputElement).checked ? new Set(enabled) : new Set())}
        />
        ${messages.selectAll}
      </label>
      <ul>
        ${keys.map((k) => {
          const item = this.items.find((i) => i.key === k)
          return html`<li>
            <label class="row">
              <input type="checkbox" .checked=${selected.has(k)} ?disabled=${item?.disabled || this.isDisabled} @change=${(e: Event) => this.#toggle(side, k, (e.target as HTMLInputElement).checked)} />
              ${item?.label ?? k}
            </label>
          </li>`
        })}
      </ul>
    </fieldset>`
  }

  protected override render() {
    const right = this.value
    const left = this.items.map((i) => i.key).filter((k) => !right.includes(k))
    return html`<fieldset class="field" ?disabled=${this.isDisabled}>
      <legend>${this.labelContent()}</legend>
      ${this.renderHint()}
      <div class="wrap">
        ${this.#list('_left', this.titles[0], left)}
        <div class="moves">
          <button type="button" ?disabled=${this._left.size === 0 || this.isDisabled} @click=${() => this.#move(true)}>
            ${messages.moveToRight(this.titles[1])}${icons.chevron_right()}
          </button>
          <button type="button" ?disabled=${this._right.size === 0 || this.isDisabled} @click=${() => this.#move(false)}>
            ${icons.chevron_left()}${messages.moveToLeft(this.titles[0])}
          </button>
        </div>
        ${this.#list('_right', this.titles[1], right)}
      </div>
      ${this.renderError()}
    </fieldset>`
  }
}

export function defineTransfer(): void {
  define('sub-transfer', SubTransfer)
}

declare global {
  interface HTMLElementTagNameMap {
    'sub-transfer': SubTransfer
  }
}
