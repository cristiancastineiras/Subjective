import { LitElement, css, html, nothing, type TemplateResult } from 'lit'
import { announce } from './announce'
import { icons } from './shared/icons'
import { messages } from './shared/messages'
import { baseStyles, focusInset, focusStyles, iconStyles, visuallyHidden } from './shared/styles'
import { define, emit, warn } from './shared/utils'

export interface TableColumn<Row = Record<string, unknown>> {
  key: string
  label: string
  sortable?: boolean
  align?: 'start' | 'center' | 'end'
  /** Custom cell content (badges, links, actions) */
  render?: (row: Row) => TemplateResult | string | number
}

type Row = Record<string, unknown>

/**
 * Accessible DATA table: a real `<table>` with a `<caption>` (required), `th scope="col"` headers, the
 * first column as the row header (`th scope="row"`), sortable headers as buttons with `aria-sort`, an
 * optional "select" column (native checkboxes, each named after its row), and a keyboard-focusable
 * scroll region so wide tables never trap sideways scrolling. Sorting/selection are announced.
 *
 *   el.columns = [{ key: 'name', label: 'Name', sortable: true }, ...]
 *   el.rows = [{ id: 1, name: 'Ana' }, ...]
 *
 * Sub-rows: give a row a `children` array (rows of the same shape, unique keys) and its first cell gets a
 * disclosure button ("Sub-rows of Atlas", `aria-expanded`, `aria-controls` the child rows). Sorting applies
 * within each level, ticking a parent ticks its descendants (the parent shows "mixed" when only some are
 * ticked). `expanded` holds the open keys; `expandAll()` / `collapseAll()` / `expand-all` set them in bulk.
 *
 * Not for layout. `sorting="server"` only emits `sub-sort` and leaves the order to you.
 */
export class SubTable extends LitElement {
  static override properties = {
    caption: { type: String },
    columns: { attribute: false },
    rows: { attribute: false },
    rowKey: { type: String, attribute: 'row-key' },
    selectable: { type: Boolean },
    selected: { attribute: false },
    sortKey: { type: String, attribute: 'sort-key' },
    sortDir: { type: String, attribute: 'sort-dir' },
    sorting: { type: String },
    emptyText: { type: String, attribute: 'empty-text' },
    striped: { type: Boolean, reflect: true },
    childrenKey: { type: String, attribute: 'children-key' },
    expanded: { attribute: false },
    allOpen: { type: Boolean, attribute: 'expand-all' },
  }

  /** Describes the table. Required: it is its accessible name */
  declare caption: string
  declare columns: TableColumn[]
  declare rows: Row[]
  declare rowKey: string
  declare selectable: boolean
  declare selected: string[]
  declare sortKey: string
  declare sortDir: 'ascending' | 'descending'
  declare sorting: 'client' | 'server'
  declare emptyText: string
  declare striped: boolean
  /** Row property that holds the sub-rows */
  declare childrenKey: string
  /** Keys of the rows whose sub-rows are shown */
  declare expanded: string[]
  /** Start with every parent open */
  declare allOpen: boolean

  constructor() {
    super()
    this.caption = ''
    this.columns = []
    this.rows = []
    this.rowKey = 'id'
    this.selectable = false
    this.selected = []
    this.sortKey = ''
    this.sortDir = 'ascending'
    this.sorting = 'client'
    this.emptyText = 'No data to show'
    this.striped = false
    this.childrenKey = 'children'
    this.expanded = []
    this.allOpen = false
  }

