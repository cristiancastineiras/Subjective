import { LitElement, css, html, nothing, type TemplateResult } from 'lit'
import { icons } from './shared/icons'
import { baseStyles, iconStyles, visuallyHidden } from './shared/styles'
import { define, emit } from './shared/utils'

export interface TreeNode {
  id: string
  label: string
  children?: TreeNode[]
  disabled?: boolean
}

/**
 * Tree view following the ARIA tree pattern: ONE tab stop (roving), Up/Down move between visible
 * items, Right expands (or enters the first child), Left collapses (or goes to the parent), Home/End,
 * `*` expands all siblings, Enter/Space select, type a letter to jump. `aria-level`, `aria-expanded`,
 * `aria-selected` are set for you. `nodes` is a property: `el.nodes = [{ id, label, children }]`.
 */
export class SubTree extends LitElement {
  static override properties = {
    nodes: { attribute: false },
    label: { type: String },
    selected: { type: String, reflect: true },
    expanded: { attribute: false },
    _active: { state: true },
  }

  declare nodes: TreeNode[]
  declare label: string
  declare selected: string
  /** Ids of expanded nodes */
  declare expanded: string[]
  declare _active: string

  #typed = ''
  #typedTimer: ReturnType<typeof setTimeout> | undefined

  constructor() {
    super()
    this.nodes = []
    this.label = ''
    this.selected = ''
    this.expanded = []
    this._active = ''
  }

  static override styles = [
    baseStyles,
    iconStyles,
    visuallyHidden,
    css`
      :host {
        display: block;
        font-family: var(--sub-font-sans);
        color: var(--sub-color-text);
      }

      ul {
        margin: 0;
        padding: 0;
        list-style: none;
      }

      ul ul {
        padding-inline-start: var(--sub-tree-indent);
      }

      li {
        outline: none;
      }

      .row {
        display: flex;
        gap: var(--sub-tree-gap);
        align-items: center;
        min-block-size: var(--sub-tree-min-size);
        padding-inline: var(--sub-space-2);
        border-inline-start: 4px solid transparent;
        cursor: pointer;
      }

      .row:hover {
        background: var(--sub-color-surface-hover);
      }

      li[aria-selected='true'] > .row {
        border-inline-start-color: var(--sub-color-accent);
        background: var(--sub-color-accent-subtle);
        color: var(--sub-color-on-accent-subtle);
        font-weight: var(--sub-weight-bold);
      }

      li[aria-disabled='true'] > .row {
        color: var(--sub-color-on-disabled);
        cursor: not-allowed;
      }

      /* Focus belongs to the ROW, not to the whole subtree */
      li:focus-visible > .row {
        outline: var(--sub-focus-width) solid var(--sub-color-focus);
        outline-offset: calc(var(--sub-focus-width) * -1);
        box-shadow: inset 0 0 0 calc(var(--sub-focus-width) + var(--sub-focus-inner-width)) var(--sub-color-focus-inner);
      }

      .chev {
        display: grid;
        inline-size: var(--sub-icon-md);
        transition: rotate var(--sub-duration-base) var(--sub-ease-standard);
      }

      li[aria-expanded='true'] > .row .chev {
        rotate: 90deg;
      }

      .spacer {
        inline-size: var(--sub-icon-md);
      }
    `,
  ]

