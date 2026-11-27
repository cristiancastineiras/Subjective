import { css, html, nothing } from 'lit'
import { SubFormControl, formControlStyles, type FormValue } from './shared/form-control'
import { messages, type MessageContext } from './shared/messages'
import { define } from './shared/utils'
import { defineSelect, type SubSelect } from './select'

export interface CascaderOption {
  value: string
  label: string
  children?: CascaderOption[]
}

/**
 * Hierarchical choice as CHAINED SELECTS (country > region > city): each level appears once the previous
 * one is chosen and every level is a labelled <sub-select> (same panel, keyboard and phone sheet as the
 * select). The value is the path joined with `/`.
 *
 *   el.options = [{ value: 'es', label: 'Spain', children: [...] }]
 * @fires {Event} change - The value changed (native event: works with any framework and form library)
 */
export class SubCascader extends SubFormControl {
  static override properties = {
    options: { attribute: false },
    levels: { attribute: false },
    value: { type: String },
  }

  declare options: CascaderOption[]
  /** Labels per level (default "Level 1", "Level 2"...) */
  declare levels: string[]
  /** Path joined with "/" */
  declare value: string

  #default = ''

  constructor() {
    super()
    this.options = []
    this.levels = []
    this.value = ''
  }

  static override styles = [
    ...formControlStyles,
    css`
      .levels {
        display: grid;
        gap: var(--sub-cascader-gap);
      }


    `,
  ]

  override connectedCallback(): void {
    super.connectedCallback()
    this.#default = this.value
    defineSelect()
  }

  get #path(): string[] {
    return this.value ? this.value.split('/') : []
  }

  /** Options shown at each level for the current path */
  get #columns(): CascaderOption[][] {
    const cols: CascaderOption[][] = []
    let level: CascaderOption[] | undefined = this.options
    for (let i = 0; level?.length; i++) {
      cols.push(level)
      level = level.find((o) => o.value === this.#path[i])?.children
    }
    return cols
  }

  protected control(): HTMLElement | null {
    return this.renderRoot.querySelector('sub-select')
  }
  protected formValue(): FormValue {
    return this.value
  }
  protected resetValue(): void {
    this.value = this.#default
  }
  protected restoreValue(state: FormValue): void {
    this.value = typeof state === 'string' ? state : ''
  }
  protected override customFlags(): ValidityStateFlags {
    // Complete = the path reaches a leaf
    const complete = this.#columns.length === this.#path.length
    return this.required && !complete ? { valueMissing: true } : {}
  }
  protected override messageContext(): MessageContext {
    return { label: this.label, kind: 'choice' }
  }

  #pick(level: number, value: string): void {
    this.value = [...this.#path.slice(0, level), ...(value ? [value] : [])].join('/')
    this.dispatchEvent(new Event('change', { bubbles: true }))
  }

  protected override render() {
    return html`<fieldset class="field" ?disabled=${this.isDisabled}>
      <legend>${this.labelContent()}</legend>
      ${this.renderHint()}
      <div class="levels">
        ${this.#columns.map(
          (opts, i) => html`<sub-select
            no-indicator
            label=${this.levels[i] ?? messages.levelN(i + 1)}
            placeholder=${messages.choose}
            .options=${opts.map((o) => ({ value: o.value, label: o.label }))}
            .value=${this.#path[i] ?? ''}
            ?disabled=${this.isDisabled}
            @change=${(e: Event) => this.#pick(i, (e.target as SubSelect).value)}
          ></sub-select>`,
        )}
      </div>
      ${this.renderError()}
    </fieldset>`
  }
}

export function defineCascader(): void {
  defineSelect()
  define('sub-cascader', SubCascader)
}

declare global {
  interface HTMLElementTagNameMap {
    'sub-cascader': SubCascader
  }
}