  static override styles = [
    baseStyles,
    focusStyles,
    iconStyles,
    visuallyHidden,
    css`
      :host {
        display: block;
        min-inline-size: 0;
        font-family: var(--sub-font-sans);
        color: var(--sub-color-text);
      }

      .scroll {
        overflow-x: auto;
        border: var(--sub-table-border-width) solid var(--sub-color-border-subtle);
        border-radius: var(--sub-table-radius);
        background: var(--sub-color-surface);
      }

      table {
        inline-size: 100%;
        border-collapse: collapse;
        font-size: var(--sub-text-md);
      }

      caption {
        padding: var(--sub-table-padding-block) var(--sub-table-padding-inline);
        text-align: start;
        font-size: var(--sub-text-lg);
        font-weight: var(--sub-weight-bold);
      }

      th,
      td {
        padding: var(--sub-table-padding-block) var(--sub-table-padding-inline);
        border-block-start: var(--sub-table-border-width) solid var(--sub-color-border-subtle);
        text-align: start;
        vertical-align: middle;
      }

      thead th {
        background: var(--sub-color-surface-sunken);
        font-weight: var(--sub-weight-bold);
        white-space: nowrap;
      }

      tbody th {
        font-weight: var(--sub-weight-semibold);
      }

      :host([striped]) tbody tr:nth-child(even) {
        background: var(--sub-color-surface-hover);
      }

      tr[aria-selected='true'] {
        background: var(--sub-color-accent-subtle);
        color: var(--sub-color-on-accent-subtle);
      }

      .end {
        text-align: end;
      }
      .center {
        text-align: center;
      }

      .sort {
        display: inline-flex;
        gap: var(--sub-space-1);
        align-items: center;
        min-block-size: var(--sub-table-min-size);
        padding: 0;
        border: 0;
        background: transparent;
        color: inherit;
        font: inherit;
        cursor: pointer;
      }

      ${focusInset('.sort')}

      .sel {
        inline-size: 1px;
      }

      .sel label {
        display: grid;
        place-items: center;
        inline-size: var(--sub-table-min-size);
        block-size: var(--sub-table-min-size);
        cursor: pointer;
      }

      .sel input {
        inline-size: 1.375rem;
        block-size: 1.375rem;
        margin: 0;
        accent-color: var(--sub-color-accent);
      }

      .empty {
        color: var(--sub-color-muted);
        text-align: center;
      }

      .first {
        display: flex;
        gap: var(--sub-space-1);
        align-items: center;
      }

      .exp,
      .exp-gap {
        flex: none;
        inline-size: var(--sub-table-min-size);
        block-size: var(--sub-table-min-size);
      }

      .exp {
        display: grid;
        place-items: center;
        padding: 0;
        border: 0;
        border-radius: var(--sub-item-radius);
        background: transparent;
        color: inherit;
        cursor: pointer;
      }

      .exp .icon {
        transition: rotate var(--sub-duration-base) var(--sub-ease-standard);
      }

      .exp[aria-expanded='true'] .icon {
        rotate: 90deg;
      }

      ${focusInset('.exp')}

      tr[data-level]:not([data-level='0']) {
        background: var(--sub-table-subrow-background);
      }

      /* A revealed sub-row fades in (no movement; 0ms when animations are off) */
      tr[data-level]:not([data-level='0']):not([hidden]) {
        animation: row-in var(--sub-duration-base) var(--sub-ease-standard);
      }

      @keyframes row-in {
        from {
          opacity: 0;
        }
      }
    `,
  ]

  protected override firstUpdated(): void {
    if (!this.caption) warn('<sub-table> needs a "caption": it is the accessible name of the table.')
  }