  /** Flat list of the currently visible nodes with their parent and level (for keyboard travel) */
  #visible(): Array<{ node: TreeNode; parent?: TreeNode; level: number }> {
    const out: Array<{ node: TreeNode; parent?: TreeNode; level: number }> = []
    const walk = (nodes: TreeNode[], level: number, parent?: TreeNode) => {
      for (const node of nodes) {
        out.push({ node, parent, level })
        if (node.children?.length && this.expanded.includes(node.id)) walk(node.children, level + 1, node)
      }
    }
    walk(this.nodes, 1)
    return out
  }

  #toggle(id: string, open?: boolean): void {
    const isOpen = this.expanded.includes(id)
    const next = open ?? !isOpen
    if (next === isOpen) return
    this.expanded = next ? [...this.expanded, id] : this.expanded.filter((e) => e !== id)
    emit(this, 'sub-expand', { id, expanded: next })
  }

  #select(node: TreeNode): void {
    if (node.disabled) return
    this.selected = node.id
    emit(this, 'sub-select', { id: node.id, label: node.label })
  }

  #focus(id: string): void {
    this._active = id
    void this.updateComplete.then(() => this.renderRoot.querySelector<HTMLElement>(`[data-id="${CSS.escape(id)}"]`)?.focus())
  }

  #onKey = (event: KeyboardEvent): void => {
    const flat = this.#visible()
    const i = flat.findIndex((f) => f.node.id === this._active)
    const cur = flat[i]
    if (!cur) return
    const { node, parent } = cur
    const open = node.children?.length && this.expanded.includes(node.id)
    let handled = true
    switch (event.key) {
      case 'ArrowDown':
        flat[i + 1] && this.#focus(flat[i + 1]!.node.id)
        break
      case 'ArrowUp':
        flat[i - 1] && this.#focus(flat[i - 1]!.node.id)
        break
      case 'ArrowRight':
        if (node.children?.length) open ? this.#focus(node.children[0]!.id) : this.#toggle(node.id, true)
        break
      case 'ArrowLeft':
        if (open) this.#toggle(node.id, false)
        else if (parent) this.#focus(parent.id)
        break
      case 'Home':
        this.#focus(flat[0]!.node.id)
        break
      case 'End':
        this.#focus(flat[flat.length - 1]!.node.id)
        break
      case 'Enter':
      case ' ':
        this.#select(node)
        break
      case '*':
        for (const sib of (parent?.children ?? this.nodes).filter((n) => n.children?.length)) this.#toggle(sib.id, true)
        break
      default:
        if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
          clearTimeout(this.#typedTimer)
          this.#typed += event.key.toLowerCase()
          this.#typedTimer = setTimeout(() => (this.#typed = ''), 600)
          const hit = [...flat.slice(i + 1), ...flat.slice(0, i + 1)].find((f) => f.node.label.toLowerCase().startsWith(this.#typed))
          if (hit) this.#focus(hit.node.id)
        } else handled = false
    }
    if (handled) event.preventDefault()
  }

  #item(node: TreeNode, level: number, size: number, pos: number): TemplateResult {
    const hasKids = Boolean(node.children?.length)
    const isOpen = hasKids && this.expanded.includes(node.id)
    const active = (this._active || this.nodes[0]?.id) === node.id
    return html`<li
      role="treeitem"
      data-id=${node.id}
      aria-level=${level}
      aria-setsize=${size}
      aria-posinset=${pos}
      aria-expanded=${hasKids ? String(isOpen) : nothing}
      aria-selected=${this.selected === node.id ? 'true' : 'false'}
      aria-disabled=${node.disabled ? 'true' : nothing}
      tabindex=${active ? '0' : '-1'}
      @focus=${(e: Event) => e.target === e.currentTarget && (this._active = node.id)}
    >
      <div class="row" @click=${() => (hasKids ? this.#toggle(node.id) : null, this._active = node.id, this.#select(node))}>
        ${hasKids ? html`<span class="chev">${icons.chevron_right()}</span>` : html`<span class="spacer"></span>`}
        <span>${node.label}</span>
      </div>
      ${hasKids && isOpen
        ? html`<ul role="group">${node.children!.map((c, i) => this.#item(c, level + 1, node.children!.length, i + 1))}</ul>`
        : nothing}
    </li>`
  }

  protected override render() {
    return html`<ul role="tree" aria-label=${this.label} @keydown=${this.#onKey}>
      ${this.nodes.map((n, i) => this.#item(n, 1, this.nodes.length, i + 1))}
    </ul>`
  }
}

export function defineTree(): void {
  define('sub-tree', SubTree)
}

declare global {
  interface HTMLElementTagNameMap {
    'sub-tree': SubTree
  }
}
