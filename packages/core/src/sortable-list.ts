import { LitElement, css, html } from 'lit'
import { announce } from './announce'
import { messages } from './shared/messages'
import { baseStyles, focusStyles, iconStyles, visuallyHidden } from './shared/styles'
import { define, emit, warn } from './shared/utils'
import { iconArrowDownward, iconArrowUpward, iconDragIndicator } from './shared/material-icons'

/**
 * Reorderable list with a COMPLETE keyboard alternative to dragging (WCAG 2.5.7 Dragging Movements):
 *  - handle: Space/Enter picks up, Up/Down (or Left/Right) move, Space/Enter drops, Esc cancels
 *  - always-visible "Move up / Move down" buttons (never hover-only)
 *  - pointer: drag the handle; the dragged item is elevated, neighbours make room
 *  - every step is announced in a live region; focus stays on the moved item's handle
 *
 *   <sub-sortable-list label="Priorities">
 *     <sub-sortable-item label="Write spec">Write spec</sub-sortable-item> ...
 *   </sub-sortable-list>
 *
 * `sub-reorder` ({from, to, labels}) fires after every committed change.
 */
export class SubSortableItem extends LitElement {
  static override shadowRootOptions: ShadowRootInit = { mode: 'open', delegatesFocus: true }

  static override properties = {
    label: { type: String },
    grabbed: { type: Boolean, reflect: true },
    dragging: { type: Boolean, reflect: true },
  }

  /** Name used in labels and announcements (defaults to the item's text) */
  declare label: string
  declare grabbed: boolean
  declare dragging: boolean

  constructor() {
    super()
    this.label = ''
    this.grabbed = false
    this.dragging = false
  }

  get name(): string {
    return this.label || this.textContent?.trim() || 'item'
  }

  static override styles = [
    baseStyles,
    focusStyles,
    iconStyles,
    visuallyHidden,
    css`
      :host {
        display: block;
      }

      .item {
        display: flex;
        gap: var(--sub-sortable-list-gap);
        align-items: center;
        min-block-size: var(--sub-sortable-list-min-size);
        padding: var(--sub-sortable-list-padding);
        border: var(--sub-sortable-list-border-width) solid var(--sub-color-border);
        border-radius: var(--sub-sortable-list-radius);
        background: var(--sub-color-surface);
        color: var(--sub-color-text);
      }

      :host([grabbed]) .item {
        background: var(--sub-color-accent-subtle);
        color: var(--sub-color-on-accent-subtle);
        border-style: dashed;
      }

      :host([dragging]) .item {
        opacity: 0.85;
        box-shadow: 0 6px 0 0 var(--sub-color-border);
        translate: 0 -2px;
      }

      .content {
        flex: 1;
        min-inline-size: 0;
      }

      button {
        display: grid;
        place-items: center;
        flex: none;
        inline-size: var(--sub-sortable-list-min-size);
        block-size: var(--sub-sortable-list-min-size);
        padding: 0;
        border: var(--sub-sortable-list-border-width) solid transparent;
        border-radius: var(--sub-sortable-list-radius);
        background: transparent;
        color: inherit;
        cursor: pointer;
        touch-action: manipulation;
      }

      .handle {
        cursor: grab;
        touch-action: none;
      }

      :host([dragging]) .handle {
        cursor: grabbing;
      }

      .handle[aria-pressed='true'] {
        background: var(--sub-color-accent);
        color: var(--sub-color-on-accent);
      }

      button:disabled {
        color: var(--sub-color-on-disabled);
        cursor: not-allowed;
      }

      @media (hover: hover) {
        button:enabled:hover {
          background: var(--sub-color-surface-hover);
        }
      }
    `,
  ]

  focusHandle(): void {
    this.renderRoot.querySelector<HTMLElement>('.handle')?.focus()
  }

  get #list(): SubSortableList | null {
    return this.closest('sub-sortable-list')
  }

  #onHandleKey = (event: KeyboardEvent): void => {
    const list = this.#list
    if (!list) return
    if (event.key === ' ' || event.key === 'Enter') {
      event.preventDefault()
      if (this.grabbed) list.drop(this)
      else list.grab(this)
    } else if (this.grabbed && ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)) {
      event.preventDefault()
      list.move(this, event.key === 'ArrowUp' || event.key === 'ArrowLeft' ? -1 : 1)
    } else if (this.grabbed && event.key === 'Escape') {
      event.preventDefault()
      event.stopPropagation()
      list.cancel(this)
    }
  }

  #onPointerDown = (event: PointerEvent): void => {
    if (event.button !== 0) return
    ;(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId)
    this.#list?.beginDrag(this)
  }

  #onPointerMove = (event: PointerEvent): void => {
    if (this.dragging) this.#list?.dragTo(this, event.clientY)
  }

  #onPointerUp = (): void => {
    if (this.dragging) this.#list?.endDrag(this)
  }

  protected override render() {
    const list = this.#list
    const index = list ? list.items.indexOf(this) : 0
    const last = list ? index === list.items.length - 1 : true
    return html`<div class="item" part="item">
      <button
        class="handle"
        type="button"
        aria-label=${messages.dragHandle(this.name)}
        aria-pressed=${this.grabbed ? 'true' : 'false'}
        @keydown=${this.#onHandleKey}
        @pointerdown=${this.#onPointerDown}
        @pointermove=${this.#onPointerMove}
        @pointerup=${this.#onPointerUp}
        @pointercancel=${() => this.#list?.cancel(this)}
        @blur=${() => this.grabbed && this.#list?.drop(this)}
      >
        ${iconDragIndicator()}
      </button>
      <div class="content"><slot></slot></div>
      <button type="button" aria-label=${messages.moveItemUp(this.name)} ?disabled=${index <= 0} @click=${() => list?.move(this, -1, true)}>
        ${iconArrowUpward()}
      </button>
      <button type="button" aria-label=${messages.moveItemDown(this.name)} ?disabled=${last} @click=${() => list?.move(this, 1, true)}>
        ${iconArrowDownward()}
      </button>
    </div>`
  }
}

