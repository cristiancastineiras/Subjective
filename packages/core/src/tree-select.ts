import { css, html, nothing, type PropertyDeclarations, type PropertyValues } from 'lit'
import { live } from 'lit/directives/live.js'
import { SubFormControl, formControlStyles, type FormValue } from './shared/form-control'
import { Popup, highlight, isSheet, listboxStyles, sheetHeader, sheetStyles, supportsPopover } from './shared/listbox'
import { messages, type MessageContext } from './shared/messages'
import { debounce, define, emit } from './shared/utils'
import { iconCheck, iconChevronRight, iconClose, iconKeyboardArrowDown } from './shared/material-icons'

export interface TreeSelectNode {
  value: string
  label: string
  children?: TreeSelectNode[]
  disabled?: boolean
}

interface Row {
  node: TreeSelectNode
  level: number
  setsize: number
  pos: number
  parent: string | null
  hasKids: boolean
  open: boolean
}

type Focusable = 'trigger' | 'tree' | 'search'

const norm = (s: string): string => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

/**
 * Tree select: a field that opens a tree of options (regions > countries > cities). ARIA tree inside a
 * popover; focus stays on the field (or the search box) and `aria-activedescendant` marks the item.
 *
 *   el.nodes = [{ value: 'eu', label: 'Europe', children: [{ value: 'es', label: 'Spain' }] }]
 *
 * - `multiple`: several values (tags under the field; FormData has one entry per value under `name`).
 * - `searchable`: filters the tree; parents of a match stay visible and open.
 * - `leaf-only`: only the leaves can be chosen (a parent just opens or closes).
 * - `expand-all`: start with every branch open. `clearable`, `placeholder` as in <sub-select>.
 * - Below 40rem the panel is a full-screen sheet with a Done button.
 *
 * Keys: Down/Up open and move, Right opens a branch (or enters it), Left closes it (or goes to the parent),
 * Home/End, Enter/Space choose, a letter jumps, Esc closes and keeps focus on the field, Tab closes.
 * shortcut: choosing a parent does not cascade to its children; upgrade when a "check all below" is needed.
 */
export class SubTreeSelect extends SubFormControl {
  static override properties: PropertyDeclarations = {
    nodes: { attribute: false },
    value: { type: String },
    selected: { attribute: false },
    expanded: { attribute: false },
    placeholder: { type: String },
    multiple: { type: Boolean, reflect: true },
    searchable: { type: Boolean, reflect: true },
    clearable: { type: Boolean },
    leafOnly: { type: Boolean, attribute: 'leaf-only' },
    allOpen: { type: Boolean, attribute: 'expand-all' },
    _open: { state: true },
    _active: { state: true },
    _query: { state: true },
    _status: { state: true },
  }

  declare nodes: TreeSelectNode[]
  /** Chosen value; with `multiple` the values joined by "," (use `selected` for values that contain commas) */
  declare value: string
  declare selected: string[]
  /** Values of the open branches */
  declare expanded: string[]
  declare placeholder: string
  declare multiple: boolean
  declare searchable: boolean
  declare clearable: boolean
  declare leafOnly: boolean
  declare allOpen: boolean
  declare _open: boolean
  /** `value` of the highlighted node */
  declare _active: string
  declare _query: string
  declare _status: string

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
  #seeded = false

