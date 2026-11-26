import { css, html, nothing, type PropertyDeclarations, type PropertyValues } from 'lit'
import { live } from 'lit/directives/live.js'
import { SubFormControl, formControlStyles, type FormValue } from './shared/form-control'
import { icons } from './shared/icons'
import { Popup, filterItems, highlight, isSheet, listboxStyles, renderGroups, sheetHeader, sheetStyles, supportsPopover, type ListItem } from './shared/listbox'
import { messages, type MessageContext } from './shared/messages'
import { debounce, define, emit, wrap } from './shared/utils'
import { OptionsController, defineOption } from './option'

type Focusable = 'trigger' | 'listbox' | 'search'

/**
 * Select built from our own parts (not the native `<select>`), so the closed field AND the option panel
 * share the library's look, tokens and keyboard contract. ARIA "select-only combobox" + listbox.
 *
 * - `<sub-option value="es" description="Spain" group="Europe" disabled>Spanish</sub-option>` or `el.options = [...]`
 * - `multiple`: several values, shown as removable tags; the panel stays open while you tick. FormData gets one
 *   entry per value under `name`.
 * - `searchable`: a search box at the top of the panel filters the options (accent/case-insensitive).
 * - `clearable`: a clear button. `placeholder` is the text of the empty state.
 * - On screens narrower than 40rem the panel is a full-screen sheet with a Done button.
 *
 * Keys (focus stays on the field, `aria-activedescendant` marks the option): Down/Up/Alt+Down open, Up/Down move,
 * Home/End, Enter/Space choose, a letter jumps to a match, Esc closes and keeps focus on the field, Tab closes.
 */
export class SubSelect extends SubFormControl {
  static override properties: PropertyDeclarations = {
    value: { type: String },
    placeholder: { type: String },
    multiple: { type: Boolean, reflect: true },
    searchable: { type: Boolean, reflect: true },
    clearable: { type: Boolean },
    options: { attribute: false },
    selected: { attribute: false },
    _open: { state: true },
    _active: { state: true },
    _query: { state: true },
    _status: { state: true },
  }

  /** Selected value. With `multiple`, the values joined by "," (use `selected` for values that contain commas). */
  declare value: string
  /** Text shown while nothing is selected, e.g. "Choose a country" */
  declare placeholder: string
  declare multiple: boolean
  declare searchable: boolean
  declare clearable: boolean
  /** Programmatic options, merged after the `<sub-option>` children */
  declare options: ListItem[]
  /** The selected values as an array (always in sync with `value`) */
  declare selected: string[]
  declare _open: boolean
  declare _active: number
  declare _query: string
  declare _status: string

