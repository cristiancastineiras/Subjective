import { css, html, type ReactiveControllerHost } from 'lit'
import { iconCheck } from './material-icons'
import { autoUpdate, placeNear, type Placement } from './position'
import { isSheet, sheetHeadStyles } from './sheet'

/** One entry of an option panel (select, autocomplete) */
export interface ListItem {
  value: string
  label: string
  description?: string
  disabled?: boolean
  /** Options with the same `group` are listed together under a heading */
  group?: string
}

export const supportsPopover = typeof HTMLElement !== 'undefined' && typeof HTMLElement.prototype.showPopover === 'function'

/** Below SHEET_QUERY panels become a full-screen sheet (the same breakpoint as `<sub-dialog>` and the layout components) */
export { SHEET_QUERY, isSheet, sheetHeader } from './sheet'

const norm = (s: string): string => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

/** Accent- and case-insensitive "contains" filter over label (and, by default, description) */
export function filterItems<T extends ListItem>(items: T[], query: string, inDescription = true): T[] {
  const q = norm(query.trim())
  return q ? items.filter((i) => norm(inDescription ? `${i.label} ${i.description ?? ''}` : i.label).includes(q)) : items
}

/** Bold the matching part of `text` (accent-insensitive, same length mapping as the source text) */
export function highlight(text: string, query: string) {
  const q = norm(query.trim())
  const at = q ? norm(text).indexOf(q) : -1
  if (at < 0) return text
  return html`${text.slice(0, at)}<mark>${text.slice(at, at + q.length)}</mark>${text.slice(at + q.length)}`
}

/** [groupName, items][] in first-seen order; ungrouped items come first under '' */
export function groupItems<T extends ListItem>(items: T[]): Array<[string, T[]]> {
  const map = new Map<string, T[]>()
  for (const item of items) map.set(item.group ?? '', [...(map.get(item.group ?? '') ?? []), item])
  return [...map.entries()].sort(([a], [b]) => (a === '' ? -1 : b === '' ? 1 : 0))
}

/**
 * Anchored floating panel in the top layer (`popover="auto"`: Esc and outside click are native, it stacks
 * correctly above a modal dialog and is never clipped by an `overflow` ancestor). On small screens the
 * same panel is styled as a full-screen sheet (see `listboxStyles`), so no positioning happens there.
 */
export class Popup {
  open = false
  /** When the panel last closed (ms): a click on the trigger right after a light dismiss must not reopen it */
  lastHide = 0
  readonly #host: ReactiveControllerHost & HTMLElement
  readonly #panel: () => HTMLElement | null
  readonly #anchor: () => Pick<HTMLElement, 'getBoundingClientRect'> | null
  readonly #gap: () => number
  readonly #onClosed: () => void
  readonly #sheet: boolean
  #stop: (() => void) | undefined
  #placement: Placement | undefined

  constructor(host: ReactiveControllerHost & HTMLElement, o: { panel: () => HTMLElement | null; anchor: () => Pick<HTMLElement, 'getBoundingClientRect'> | null; gap?: () => number; sheet?: boolean; onClosed: () => void }) {
    this.#host = host
    this.#panel = o.panel
    this.#anchor = o.anchor
    this.#gap = o.gap ?? (() => 4)
    this.#onClosed = o.onClosed
    this.#sheet = o.sheet ?? false
  }

