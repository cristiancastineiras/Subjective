import { css, html, nothing, type PropertyValues } from 'lit'
import { ifDefined } from 'lit/directives/if-defined.js'
import { live } from 'lit/directives/live.js'
import { formControlStyles } from './shared/form-control'
import { Popup, filterItems, highlight, listboxStyles, supportsPopover, type ListItem } from './shared/listbox'
import { messages } from './shared/messages'
import { SubTextField } from './shared/text-field'
import { debounce, define, emit, wrap } from './shared/utils'
import { OptionsController, defineOption } from './option'

export interface Mention {
  /** What is inserted after the prefix: `ana` -> `@ana` */
  value: string
  /** Name shown in the list (defaults to `value`) */
  label?: string
  description?: string
}

interface Active {
  start: number
  end: number
  prefix: string
  query: string
}

const WORD = /[\p{L}\p{N}_.\-]/u

/** Pixel position of the caret in a textarea (a hidden mirror element measures it). */
function caretRect(ta: HTMLTextAreaElement, pos: number): DOMRect {
  const s = getComputedStyle(ta)
  const mirror = document.createElement('div')
  for (const prop of ['direction', 'fontStyle', 'fontVariant', 'fontWeight', 'fontStretch', 'fontSize', 'lineHeight', 'fontFamily', 'textTransform', 'textIndent', 'letterSpacing', 'wordSpacing', 'tabSize'] as const) mirror.style[prop as 'direction'] = s[prop as 'direction']
  const pad = parseFloat(s.paddingLeft) + parseFloat(s.paddingRight)
  Object.assign(mirror.style, { position: 'fixed', visibility: 'hidden', top: '0', left: '0', boxSizing: 'content-box', whiteSpace: 'pre-wrap', overflowWrap: 'break-word', width: `${ta.clientWidth - pad}px` })
  mirror.textContent = ta.value.slice(0, pos)
  const marker = document.createElement('span')
  marker.textContent = ta.value.slice(pos) || '.'
  mirror.append(marker)
  document.body.append(mirror)
  const box = ta.getBoundingClientRect()
  const line = parseFloat(s.lineHeight) || parseFloat(s.fontSize) * 1.5
  const rect = new DOMRect(
    box.left + parseFloat(s.borderLeftWidth) + parseFloat(s.paddingLeft) + marker.offsetLeft - ta.scrollLeft,
    box.top + parseFloat(s.borderTopWidth) + parseFloat(s.paddingTop) + marker.offsetTop - ta.scrollTop,
    0,
    line,
  )
  mirror.remove()
  // keep the list inside the field when the caret is scrolled out of it
  const top = Math.min(Math.max(rect.top, box.top), box.bottom - line)
  return new DOMRect(rect.left, top, 0, line)
}

/**
 * Mentions (@name): a textarea that suggests people (or tags, with `prefix="@#"`) while you type a prefix.
 * ARIA: the textarea keeps the caret and gets `aria-autocomplete="list"`, `aria-controls` and
 * `aria-activedescendant`; the number of suggestions is announced politely. The list is a top-layer panel
 * next to the caret.
 *
 *   <sub-mentions label="Comment" prefix="@">
 *     <sub-option value="ana" description="Ana Ruiz">Ana Ruiz</sub-option>
 *   </sub-mentions>
 *
 * Keys: Down/Up move, Enter inserts the highlighted one (never auto-selected: press Down first),
 * Esc closes and keeps the text, Tab moves on. Inserting writes `@value ` and emits `sub-select`.
 * Remote lists: listen to `sub-search` ({query, prefix}), assign `options`, set `remote`.
 */
export class SubMentions extends SubTextField {
  static override properties = {
    rows: { type: Number },
    options: { attribute: false },
    prefix: { type: String },
    remote: { type: Boolean },
    maxResults: { type: Number, attribute: 'max-results' },
    _open: { state: true },
    _active: { state: true },
    _status: { state: true },
    _mention: { state: true },
  }

  declare rows: number
  /** Suggestions, merged with the `<sub-option>` children */
  declare options: Mention[]
  /** Trigger characters; each character of the string is one (`"@#"`) */
  declare prefix: string
  /** The app filters (server search) and sets `options` itself */
  declare remote: boolean
  declare maxResults: number
  declare _open: boolean
  declare _active: number
  declare _status: string
  declare _mention: Active | null