export class SubSortableList extends LitElement {
  static override properties = {
    label: { type: String },
  }

  declare label: string

  #origin = -1

  constructor() {
    super()
    this.label = ''
  }

  static override styles = [
    baseStyles,
    css`
      :host {
        display: block;
      }

      ::slotted(sub-sortable-item) {
        margin-block-end: var(--sub-sortable-list-gap);
      }
    `,
  ]

  get items(): SubSortableItem[] {
    return [...this.querySelectorAll<SubSortableItem>(':scope > sub-sortable-item')]
  }

  override connectedCallback(): void {
    super.connectedCallback()
    this.setAttribute('role', 'list')
  }

  protected override firstUpdated(): void {
    if (!this.label) warn('<sub-sortable-list> needs a "label".')
  }

  protected override updated(): void {
    if (this.label) this.setAttribute('aria-label', this.label)
  }

  #syncRoles = (): void => {
    for (const item of this.items) {
      item.setAttribute('role', 'listitem')
      item.requestUpdate() // move up/down enabled state depends on position
    }
  }

  /** Through the shared assertive live region: a region inside a role=list would break list > listitem */
  #announce(message: string): void {
    announce(message, 'assertive')
  }

  #place(item: SubSortableItem, index: number): void {
    const items = this.items
    const ref = items.filter((i) => i !== item)[index] ?? null
    const move = (this as unknown as { moveBefore?: (n: Node, r: Node | null) => void }).moveBefore
    if (move) move.call(this, item, ref)
    else this.insertBefore(item, ref)
    this.#syncRoles()
  }

  grab(item: SubSortableItem): void {
    for (const other of this.items) other.grabbed = false
    item.grabbed = true
    this.#origin = this.items.indexOf(item)
    this.#announce(messages.grabbed(item.name, this.#origin + 1, this.items.length))
  }

  /** @param viaButton true for the visible Move up/down buttons (no grab step) */
  move(item: SubSortableItem, delta: -1 | 1, viaButton = false): void {
    const from = this.items.indexOf(item)
    const to = from + delta
    if (to < 0 || to >= this.items.length) return
    this.#place(item, to)
    this.#announce(messages.movedTo(to + 1, this.items.length))
    if (viaButton) emit(this, 'sub-reorder', this.#detail(from, to))
    // Re-inserting a node drops focus: put it back on the button the user was using
    void item.updateComplete.then(() => (viaButton ? this.#refocusMoveButton(item, delta) : item.focusHandle()))
  }

  #refocusMoveButton(item: SubSortableItem, delta: -1 | 1): void {
    const buttons = item.shadowRoot?.querySelectorAll<HTMLButtonElement>('button:not(.handle)')
    const target = buttons?.[delta === -1 ? 0 : 1]
    ;(target && !target.disabled ? target : buttons?.[delta === -1 ? 1 : 0] ?? item.shadowRoot?.querySelector<HTMLElement>('.handle'))?.focus()
  }

  drop(item: SubSortableItem): void {
    const to = this.items.indexOf(item)
    item.grabbed = false
    this.#announce(messages.dropped(item.name, to + 1, this.items.length))
    if (to !== this.#origin) emit(this, 'sub-reorder', this.#detail(this.#origin, to))
    this.#origin = -1
  }

  cancel(item: SubSortableItem): void {
    if (this.#origin >= 0) this.#place(item, this.#origin)
    item.grabbed = false
    item.dragging = false
    this.#announce(messages.reorderCancelled(item.name, this.#origin + 1))
    this.#origin = -1
    void item.updateComplete.then(() => item.focusHandle())
  }

  beginDrag(item: SubSortableItem): void {
    this.#origin = this.items.indexOf(item)
    item.dragging = true
  }

  dragTo(item: SubSortableItem, y: number): void {
    const items = this.items
    const from = items.indexOf(item)
    // Target = the item whose vertical middle the pointer has crossed
    let to = from
    items.forEach((other, i) => {
      if (other === item) return
      const r = other.getBoundingClientRect()
      const mid = r.top + r.height / 2
      if (i < from && y < mid) to = Math.min(to, i)
      if (i > from && y > mid) to = Math.max(to, i)
    })
    if (to !== from) {
      this.#place(item, to)
      this.#announce(messages.movedTo(to + 1, items.length))
    }
  }

  endDrag(item: SubSortableItem): void {
    const to = this.items.indexOf(item)
    item.dragging = false
    this.#announce(messages.dropped(item.name, to + 1, this.items.length))
    if (to !== this.#origin) emit(this, 'sub-reorder', this.#detail(this.#origin, to))
    this.#origin = -1
    void item.updateComplete.then(() => item.focusHandle())
  }

  #detail(from: number, to: number) {
    return { from, to, labels: this.items.map((i) => i.name) }
  }

  protected override render() {
    return html`<slot @slotchange=${this.#syncRoles}></slot>`
  }
}

export function defineSortableList(): void {
  define('sub-sortable-item', SubSortableItem)
  define('sub-sortable-list', SubSortableList)
}

declare global {
  interface HTMLElementTagNameMap {
    'sub-sortable-item': SubSortableItem
    'sub-sortable-list': SubSortableList
  }
}