  show(): boolean {
    const panel = this.#panel()
    if (!panel || this.open) return false
    this.open = true
    const manual = panel.getAttribute('popover') === 'manual'
    if (supportsPopover) {
      panel.showPopover()
      panel.addEventListener('toggle', this.#onToggle)
    } else panel.setAttribute('data-open', '')
    // `auto` popovers dismiss natively; manual ones (and browsers without the API) need this
    if (manual || !supportsPopover) document.addEventListener('pointerdown', this.#onOutside)
    // attached to its field while open: follows every scroll and resize, flips above when there is no room below
    const anchor = this.#anchor()
    this.#stop = autoUpdate(() => this.place(), [anchor instanceof Element ? anchor : this.#host, panel])
    return true
  }

  hide(): void {
    const panel = this.#panel()
    if (!this.open || !panel) return
    this.#cleanup(panel)
    if (supportsPopover && panel.matches(':popover-open')) panel.hidePopover()
    panel.removeAttribute('data-open')
  }

  place(): void {
    const panel = this.#panel()
    const anchor = this.#anchor()
    if (!panel || !anchor || !this.open) return
    if (this.#sheet && isSheet()) {
      panel.style.top = panel.style.left = panel.style.minInlineSize = panel.style.maxBlockSize = ''
      return
    }
    const width = anchor.getBoundingClientRect().width
    panel.style.minInlineSize = width > 1 ? `${width}px` : '' // a caret (mentions) has no width: the CSS minimum applies
    this.#placement = placeNear(anchor, panel, 'bottom', 'start', this.#gap(), 8, { current: this.#placement, fitHeight: true, minHeight: 96 })
  }

  dispose(): void {
    const panel = this.#panel()
    if (panel) this.#cleanup(panel)
  }

  #cleanup(panel: HTMLElement): void {
    this.open = false
    panel.removeEventListener('toggle', this.#onToggle)
    document.removeEventListener('pointerdown', this.#onOutside)
    this.#stop?.()
    this.#stop = undefined
    this.#placement = undefined
  }

  /** Native light dismiss (Esc, outside click) closed the popover */
  #onToggle = (event: Event): void => {
    if ((event as ToggleEvent).newState !== 'closed' || !this.open) return
    this.lastHide = Date.now()
    const panel = this.#panel()
    if (panel) this.#cleanup(panel)
    this.#onClosed()
  }

  #onOutside = (event: Event): void => {
    if (!event.composedPath().includes(this.#host)) {
      this.hide()
      this.lastHide = Date.now()
      this.#onClosed()
    }
  }
}

export const checkIcon = iconCheck

/** Rows of an option panel. `row` renders one option; groups get a heading and `role="group"`. */
export function renderGroups<T extends ListItem>(items: T[], row: (item: T) => unknown, idPrefix: string) {
  return groupItems(items).map(([group, list], g) =>
    group
      ? html`<div role="group" aria-labelledby="${idPrefix}-g${g}"><div id="${idPrefix}-g${g}" class="group" role="presentation">${group}</div>${list.map(row)}</div>`
      : html`${list.map(row)}`,
  )
}

/** Panel + options + (mobile) sheet. Styling only through `--sub-listbox-*` tokens. */
export const listboxStyles = css`
  .panel {
    position: fixed;
    inset: auto;
    z-index: var(--sub-z-dropdown);
    flex-direction: column;
    box-sizing: border-box;
    max-inline-size: calc(100vw - 1rem);
    max-block-size: min(var(--sub-listbox-max-height), calc(100dvh - 1rem));
    margin: 0;
    padding: var(--sub-listbox-padding);
    overflow: hidden;
    border: var(--sub-listbox-border-width) solid var(--sub-color-border);
    border-radius: var(--sub-listbox-radius);
    background: var(--sub-color-surface-raised);
    color: var(--sub-color-text);
    font-family: var(--sub-font-sans);
    /* appear: fade + a short slide; the durations are 0 when animations are off */
    opacity: 0;
    translate: 0 calc(var(--sub-motion-distance) * -0.5);
    transition:
      opacity var(--sub-duration-fast) var(--sub-ease-standard),
      translate var(--sub-duration-fast) var(--sub-ease-standard),
      overlay var(--sub-duration-fast) allow-discrete,
      display var(--sub-duration-fast) allow-discrete;
  }

  .panel:not([popover]):not([data-open]) {
    display: none;
  }

  /* Closed panels keep the UA's display:none (so they are not in the accessibility tree) */
  .panel:popover-open,
  .panel[data-open] {
    display: flex;
    opacity: 1;
    translate: 0 0;
  }

  @starting-style {
    .panel:popover-open {
      opacity: 0;
      translate: 0 calc(var(--sub-motion-distance) * -0.5);
    }
  }

  .list {
    min-block-size: 0;
    overflow: auto;
    overscroll-behavior: contain;
  }

  .search {
    flex: none;
    padding-block-end: var(--sub-listbox-padding);
  }

  .search .control {
    min-block-size: var(--sub-listbox-item-min-size);
  }

  .option {
    display: flex;
    gap: var(--sub-space-3);
    align-items: center;
    min-block-size: var(--sub-listbox-item-min-size);
    padding: var(--sub-listbox-item-padding-block) var(--sub-listbox-item-padding-inline);
    border-radius: var(--sub-listbox-item-radius);
    cursor: pointer;
    user-select: none;
    -webkit-tap-highlight-color: transparent;
  }

  .option .text {
    display: grid;
    flex: 1;
    min-inline-size: 0;
  }

  .option .desc {
    font-size: var(--sub-text-sm);
    color: var(--sub-color-muted);
  }

  .option mark {
    background: transparent;
    color: inherit;
    font-weight: var(--sub-weight-bold);
    text-decoration: underline;
    text-underline-offset: 0.2em;
  }

  @media (hover: hover) {
    .option:hover:not([aria-disabled='true']) {
      background: var(--sub-color-surface-hover);
    }
  }

  .option[aria-selected='true'] {
    background: var(--sub-color-accent-subtle);
    color: var(--sub-color-on-accent-subtle);
  }

  .option[aria-selected='true'] .desc {
    color: var(--sub-color-on-accent-subtle);
  }

  /* The keyboard position (focus stays on the field): same double ring as everywhere, drawn inside the option */
  .option[data-active] {
    outline: var(--sub-focus-width) solid var(--sub-color-focus);
    outline-offset: calc(var(--sub-focus-width) * -1);
    box-shadow: inset 0 0 0 calc(var(--sub-focus-width) + var(--sub-focus-inner-width)) var(--sub-color-focus-inner);
  }

  .option[aria-disabled='true'] {
    color: var(--sub-color-on-disabled);
    cursor: not-allowed;
  }

  /* Selected is shown by a check, not by colour alone */
  .tick {
    display: grid;
    flex: none;
    place-items: center;
    inline-size: var(--sub-icon-md);
    block-size: var(--sub-icon-md);
  }

  .tick .icon {
    inline-size: var(--sub-icon-sm);
    block-size: var(--sub-icon-sm);
  }

  .box {
    border: var(--sub-field-border-width) solid var(--sub-color-border);
    border-radius: min(var(--sub-listbox-item-radius), 0.375rem);
    background: var(--sub-color-surface);
    color: var(--sub-color-on-accent);
  }

  [aria-selected='true'] > .box {
    border-color: var(--sub-color-accent);
    background: var(--sub-color-accent);
  }

  .group {
    padding: var(--sub-space-2) var(--sub-listbox-item-padding-inline) var(--sub-space-1);
    font-size: var(--sub-text-sm);
    font-weight: var(--sub-weight-bold);
    color: var(--sub-color-muted);
  }

  .empty {
    padding: var(--sub-space-3) var(--sub-listbox-item-padding-inline);
    color: var(--sub-color-muted);
  }

  @media (forced-colors: active) {
    .option[aria-selected='true'] {
      outline: 2px solid Highlight;
    }
    .box {
      forced-color-adjust: none;
    }
  }
`

/** Full-screen sheet below 40rem (select). Autocomplete keeps an anchored list: its input must stay visible. */
export const sheetStyles = [
  sheetHeadStyles,
  css`
  /* ---- small screens: the panel is a full-screen sheet with a header and a Done button ---- */
  @media (max-width: 40rem) {
    .panel {
      inset: 0;
      inline-size: 100%;
      block-size: 100dvh;
      max-inline-size: none;
      max-block-size: none;
      padding: 0;
      border: 0;
      border-radius: 0;
      translate: 0 var(--sub-motion-distance);
    }

    .panel:popover-open,
    .panel[data-open] {
      translate: 0 0;
    }

    @starting-style {
      .panel:popover-open {
        translate: 0 var(--sub-motion-distance);
      }
    }

    .search {
      padding: var(--sub-space-3) var(--sub-space-4);
    }

    .list {
      flex: 1;
      padding: var(--sub-space-1) var(--sub-space-2);
    }
  }
`,
]