  readonly #declared = new OptionsController(this)
  readonly #popup = new Popup(this, {
    panel: () => this.renderRoot.querySelector<HTMLElement>('.panel'),
    anchor: () => {
      const ta = this.field()
      const m = this._mention
      return ta && m ? { getBoundingClientRect: () => caretRect(ta, m.end) } : ta
    },
    gap: () => 4,
    onClosed: () => this.#reset(),
  })

  constructor() {
    super()
    this.rows = 4
    this.options = []
    this.prefix = '@'
    this.remote = false
    this.maxResults = 8
    this._open = false
    this._active = -1
    this._status = ''
    this._mention = null
  }

  static override styles = [
    ...formControlStyles,
    listboxStyles,
    css`
      textarea {
        display: block;
        resize: vertical;
        min-block-size: calc(var(--sub-field-min-size) * 2);
      }

      .panel {
        min-inline-size: var(--sub-mentions-list-min-width);
        max-inline-size: min(var(--sub-mentions-list-max-width), calc(100vw - 1rem));
      }

      .counter {
        justify-self: end;
        font-size: var(--sub-text-sm);
        color: var(--sub-color-muted);
        font-variant-numeric: tabular-nums;
      }
    `,
  ]

  override connectedCallback(): void {
    super.connectedCallback()
    defineOption()
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback()
    this.#popup.dispose()
  }

  protected field(): HTMLTextAreaElement | null {
    return this.renderRoot.querySelector('textarea')
  }

  /** The mention being typed at the caret, or null */
  #detect(): Active | null {
    const ta = this.field()
    if (!ta || ta.selectionStart !== ta.selectionEnd) return null
    const end = ta.selectionStart
    const text = ta.value
    let i = end
    while (i > 0 && WORD.test(text[i - 1]!)) i--
    const prefix = text[i - 1]
    if (!prefix || !this.prefix.includes(prefix)) return null
    if (i - 1 > 0 && !/\s/.test(text[i - 2]!)) return null // "mail@x" is not a mention
    return { start: i - 1, end, prefix, query: text.slice(i, end) }
  }

  get #results(): ListItem[] {
    const m = this._mention
    if (!m) return []
    const all: ListItem[] = [
      ...this.#declared.options.map((o) => ({ value: o.value, label: o.label, description: o.description, disabled: o.disabled })),
      ...this.options.map((o) => ({ value: o.value, label: o.label ?? o.value, description: o.description })),
    ]
    if (this.remote || !m.query) return all.slice(0, this.maxResults)
    const hits = filterItems(all, m.query)
    const q = m.query.toLowerCase()
    // people whose name or handle STARTS with what was typed first
    hits.sort((a, b) => Number(!(b.label.toLowerCase().startsWith(q) || b.value.toLowerCase().startsWith(q))) - Number(!(a.label.toLowerCase().startsWith(q) || a.value.toLowerCase().startsWith(q))))
    return hits.slice(0, this.maxResults)
  }

  #search = debounce(() => {
    const m = this._mention
    if (m) emit(this, 'sub-search', { query: m.query, prefix: m.prefix })
  }, 250)

  #settle = debounce(() => {
    this._status = this._open ? (this.#results.length ? messages.suggestions(this.#results.length) : messages.noSuggestions) : ''
  }, 500)

  /** Look at the caret again: open, update or close the list */
  #refresh(): void {
    const next = this.#detect()
    const same = next && this._mention && next.start === this._mention.start && next.prefix === this._mention.prefix
    if (next && !same) this._active = -1
    this._mention = next
    this._open = next !== null
    if (next) {
      this.#search()
      this.#settle()
    } else this._status = ''
  }

  #reset(): void {
    this._open = false
    this._active = -1
    this._mention = null
    this._status = ''
  }

  protected override onInput = (event: Event): void => {
    this.value = (event.target as HTMLTextAreaElement).value
    this.#refresh()
  }

  protected override updated(changed: PropertyValues): void {
    super.updated(changed)
    const want = this._open && this._mention !== null
    if (want && !this.#popup.open) this.#popup.show()
    else if (!want && this.#popup.open) this.#popup.hide()
    else if (want) this.#popup.place()
    if (changed.has('options') && this._open) this.#settle()
    if (changed.has('_active') && this._active >= 0) this.renderRoot.querySelector(`#opt-${this._active}`)?.scrollIntoView({ block: 'nearest' })
  }

  #pick(item: ListItem): void {
    const m = this._mention
    const ta = this.field()
    if (!m || !ta || item.disabled) return
    const after = ta.value.slice(m.end)
    const insert = `${m.prefix}${item.value}${/^\s/.test(after) ? '' : ' '}`
    const caret = m.start + insert.length + (/^\s/.test(after) ? 1 : 0)
    this.value = ta.value.slice(0, m.start) + insert + after
    this.#popup.hide()
    this.#reset()
    emit(this, 'sub-select', { value: item.value, label: item.label, prefix: m.prefix })
    this.dispatchEvent(new Event('change', { bubbles: true }))
    void this.updateComplete.then(() => {
      ta.focus()
      ta.setSelectionRange(caret, caret)
    })
  }

  #next(from: number, dir: 1 | -1): number {
    const list = this.#results
    for (let step = 1; step <= list.length; step++) {
      const i = wrap(from + dir * step, list.length)
      if (!list[i]?.disabled) return i
    }
    return -1
  }

  #onKey = (event: KeyboardEvent): void => {
    const list = this.#results
    if (!this._open || !list.length) {
      if (event.key === 'Escape' && this._open) {
        event.preventDefault()
        event.stopPropagation()
        this.#popup.hide()
        this.#reset()
      }
      return
    }
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault()
        this._active = this.#next(this._active, 1)
        break
      case 'ArrowUp':
        event.preventDefault()
        this._active = this._active <= 0 ? -1 : this.#next(this._active, -1)
        break
      case 'Enter': {
        const item = list[this._active]
        if (item) {
          event.preventDefault() // insert the mention, not a new line
          this.#pick(item)
        }
        break
      }
      case 'Escape':
        event.preventDefault()
        event.stopPropagation() // closes the list only, not a dialog around it
        this.#popup.hide()
        this.#reset()
        break
      case 'Tab':
        this.#popup.hide()
        this.#reset()
        break
    }
  }

  /** The caret moved without typing (arrows, click, Home/End) */
  #onCaret = (event: Event): void => {
    if (event instanceof KeyboardEvent && ['ArrowDown', 'ArrowUp', 'Enter', 'Escape', 'Tab'].includes(event.key)) return
    this.#refresh()
  }

  protected override render() {
    const results = this.#results
    const open = this._open && this._mention !== null
    return html`<div class="field">
      ${this.renderLabel()} ${this.renderHint()}
      <textarea
        id="control"
        class="control"
        part="textarea"
        rows=${this.rows}
        .value=${live(this.value)}
        name=${this.name || nothing}
        placeholder=${this.placeholder || nothing}
        minlength=${ifDefined(this.minlength)}
        maxlength=${ifDefined(this.maxlength)}
        ?required=${this.required}
        ?readonly=${this.readonly}
        ?disabled=${this.isDisabled}
        aria-autocomplete="list"
        aria-controls="listbox"
        aria-activedescendant=${open && this._active >= 0 ? `opt-${this._active}` : nothing}
        aria-invalid=${this.displayedError ? 'true' : nothing}
        aria-describedby=${ifDefined(this.describedBy())}
        @input=${this.onInput}
        @keydown=${this.#onKey}
        @keyup=${this.#onCaret}
        @click=${this.#onCaret}
        @change=${this.onChange}
        @blur=${() => {
          this.onControlBlur()
        }}
      ></textarea>
      <div class="panel" part="panel" popover=${supportsPopover ? 'manual' : nothing} ?hidden=${!open}>
        <div id="listbox" class="list" role="listbox" aria-label=${messages.mentionSuggestions}>
          ${results.map(
            (s, i) => html`<div
              id="opt-${i}"
              class="option"
              role="option"
              aria-selected=${i === this._active ? 'true' : 'false'}
              aria-disabled=${s.disabled ? 'true' : nothing}
              ?data-active=${i === this._active}
              @pointerdown=${(e: Event) => e.preventDefault()}
              @click=${() => this.#pick(s)}
            >
              <span class="text"><span>${highlight(s.label, this._mention?.query ?? '')}</span>${s.description ? html`<span class="desc">${s.description}</span>` : nothing}</span>
            </div>`,
          )}
        </div>
        ${!results.length ? html`<div class="empty" aria-hidden="true">${messages.noSuggestions}</div>` : nothing}
      </div>
      <div class="sr-only" aria-live="polite">${this._status}</div>
      ${this.renderCounter()} ${this.renderError()}
    </div>`
  }
}

export function defineMentions(): void {
  defineOption()
  define('sub-mentions', SubMentions)
}

declare global {
  interface HTMLElementTagNameMap {
    'sub-mentions': SubMentions
  }
}
