import { LitElement, css, html, type PropertyValues } from 'lit'
import { ChildrenController } from './shared/children'
import { baseStyles, focusInset, focusStyles } from './shared/styles'
import { define, emit, warn, wrap } from './shared/utils'

/** One panel of <sub-tabs>. Its `label` becomes the tab text (1-3 words, sentence case). */
export class SubTabPanel extends LitElement {
  static override properties = {
    label: { type: String },
  }

  declare label: string

  constructor() {
    super()
    this.label = ''
  }

  static override styles = [
    baseStyles,
    focusStyles,
    css`
      :host {
        display: block;
        padding-block: var(--sub-space-4);
        border-radius: var(--sub-radius-sm);
      }

      :host(:focus-visible) {
        outline: var(--sub-focus-width) solid var(--sub-color-focus);
        outline-offset: var(--sub-focus-offset);
      }
    `,
  ]

  protected override render() {
    return html`<slot></slot>`
  }
}

/**
 * Tabs for PARALLEL content at the same level (2-7 tabs; never nested; not for steps or page
 * navigation). `role=tablist/tab/tabpanel`, roving tabindex: Left/Right between tabs, Home/End
 * first/last, Tab moves into the panel. Selected tab is also bolder + underlined (not colour alone).
 *
 *   <sub-tabs label="Account settings">
 *     <sub-tab-panel label="Profile">...</sub-tab-panel>
 *   </sub-tabs>
 *
 * Panels get their accessible name from the tab text (an id reference could not cross the shadow root).
 * @fires {CustomEvent<{ index: number; label: string }>} sub-tab-change - Another tab was selected
 */
export class SubTabs extends LitElement {
  static override shadowRootOptions: ShadowRootInit = { mode: 'open', delegatesFocus: true }

  static override properties = {
    label: { type: String },
    selected: { type: Number, reflect: true },
    activation: { type: String },
  }

  declare label: string
  /** 0-based index of the selected tab */
  declare selected: number
  /** `automatic`: arrows select. `manual`: arrows move focus, Enter/Space selects. */
  declare activation: 'automatic' | 'manual'

  readonly #panels = new ChildrenController<SubTabPanel>(this, 'sub-tab-panel', ['label'])

  constructor() {
    super()
    this.label = ''
    this.selected = 0
    this.activation = 'automatic'
  }

  static override styles = [
    baseStyles,
    focusStyles,
    css`
      :host {
        display: block;
        min-inline-size: 0;
        font-family: var(--sub-font-sans);
        color: var(--sub-color-text);
      }

      .tablist {
        display: flex;
        gap: var(--sub-tabs-gap);
        overflow-x: auto;
        border-block-end: var(--sub-tabs-border-width) solid var(--sub-color-border-subtle);
        scrollbar-width: thin;
      }

      [role='tab'] {
        flex: none;
        min-block-size: var(--sub-tabs-min-size);
        padding: var(--sub-tabs-padding-block) var(--sub-tabs-padding-inline);
        border: 0;
        border-block-end: var(--sub-tabs-indicator-width) solid transparent;
        border-radius: var(--sub-tabs-radius) var(--sub-tabs-radius) 0 0;
        background: transparent;
        color: var(--sub-color-muted);
        font: var(--sub-weight-medium) var(--sub-tabs-font-size) / var(--sub-leading-normal) var(--sub-font-sans);
        white-space: nowrap;
        cursor: pointer;
        touch-action: manipulation;
      }

      [role='tab'][aria-selected='true'] {
        border-block-end-color: var(--sub-color-accent);
        background: var(--sub-color-accent-subtle);
        color: var(--sub-color-on-accent-subtle);
        font-weight: var(--sub-tabs-selected-weight);
      }

      @media (hover: hover) {
        [role='tab'][aria-selected='false']:hover {
          background: var(--sub-color-surface-hover);
          color: var(--sub-color-text);
        }
      }

      ${focusInset("[role='tab']")}

      @media (forced-colors: active) {
        [role='tab'][aria-selected='true'] {
          border-block-end-color: Highlight;
        }
      }
    `,
  ]

  get #list(): SubTabPanel[] {
    return this.#panels.elements
  }

  protected override firstUpdated(): void {
    if (!this.label) warn('<sub-tabs> needs a "label" for the tab list.')
    if (this.#list.length > 7) warn('<sub-tabs> with more than 7 tabs: use another navigation pattern.')
    if (this.closest('sub-tab-panel')) warn('Nested <sub-tabs>: never nest tabs.')
  }

  protected override updated(_changed: PropertyValues): void {
    const panels = this.#list
    const sel = Math.min(Math.max(0, this.selected), Math.max(0, panels.length - 1))
    panels.forEach((p, i) => {
      p.setAttribute('role', 'tabpanel')
      p.setAttribute('aria-label', p.label)
      p.tabIndex = 0
      p.hidden = i !== sel
    })
  }

  select(index: number, focus = false): void {
    const panels = this.#list
    if (index < 0 || index >= panels.length) return
    const changed = index !== this.selected
    this.selected = index
    if (focus) void this.updateComplete.then(() => this.renderRoot.querySelectorAll<HTMLElement>('[role=tab]')[index]?.focus())
    if (changed) emit(this, 'sub-tab-change', { index, label: panels[index]?.label ?? '' })
  }

  #onKey = (event: KeyboardEvent): void => {
    const tabs = [...this.renderRoot.querySelectorAll<HTMLElement>('[role=tab]')]
    const current = tabs.indexOf(event.target as HTMLElement)
    if (current < 0) return
    const rtl = getComputedStyle(this).direction === 'rtl'
    let next = -1
    switch (event.key) {
      case 'ArrowRight':
        next = wrap(current + (rtl ? -1 : 1), tabs.length)
        break
      case 'ArrowLeft':
        next = wrap(current + (rtl ? 1 : -1), tabs.length)
        break
      case 'Home':
        next = 0
        break
      case 'End':
        next = tabs.length - 1
        break
      case 'Enter':
      case ' ':
        event.preventDefault()
        this.select(current)
        return
      default:
        return
    }
    event.preventDefault()
    if (this.activation === 'automatic') this.select(next, true)
    else {
      tabs.forEach((t, i) => (t.tabIndex = i === next ? 0 : -1))
      tabs[next]?.focus()
    }
  }

  protected override render() {
    const panels = this.#list
    const sel = Math.min(Math.max(0, this.selected), Math.max(0, panels.length - 1))
    return html`<div class="tablist" role="tablist" aria-label=${this.label} @keydown=${this.#onKey}>
        ${panels.map(
          (p, i) => html`<button
            role="tab"
            type="button"
            id="tab-${i}"
            aria-selected=${i === sel ? 'true' : 'false'}
            tabindex=${i === sel ? 0 : -1}
            @click=${() => this.select(i)}
          >
            ${p.label}
          </button>`,
        )}
      </div>
      <slot></slot>`
  }
}

export function defineTabs(): void {
  define('sub-tab-panel', SubTabPanel)
  define('sub-tabs', SubTabs)
}

declare global {
  interface HTMLElementTagNameMap {
    'sub-tab-panel': SubTabPanel
    'sub-tabs': SubTabs
  }
}