  constructor() {
    super()
    this.nodes = []
    this.value = ''
    this.selected = []
    this.expanded = []
    this.placeholder = ''
    this.multiple = false
    this.searchable = false
    this.clearable = false
    this.leafOnly = false
    this.allOpen = false
    this._open = false
    this._active = ''
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
        box-sizing: content-box;
        display: inline-flex;
        align-items: center;
        min-block-size: var(--sub-target-size);
        padding-inline-start: var(--sub-space-3);
        border: var(--sub-field-border-width) solid var(--sub-color-border);
        border-radius: var(--sub-listbox-tag-radius);
        background: var(--sub-color-surface-sunken);
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

      /* tree rows reuse the option look; the indent comes from the level */
      .option {
        padding-inline-start: calc(var(--sub-listbox-item-padding-inline) + var(--sub-tree-select-indent) * (var(--_level) - 1));
      }

      .twist {
        display: grid;
        flex: none;
        place-items: center;
        inline-size: var(--sub-icon-md);
        block-size: var(--sub-icon-md);
        margin-inline-end: calc(var(--sub-space-3) * -1 + var(--sub-space-1));
      }

      .twist .icon {
        transition: rotate var(--sub-duration-base) var(--sub-ease-standard);
      }

      .row-open .twist .icon {
        rotate: 90deg;
      }
    `,
  ]

  override connectedCallback(): void {
    super.connectedCallback()
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
    if (!this.#seeded && this.allOpen && this.nodes.length) {
      this.#seeded = true
      this.expanded = this.#all(this.nodes).filter((n) => n.children?.length).map((n) => n.value)
    }
  }

  #all(nodes: TreeSelectNode[]): TreeSelectNode[] {
    return nodes.flatMap((n) => [n, ...this.#all(n.children ?? [])])
  }

  #labelOf(value: string): string {
    return this.#all(this.nodes).find((n) => n.value === value)?.label ?? value
  }

  /** The tree filtered by the search box: a match keeps its subtree, a parent of a match stays */
  #filter(nodes: TreeSelectNode[], q: string): TreeSelectNode[] {
    return nodes.flatMap((n) => {
      if (norm(n.label).includes(q)) return [n]
      const kids = this.#filter(n.children ?? [], q)
      return kids.length ? [{ ...n, children: kids }] : []
    })
  }

  /** Visible rows, depth first (closed branches hide their children; a search opens everything) */
  get #rows(): Row[] {
    const q = this.searchable ? norm(this._query.trim()) : ''
    const roots = q ? this.#filter(this.nodes, q) : this.nodes
    const out: Row[] = []
    const walk = (list: TreeSelectNode[], level: number, parent: string | null) => {
      list.forEach((node, i) => {
        const hasKids = Boolean(node.children?.length)
        const open = hasKids && (q !== '' || this.expanded.includes(node.value))
        out.push({ node, level, setsize: list.length, pos: i + 1, parent, hasKids, open })
        if (open) walk(node.children!, level + 1, node.value)
      })
    }
    walk(roots, 1, null)
    return out
  }

  get #trigger(): HTMLButtonElement | null {
    return this.renderRoot.querySelector<HTMLButtonElement>('.trigger')
  }

  get #focusEl(): HTMLElement | null {
    return this.renderRoot.querySelector<HTMLElement>(this.#mode === 'search' ? '#search' : this.#mode === 'tree' ? '#tree' : '.trigger')
  }

  #index(value = this._active): number {
    return this.#rows.findIndex((r) => r.node.value === value)
  }

  // ---- open / close ----------------------------------------------------------

  async #openPanel(): Promise<void> {
    if (this.isDisabled || this._open) return
    this.#mode = this.searchable ? 'search' : isSheet() ? 'tree' : 'trigger'
    this._query = ''
    // open the branches that lead to the chosen value
    const path = this.#pathTo(this.selected[0])
    if (path.length) this.expanded = [...new Set([...this.expanded, ...path])]
    this._open = true
    const rows = this.#rows
    this._active = (rows.find((r) => this.selected.includes(r.node.value) && !r.node.disabled) ?? this.#firstChoice(rows))?.node.value ?? ''
    await this.updateComplete
    if (!this.#popup.show()) return
    this.#focusEl?.focus({ preventScroll: true })
    this.#settle()
  }

  /** The row Enter would choose first: enabled, and a leaf when only leaves can be chosen */
  #firstChoice(rows: Row[]): Row | undefined {
    return rows.find((r) => !r.node.disabled && !(this.leafOnly && r.hasKids)) ?? rows.find((r) => !r.node.disabled)
  }

  /** Values of the ancestors of `value` */
  #pathTo(value: string | undefined, nodes = this.nodes, trail: string[] = []): string[] {
    if (value === undefined) return []
    for (const n of nodes) {
      if (n.value === value) return trail
      const found = this.#pathTo(value, n.children ?? [], [...trail, n.value])
      if (found.length || n.children?.some((c) => c.value === value)) return found.length ? found : [...trail, n.value]
    }
    return []
  }

  #close(returnFocus = true): void {
    if (!this._open) return
    this.#popup.hide()
    this._open = false
    this._active = ''
    this._query = ''
    this._status = ''
    if (returnFocus) this.#trigger?.focus()
  }

  #afterExternalClose(): void {
    this._open = false
    this._active = ''
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

  #setOpen(value: string, open: boolean): void {
    this.expanded = open ? [...new Set([...this.expanded, value])] : this.expanded.filter((v) => v !== value)
  }

  #activate(row: Row): void {
    if (row.node.disabled) return
    if (row.hasKids && this.leafOnly) {
      this.#setOpen(row.node.value, !row.open)
      return
    }
    if (!this.multiple) {
      this.#commit([row.node.value])
      this.#close()
      return
    }
    const set = new Set(this.selected)
    if (set.has(row.node.value)) set.delete(row.node.value)
    else set.add(row.node.value)
    this.#commit(this.#all(this.nodes).filter((n) => set.has(n.value)).map((n) => n.value))
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

  #move(to: number): void {
    const rows = this.#rows
    const next = rows[Math.min(Math.max(to, 0), rows.length - 1)]
    if (next) this._active = next.node.value
  }

  /** Next enabled row from `from` in `dir`, staying inside the list */
  #step(from: number, dir: 1 | -1): number {
    const rows = this.#rows
    for (let i = from + dir; i >= 0 && i < rows.length; i += dir) if (!rows[i]!.node.disabled) return i
    return from
  }

  #typeAhead(key: string): void {
    clearTimeout(this.#typedTimer)
    this.#typed += key.toLowerCase()
    this.#typedTimer = setTimeout(() => (this.#typed = ''), 600)
    const rows = this.#rows
    const start = this.#index() + (this.#typed.length === 1 ? 1 : 0)
    for (let step = 0; step < rows.length; step++) {
      const row = rows[(start + step) % rows.length]!
      if (!row.node.disabled && row.node.label.toLowerCase().startsWith(this.#typed)) {
        this._active = row.node.value
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
    this.#treeKeys(event)
  }

  #onPanelKey = (event: KeyboardEvent): void => {
    if ((event.composedPath()[0] as HTMLElement).closest('.sheet-head')) return
    this.#treeKeys(event)
  }

  #treeKeys(event: KeyboardEvent): void {
    const rows = this.#rows
    const i = this.#index()
    const row = rows[i]
    const typing = this.#mode === 'search'
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault()
        this._active = rows[this.#step(i < 0 ? -1 : i, 1)]?.node.value ?? ''
        break
      case 'ArrowUp':
        event.preventDefault()
        this._active = rows[this.#step(i < 0 ? rows.length : i, -1)]?.node.value ?? ''
        break
      case 'ArrowRight':
        if (typing || !row?.hasKids) return
        event.preventDefault()
        if (!row.open) this.#setOpen(row.node.value, true)
        else this.#move(i + 1)
        break
      case 'ArrowLeft':
        if (typing || !row) return
        event.preventDefault()
        if (row.hasKids && row.open) this.#setOpen(row.node.value, false)
        else if (row.parent) this._active = row.parent
        break
      case 'Home':
        if (typing) return
        event.preventDefault()
        this._active = rows[this.#step(-1, 1)]?.node.value ?? ''
        break
      case 'End':
        if (typing) return
        event.preventDefault()
        this._active = rows[this.#step(rows.length, -1)]?.node.value ?? ''
        break
      case 'Enter':
        event.preventDefault()
        if (row) this.#activate(row)
        break
      case ' ':
        if (typing) return
        event.preventDefault()
        this.#swallowSpaceUp = true
        if (row) this.#activate(row)
        break
      case 'Escape':
        event.preventDefault()
        event.stopPropagation()
        this.#close()
        break
      case 'Tab':
        if (typing) this.#trigger?.focus()
        this.#close(false)
        break
      default:
        if (!typing && event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) this.#typeAhead(event.key)
    }
  }

  #onKeyUp = (event: KeyboardEvent): void => {
    if (event.key === ' ' && this.#swallowSpaceUp) {
      event.preventDefault()
      this.#swallowSpaceUp = false
    }
  }

  #onSearch = (event: Event): void => {
    this._query = (event.target as HTMLInputElement).value
    this._active = this.#firstChoice(this.#rows)?.node.value ?? ''
    this.#settle()
  }

  #settle = debounce(() => {
    if (!this._open) return
    const n = this.#rows.length
    this._status = n ? messages.results(n) : messages.noResults
  }, 400)

  #onTriggerClick = (): void => {
    if (this._open) this.#close()
    else if (Date.now() - this.#popup.lastHide > 250) void this.#openPanel()
  }

  protected override updated(changed: PropertyValues): void {
    super.updated(changed)
    if (!this._open) return
    if (changed.has('_query') || changed.has('expanded') || changed.has('selected')) this.#popup.place()
    if (changed.has('_active') && this._active) this.renderRoot.querySelector(`#ti-${this.#index()}`)?.scrollIntoView({ block: 'nearest' })
  }