  #kids(row: Row): Row[] {
    const k = row[this.childrenKey]
    return Array.isArray(k) ? (k as Row[]) : []
  }

  #order(rows: Row[]): Row[] {
    if (!this.sortKey || this.sorting === 'server') return rows
    const dir = this.sortDir === 'ascending' ? 1 : -1
    return [...rows].sort((a, b) => {
      const x = a[this.sortKey]
      const y = b[this.sortKey]
      return (typeof x === 'number' && typeof y === 'number' ? x - y : String(x ?? '').localeCompare(String(y ?? ''), undefined, { numeric: true })) * dir
    })
  }

  /** Depth-first list of every row with its level and whether all its ancestors are open */
  get #flat(): Array<{ row: Row; level: number; parent: Row | null; visible: boolean }> {
    const out: Array<{ row: Row; level: number; parent: Row | null; visible: boolean }> = []
    const walk = (rows: Row[], level: number, parent: Row | null, visible: boolean) => {
      for (const row of this.#order(rows)) {
        out.push({ row, level, parent, visible })
        const kids = this.#kids(row)
        if (kids.length) walk(kids, level + 1, row, visible && this.#isOpen(row))
      }
    }
    walk(this.rows, 0, null, true)
    return out
  }

  /** With `expand-all`, rows the user closed are remembered here */
  #collapsed = new Set<string>()

  #isOpen(row: Row): boolean {
    return this.allOpen ? !this.#collapsed.has(this.#key(row)) : this.expanded.includes(this.#key(row))
  }

  #descendants(row: Row): Row[] {
    return this.#kids(row).flatMap((k) => [k, ...this.#descendants(k)])
  }

  expandAll(): void {
    this.#collapsed.clear()
    this.allOpen = true
    this.requestUpdate()
  }

  collapseAll(): void {
    this.allOpen = false
    this.#collapsed.clear()
    this.expanded = []
  }

  #key(row: Row): string {
    return String(row[this.rowKey])
  }

  #name(row: Row): string {
    return String(row[this.columns[0]?.key ?? ''] ?? this.#key(row))
  }

  #sort(col: TableColumn): void {
    this.sortDir = this.sortKey === col.key && this.sortDir === 'ascending' ? 'descending' : 'ascending'
    this.sortKey = col.key
    emit(this, 'sub-sort', { key: col.key, direction: this.sortDir })
    announce(`Sorted by ${col.label}, ${this.sortDir}`)
  }

  #toggleOpen(row: Row): void {
    const key = this.#key(row)
    const open = !this.#isOpen(row)
    if (this.allOpen) {
      if (open) this.#collapsed.delete(key)
      else this.#collapsed.add(key)
      this.requestUpdate()
    } else this.expanded = open ? [...this.expanded, key] : this.expanded.filter((k) => k !== key)
    emit(this, 'sub-expand', { key, expanded: open })
    announce(open ? messages.rowExpanded(this.#name(row), this.#kids(row).length) : messages.rowCollapsed(this.#name(row)))
  }

  #toggle(row: Row, on: boolean): void {
    const keys = [row, ...this.#descendants(row)].map((r) => this.#key(r))
    const rest = this.selected.filter((s) => !keys.includes(s))
    this.selected = on ? [...rest, ...keys] : rest
    emit(this, 'sub-select', { selected: this.selected })
  }

  #toggleAll(on: boolean): void {
    this.selected = on ? this.#flat.map((f) => this.#key(f.row)) : []
    emit(this, 'sub-select', { selected: this.selected })
  }

  /** `all`: the row and every descendant are ticked; `some`: only part of them */
  #state(row: Row): 'all' | 'some' | 'none' {
    const keys = [row, ...this.#descendants(row)].map((r) => this.#key(r))
    const n = keys.filter((k) => this.selected.includes(k)).length
    return n === 0 ? 'none' : n === keys.length ? 'all' : 'some'
  }

  /** Any row has sub-rows: leaves then keep the expander's width so the first column lines up */
  get #hasKids(): boolean {
    return this.rows.some((r) => this.#kids(r).length > 0)
  }

  protected override render() {
    const flat = this.#flat
    const allOn = flat.length > 0 && flat.every((f) => this.selected.includes(this.#key(f.row)))
    const someOn = flat.some((f) => this.selected.includes(this.#key(f.row)))
    const span = this.columns.length + (this.selectable ? 1 : 0)
    const gap = this.#hasKids
    return html`<div class="scroll" role="region" aria-labelledby="cap" tabindex="0">
      <table part="table">
        <caption id="cap">${this.caption}</caption>
        <thead>
          <tr>
            ${this.selectable
              ? html`<th scope="col" class="sel"><label><input type="checkbox" aria-label="Select all rows" .checked=${allOn} .indeterminate=${someOn && !allOn} @change=${(e: Event) => this.#toggleAll((e.target as HTMLInputElement).checked)} /></label></th>`
              : nothing}
            ${this.columns.map((c) => {
              const active = this.sortKey === c.key
              return html`<th scope="col" class=${c.align ?? ''} aria-sort=${c.sortable ? (active ? this.sortDir : 'none') : nothing}>
                ${c.sortable
                  ? html`<button class="sort" type="button" @click=${() => this.#sort(c)}>
                      ${c.label}${active ? (this.sortDir === 'ascending' ? icons.arrow_drop_up() : icons.arrow_drop_down()) : icons.unfold_more()}
                    </button>`
                  : c.label}
              </th>`
            })}
          </tr>
        </thead>
        <tbody>
          ${flat.length
            ? flat.map(({ row, level, parent, visible }) => {
                const state = this.#state(row)
                const rowName = this.#name(row)
                const kids = this.#kids(row)
                const open = kids.length > 0 && this.#isOpen(row)
                return html`<tr id="r-${this.#key(row)}" data-level=${level} ?hidden=${!visible} aria-selected=${this.selectable ? String(state === 'all') : nothing}>
                  ${this.selectable
                    ? html`<td class="sel"><label><input type="checkbox" aria-label=${`Select ${rowName}`} .checked=${state === 'all'} .indeterminate=${state === 'some'} @change=${(e: Event) => this.#toggle(row, (e.target as HTMLInputElement).checked)} /></label></td>`
                    : nothing}
                  ${this.columns.map((c, i) => {
                    const content = c.render ? c.render(row) : String(row[c.key] ?? '')
                    if (i > 0) return html`<td class=${c.align ?? ''}>${content}</td>`
                    return html`<th scope="row" class=${c.align ?? ''}>
                      <div class="first" style="padding-inline-start: calc(var(--sub-table-subrow-indent) * ${level})">
                        ${kids.length
                          ? html`<button class="exp" type="button" aria-expanded=${open ? 'true' : 'false'} aria-controls=${kids.map((k) => `r-${this.#key(k)}`).join(' ')} aria-label=${messages.subRows(rowName)} @click=${() => this.#toggleOpen(row)}>${icons.chevronRight()}</button>`
                          : gap
                            ? html`<span class="exp-gap"></span>`
                            : nothing}
                        <span>${content}${parent ? html`<span class="sr-only">, ${messages.subRowOf(this.#name(parent))}</span>` : nothing}</span>
                      </div>
                    </th>`
                  })}
                </tr>`
              })
            : html`<tr><td class="empty" colspan=${span}>${this.emptyText}</td></tr>`}
        </tbody>
      </table>
    </div>`
  }
}

export function defineTable(): void {
  define('sub-table', SubTable)
}

declare global {
  interface HTMLElementTagNameMap {
    'sub-table': SubTable
  }
}