  readonly #declared = new OptionsController(this)
  readonly #popup = new Popup(this, {
    panel: () => this.renderRoot.querySelector<HTMLElement>('.panel'),
    anchor: () => this.#trigger,
    sheet: true,
    onClosed: () => this.#afterExternalClose(),
  })
  #default = ''
  #mode: Focusable = 'trigger'
  #typed = ''
  #typedTimer: ReturnType<typeof setTimeout> | undefined
  #swallowSpaceUp = false

  constructor() {
    super()
    this.value = ''
    this.placeholder = ''
    this.multiple = false
    this.searchable = false
    this.clearable = false
    this.options = []
    this.selected = []
    this._open = false
    this._active = -1
    this._query = ''
    this._status = ''
  }

  static override styles = [
    ...formControlStyles,
    listboxStyles,
    sheetStyles,
    css`
      .wrap {
        position: relative;
        display: flex;
      }

      .trigger {
        display: flex;
        gap: var(--sub-space-2);
        align-items: center;
        justify-content: space-between;
        text-align: start;
        cursor: pointer;
        touch-action: manipulation;
      }

      /* a <button> matches :read-only, which would give it the read-only field background */
      .trigger.control:not(:disabled) {
        background: var(--sub-color-surface);
      }

      .trigger:disabled {
        cursor: not-allowed;
      }

      .value {
        min-inline-size: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .value.placeholder {
        color: var(--sub-color-muted);
      }

      .trigger:disabled .value.placeholder {
        color: inherit;
      }

      .chevron {
        display: grid;
        flex: none;
        place-items: center;
        transition: rotate var(--sub-duration-base) var(--sub-ease-standard);
      }

      .trigger[aria-expanded='true'] .chevron {
        rotate: 180deg;
      }

      .has-clear .trigger {
        padding-inline-end: calc(var(--sub-field-min-size) + var(--sub-icon-md) + var(--sub-space-2));
      }

      .clear {
        position: absolute;
        inset-block: 0;
        inset-inline-end: calc(var(--sub-icon-md) + var(--sub-field-padding-inline));
        display: grid;
        place-items: center;
        inline-size: var(--sub-field-min-size);
        padding: 0;
        border: 0;
        background: transparent;
        color: var(--sub-color-text);
        cursor: pointer;
      }

      .tags {
        display: flex;
        flex-wrap: wrap;
        gap: var(--sub-space-2);
        margin: 0;
        padding: 0;
        list-style: none;
      }

      .tag {
        box-sizing: content-box; /* the 44px target is the inside, the border is extra */
        display: inline-flex;
        align-items: center;
        min-block-size: var(--sub-target-size);
        padding-inline-start: var(--sub-space-3);
        border: var(--sub-field-border-width) solid var(--sub-color-border);
        border-radius: var(--sub-listbox-tag-radius);
        background: var(--sub-color-surface-sunken);
        font-size: var(--sub-text-md);
      }

      .tag button {
        display: grid;
        place-items: center;
        align-self: stretch;
        inline-size: var(--sub-target-size);
        padding: 0;
        border: 0;
        border-radius: inherit;
        background: transparent;
        color: inherit;
        cursor: pointer;
      }

      @media (hover: hover) {
        .tag button:hover {
          background: var(--sub-color-surface-hover);
        }
      }
    `,
  ]

  override connectedCallback(): void {
    super.connectedCallback()
    defineOption()
    this.#default = this.value
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback()
    this.#popup.dispose()
  }

  // ---- form contract -------------------------------------------------------

  protected control(): HTMLElement | null {
    return this.#trigger
  }
  protected formValue(): FormValue {
    if (!this.multiple) return this.selected[0] ?? ''
    if (!this.name) return null
    const data = new FormData()
    for (const v of this.selected) data.append(this.name, v)
    return data
  }
  protected resetValue(): void {
    this.#setSelected(this.#parse(this.#default))
  }
  protected restoreValue(state: FormValue): void {
    if (state instanceof FormData) this.#setSelected(state.getAll(this.name).map(String))
    else this.#setSelected(typeof state === 'string' ? this.#parse(state) : [])
  }
  protected override customFlags(): ValidityStateFlags {
    return { valueMissing: this.required && this.selected.length === 0 }
  }
  protected override messageContext(): MessageContext {
    return { label: this.label, kind: 'choice' }
  }

  // ---- state ---------------------------------------------------------------

  #parse(value: string): string[] {
    return value === '' ? [] : this.multiple ? value.split(',') : [value]
  }

  #setSelected(next: string[]): void {
    this.selected = next
    this.value = next.join(',')
  }

  protected override willUpdate(changed: PropertyValues): void {
    super.willUpdate(changed)
    if ((changed.has('value') || changed.has('multiple')) && this.value !== this.selected.join(',')) this.selected = this.#parse(this.value)
  }

  /** Every option: `<sub-option>` children, then `options`; a single select with a placeholder can be emptied again */
  get #all(): ListItem[] {
    const items: ListItem[] = [
      ...this.#declared.options.map((o) => ({ value: o.value, label: o.label, description: o.description, disabled: o.disabled, group: o.group })),
      ...this.options,
    ]
    return items
  }

  get #hasEmptyRow(): boolean {
    return !this.multiple && !this.required && !this.searchable && !this.clearable && Boolean(this.placeholder)
  }

  /** What the panel lists right now: the empty row (if any), then the options that match the search */
  get #visible(): ListItem[] {
    const rows = this.searchable ? filterItems(this.#all, this._query) : this.#all
    return this.#hasEmptyRow ? [{ value: '', label: this.placeholder }, ...rows] : rows
  }

  #labelOf(value: string): string {
    return this.#all.find((o) => o.value === value)?.label ?? value
  }

  #isSelected(item: ListItem): boolean {
    return item.value === '' ? this.selected.length === 0 : this.selected.includes(item.value)
  }

  get #trigger(): HTMLButtonElement | null {
    return this.renderRoot.querySelector<HTMLButtonElement>('.trigger')
  }

  get #focusEl(): HTMLElement | null {
    return this.renderRoot.querySelector<HTMLElement>(this.#mode === 'search' ? '#search' : this.#mode === 'listbox' ? '#listbox' : '.trigger')
  }

  // ---- open / close ----------------------------------------------------------

  async #openPanel(seed = ''): Promise<void> {
    if (this.isDisabled || this._open) return
    this.#mode = this.searchable ? 'search' : isSheet() ? 'listbox' : 'trigger'
    this._query = seed
    this._open = true
    const vis = this.#visible
    const firstSelected = vis.findIndex((i) => this.#isSelected(i) && !i.disabled && i.value !== '')
    this._active = firstSelected >= 0 ? firstSelected : this.#next(-1, 1)
    await this.updateComplete
    if (!this.#popup.show()) return
    this.#focusEl?.focus({ preventScroll: true })
    this.#settle()
  }

  #close(returnFocus = true): void {
    if (!this._open) return
    this.#popup.hide()
    this._open = false
    this._active = -1
    this._query = ''
    this._status = ''
    if (returnFocus) this.#trigger?.focus()
  }

  /** The browser closed the panel (Esc, outside click): bring the state in line */
  #afterExternalClose(): void {
    this._open = false
    this._active = -1
    this._query = ''
    this._status = ''
    const active = document.activeElement
    if (!active || active === document.body) this.#trigger?.focus()
    else this.onControlBlur()
  }

  // ---- choosing --------------------------------------------------------------

  #commit(next: string[]): void {
    this.#setSelected(next)
    this.dispatchEvent(new Event('change', { bubbles: true }))
    emit(this, 'sub-select', { value: this.value, values: next })
  }

  #choose(item: ListItem): void {
    if (item.disabled) return
    if (item.value === '') {
      this.#commit([])
      this.#close()
      return
    }
    if (!this.multiple) {
      this.#commit([item.value])
      this.#close()
      return
    }
    const set = new Set(this.selected)
    if (set.has(item.value)) set.delete(item.value)
    else set.add(item.value)
    this.#commit(this.#all.filter((o) => set.has(o.value)).map((o) => o.value))
  }

  #remove(value: string): void {
    this.#commit(this.selected.filter((v) => v !== value))
    this.#trigger?.focus()
  }

  #clear(): void {
    this.#commit([])
    this.#trigger?.focus()
  }

  // ---- keyboard --------------------------------------------------------------

  /** Next enabled index from `from` in direction `dir` (wraps); -1 when there is none */
  #next(from: number, dir: 1 | -1): number {
    const vis = this.#visible
    for (let step = 1; step <= vis.length; step++) {
      const i = wrap(from + dir * step, vis.length)
      if (!vis[i]?.disabled) return i
    }
    return -1
  }

  #typeAhead(key: string): void {
    clearTimeout(this.#typedTimer)
    this.#typed += key.toLowerCase()
    this.#typedTimer = setTimeout(() => (this.#typed = ''), 600)
    const vis = this.#visible
    const start = this.#typed.length === 1 ? this._active : this._active - 1
    for (let step = 1; step <= vis.length; step++) {
      const i = wrap(start + step, vis.length)
      const item = vis[i]
      if (item && !item.disabled && item.label.toLowerCase().startsWith(this.#typed)) {
        this._active = i
        return
      }
    }
  }

  #onTriggerKey = (event: KeyboardEvent): void => {
    if (this.isDisabled) return
    if (!this._open) {
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault()
        void this.#openPanel()
      } else if (!this.searchable && event.key.length === 1 && event.key !== ' ' && !event.ctrlKey && !event.metaKey && !event.altKey) {
        void this.#openPanel().then(() => this.#typeAhead(event.key))
      }
      return
    }
    this.#listKeys(event)
  }

  #onPanelKey = (event: KeyboardEvent): void => {
    const target = event.composedPath()[0] as HTMLElement
    if (target.closest('.sheet-head')) return // Done button: native Enter/Space
    this.#listKeys(event)
  }

  #listKeys(event: KeyboardEvent): void {
    const vis = this.#visible
    const typing = this.#mode === 'search'
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault()
        this._active = this.#next(this._active, 1)
        break
      case 'ArrowUp':
        event.preventDefault()
        this._active = this.#next(this._active, -1)
        break
      case 'Home':
        if (typing) return
        event.preventDefault()
        this._active = this.#next(-1, 1)
        break
      case 'End':
        if (typing) return
        event.preventDefault()
        this._active = this.#next(0, -1)
        break
      case 'Enter':
        event.preventDefault() // never submit the form or re-click the trigger
        if (vis[this._active]) this.#choose(vis[this._active]!)
        break
      case ' ':
        if (typing) return
        event.preventDefault()
        this.#swallowSpaceUp = true
        if (vis[this._active]) this.#choose(vis[this._active]!)
        break
      case 'Escape':
        event.preventDefault()
        event.stopPropagation() // closes the panel only, not a dialog around it
        this.#close()
        break
      case 'Tab':
        if (typing) this.#trigger?.focus() // Tab then continues from the field
        this.#close(false)
        break
      default:
        if (!typing && event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) this.#typeAhead(event.key)
    }
  }

  /** Space activates a button on key UP: swallow it after we handled the key down */
  #onKeyUp = (event: KeyboardEvent): void => {
    if (event.key === ' ' && this.#swallowSpaceUp) {
      event.preventDefault()
      this.#swallowSpaceUp = false
    }
  }

  #onSearch = (event: Event): void => {
    this._query = (event.target as HTMLInputElement).value
    this._active = this.#next(-1, 1) // the first match is ready for Enter
    this.#settle()
  }

  #settle = debounce(() => {
    if (!this._open) return
    const n = this.#visible.filter((i) => i.value !== '' || this.#hasEmptyRow).length
    this._status = n ? messages.results(n) : messages.noResults
  }, 400)

  #onTriggerClick = (): void => {
    if (this._open) this.#close()
    else if (Date.now() - this.#popup.lastHide > 250) void this.#openPanel()
  }

  protected override updated(changed: PropertyValues): void {
    super.updated(changed)
    if (!this._open) return
    if (changed.has('_query') || changed.has('selected')) this.#popup.place()
    if (changed.has('_active') && this._active >= 0) this.renderRoot.querySelector(`#opt-${this._active}`)?.scrollIntoView({ block: 'nearest' })
  }

  // ---- render ----------------------------------------------------------------

  #option = (item: ListItem, vis: ListItem[]) => {
    const i = vis.indexOf(item)
    const on = this.#isSelected(item)
    return html`<div
      id="opt-${i}"
      class="option"
      role="option"
      aria-selected=${on ? 'true' : 'false'}
      aria-disabled=${item.disabled ? 'true' : nothing}
      ?data-active=${i === this._active}
      @pointerdown=${(e: Event) => e.preventDefault()}
      @click=${() => this.#choose(item)}
    >
      ${this.multiple ? html`<span class="tick box" aria-hidden="true">${on ? icons.check() : nothing}</span>` : nothing}
      <span class="text"><span>${this.searchable ? highlight(item.label, this._query) : item.label}</span>${item.description ? html`<span class="desc">${item.description}</span>` : nothing}</span>
      ${!this.multiple ? html`<span class="tick" aria-hidden="true">${on ? icons.check() : nothing}</span>` : nothing}
    </div>`
  }

  protected override render() {
    const open = this._open
    const vis = this.#visible
    const active = open && this._active >= 0 ? `opt-${this._active}` : undefined
    const text = this.multiple ? (this.selected.length ? messages.selectedCount(this.selected.length) : '') : this.selected[0] !== undefined ? this.#labelOf(this.selected[0]) : ''
    const showClear = this.clearable && this.selected.length > 0 && !this.isDisabled
    return html`<div class="field">
      ${this.renderLabel()} ${this.renderHint()}
      <div class="wrap ${showClear ? 'has-clear' : ''}">
        <button
          id="control"
          class="control trigger"
          part="select"
          type="button"
          role="combobox"
          aria-haspopup="listbox"
          aria-expanded=${open ? 'true' : 'false'}
          aria-controls="listbox"
          aria-labelledby="label value"
          aria-required=${this.required ? 'true' : nothing}
          aria-activedescendant=${open && this.#mode === 'trigger' && active ? active : nothing}
          aria-invalid=${this.displayedError ? 'true' : nothing}
          aria-describedby=${this.describedBy() ?? nothing}
          ?disabled=${this.isDisabled}
          @click=${this.#onTriggerClick}
          @keydown=${this.#onTriggerKey}
          @keyup=${this.#onKeyUp}
          @blur=${() => !this._open && this.onControlBlur()}
        >
          <span id="value" class="value ${text ? '' : 'placeholder'}">${text || this.placeholder}</span>
          <span class="chevron" aria-hidden="true">${icons.chevronDown()}</span>
        </button>
        ${showClear ? html`<button type="button" class="clear" aria-label=${messages.clearSelection(this.label)} @click=${() => this.#clear()}>${icons.close()}</button>` : nothing}
        <div
          id="panel"
          class="panel"
          part="panel"
          popover=${supportsPopover ? 'auto' : nothing}
          @keydown=${this.#onPanelKey}
          @keyup=${this.#onKeyUp}
        >
          ${sheetHeader(this.label, messages.done, () => this.#close())}
          ${this.searchable
            ? html`<div class="search">
                <input
                  id="search"
                  class="control"
                  type="text"
                  role="combobox"
                  autocomplete="off"
                  aria-expanded=${open ? 'true' : 'false'}
                  aria-controls="listbox"
                  aria-autocomplete="list"
                  aria-label=${messages.search(this.label)}
                  placeholder=${messages.search(this.label)}
                  aria-activedescendant=${active ?? nothing}
                  .value=${live(this._query)}
                  @input=${this.#onSearch}
                />
              </div>`
            : nothing}
          <div
            id="listbox"
            class="list"
            role="listbox"
            tabindex=${this.#mode === 'listbox' ? '-1' : nothing}
            aria-label=${this.label}
            aria-multiselectable=${this.multiple ? 'true' : nothing}
            aria-activedescendant=${open && this.#mode === 'listbox' && active ? active : nothing}
          >
            ${open ? renderGroups(vis, (item) => this.#option(item, vis), 'grp') : nothing}
          </div>
          ${open && !vis.length ? html`<div class="empty" aria-hidden="true">${messages.noResults}</div>` : nothing}
          <div class="sr-only" aria-live="polite">${this._status}</div>
        </div>
      </div>
      ${this.multiple && this.selected.length
        ? html`<ul class="tags">
            ${this.selected.map(
              (v) => html`<li class="tag"><span>${this.#labelOf(v)}</span><button type="button" aria-label=${messages.removeValue(this.#labelOf(v))} ?disabled=${this.isDisabled} @click=${() => this.#remove(v)}>${icons.close()}</button></li>`,
            )}
          </ul>`
        : nothing}
      ${this.renderError()}
    </div>`
  }
}

export function defineSelect(): void {
  defineOption()
  define('sub-select', SubSelect)
}

declare global {
  interface HTMLElementTagNameMap {
    'sub-select': SubSelect
  }
}