  // ---- render ----------------------------------------------------------------

  #row = (row: Row, i: number) => {
    const on = this.selected.includes(row.node.value)
    return html`<div
      id="ti-${i}"
      class="option ${row.open ? 'row-open' : ''}"
      role="treeitem"
      style="--_level: ${row.level}"
      aria-level=${row.level}
      aria-setsize=${row.setsize}
      aria-posinset=${row.pos}
      aria-expanded=${row.hasKids ? (row.open ? 'true' : 'false') : nothing}
      aria-selected=${on ? 'true' : 'false'}
      aria-disabled=${row.node.disabled ? 'true' : nothing}
      ?data-active=${row.node.value === this._active}
      @pointerdown=${(e: Event) => e.preventDefault()}
      @click=${() => this.#activate(row)}
    >
      <span
        class="twist"
        aria-hidden="true"
        @click=${(e: Event) => {
          if (!row.hasKids) return
          e.stopPropagation()
          this.#setOpen(row.node.value, !row.open)
        }}
        >${row.hasKids ? iconChevronRight() : nothing}</span
      >
      ${this.multiple ? html`<span class="tick box" aria-hidden="true">${on ? iconCheck() : nothing}</span>` : nothing}
      <span class="text"><span>${this.searchable ? highlight(row.node.label, this._query) : row.node.label}</span></span>
      ${!this.multiple ? html`<span class="tick" aria-hidden="true">${on ? iconCheck() : nothing}</span>` : nothing}
    </div>`
  }

  protected override render() {
    const open = this._open
    const rows = this.#rows
    const activeIdx = open && this._active ? this.#index() : -1
    const active = activeIdx >= 0 ? `ti-${activeIdx}` : undefined
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
          aria-haspopup="tree"
          aria-expanded=${open ? 'true' : 'false'}
          aria-controls="tree"
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
          <span class="chevron" aria-hidden="true">${iconKeyboardArrowDown()}</span>
        </button>
        ${showClear ? html`<button type="button" class="clear" aria-label=${messages.clearSelection(this.label)} @click=${() => this.#clear()}>${iconClose()}</button>` : nothing}
        <div id="panel" class="panel" part="panel" popover=${supportsPopover ? 'auto' : nothing} @keydown=${this.#onPanelKey} @keyup=${this.#onKeyUp}>
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
                  aria-controls="tree"
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
            id="tree"
            class="list"
            role="tree"
            tabindex=${this.#mode === 'tree' ? '-1' : nothing}
            aria-label=${this.label}
            aria-multiselectable=${this.multiple ? 'true' : nothing}
            aria-activedescendant=${open && this.#mode === 'tree' && active ? active : nothing}
          >
            ${open ? rows.map(this.#row) : nothing}
          </div>
          ${open && !rows.length ? html`<div class="empty" aria-hidden="true">${messages.noResults}</div>` : nothing}
          <div class="sr-only" aria-live="polite">${this._status}</div>
        </div>
      </div>
      ${this.multiple && this.selected.length
        ? html`<ul class="tags">
            ${this.selected.map(
              (v) => html`<li class="tag"><span>${this.#labelOf(v)}</span><button type="button" aria-label=${messages.removeValue(this.#labelOf(v))} ?disabled=${this.isDisabled} @click=${() => this.#remove(v)}>${iconClose()}</button></li>`,
            )}
          </ul>`
        : nothing}
      ${this.renderError()}
    </div>`
  }
}

export function defineTreeSelect(): void {
  define('sub-tree-select', SubTreeSelect)
}

declare global {
  interface HTMLElementTagNameMap {
    'sub-tree-select': SubTreeSelect
  }
}
