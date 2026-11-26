import { css, html, nothing, type PropertyValues } from 'lit'
import { ifDefined } from 'lit/directives/if-defined.js'
import { live } from 'lit/directives/live.js'
import { formControlStyles } from './shared/form-control'
import { Popup, filterItems, highlight, listboxStyles, supportsPopover, type ListItem } from './shared/listbox'
import { messages } from './shared/messages'
import { SubTextField } from './shared/text-field'
import { debounce, define, emit, wrap } from './shared/utils'
import { OptionsController, defineOption } from './option'

export interface Suggestion {
  value: string
  label?: string
  description?: string
}

/**
 * Autocomplete / autosuggest (ARIA combobox, list autocomplete). The caret stays in the input,
 * nothing is auto-selected, a choice is committed only with Enter or a click, free text is allowed.
 * The suggestions are a top-layer panel anchored to the input, so no `overflow` ancestor (a dialog
 * body, a card, a table cell) can clip them.
 *
 * Static list: `<sub-option>` children are filtered client-side (accents and case ignored).
 * Remote list: add `remote`, listen to `sub-search` ({query}) and assign `element.options`; set `loading`
 * while you wait.
 *
 * Keys: Down opens/moves, Up moves back (to the input), Enter picks, Esc closes (input is kept), Tab closes.
 * The number of suggestions is announced politely once the list settles, not per keystroke.
 */
export class SubAutocomplete extends SubTextField {
  static override properties = {
    options: { attribute: false },
    remote: { type: Boolean },
    minChars: { type: Number, attribute: 'min-chars' },
    maxResults: { type: Number, attribute: 'max-results' },
    loading: { type: Boolean },
    _open: { state: true },
    _active: { state: true },
    _status: { state: true },
  }

  /** Programmatic suggestions (remote results). Merged with `<sub-option>` children. */
  declare options: Suggestion[]
  /** Skip client-side filtering: the app filters (server search) and sets `options` */
  declare remote: boolean
  /** Characters needed before suggestions appear (0: they open on focus or Down) */
  declare minChars: number
  declare maxResults: number
  declare loading: boolean
  declare _open: boolean
  declare _active: number
  declare _status: string

  readonly #declared = new OptionsController(this)
  readonly #popup = new Popup(this, {
    panel: () => this.renderRoot.querySelector<HTMLElement>('.panel'),
    anchor: () => this.field(),
    onClosed: () => this.#reset(),
  })

  constructor() {
    super()
    this.options = []
    this.remote = false
    this.minChars = 1
    this.maxResults = 8
    this.loading = false
    this._open = false
    this._active = -1
    this._status = ''
  }

  static override styles = [
    ...formControlStyles,
    listboxStyles,
    css`
      .wrap {
        position: relative;
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

  protected field(): HTMLInputElement | null {
    return this.renderRoot.querySelector('input')
  }

  get #query(): string {
    return this.value.trim()
  }

  get #results(): ListItem[] {
    if (this.#query.length < this.minChars) return []
    const all: ListItem[] = [
      ...this.#declared.options.map((o) => ({ value: o.value, label: o.label, description: o.description, disabled: o.disabled })),
      ...this.options.map((o) => ({ value: o.value, label: o.label ?? o.value, description: o.description })),
    ]
    return (this.remote ? all : filterItems(all, this.#query, false)).slice(0, this.maxResults)
  }

  get #showPanel(): boolean {
    return this._open && (this.#results.length > 0 || this.loading || this.#query.length >= this.minChars)
  }

  #search = debounce(() => {
    if (this.#query.length >= this.minChars) emit(this, 'sub-search', { query: this.#query })
  }, 250)

  #settle = debounce(() => {
    this._status = this._open ? (this.#results.length ? messages.suggestions(this.#results.length) : this.loading ? '' : messages.noSuggestions) : ''
  }, 500)

  protected override updated(changed: PropertyValues): void {
    super.updated(changed)
    if (changed.has('options') && this._open) this.#settle()
    // The panel exists only while there is something to say; open it in the top layer after it rendered
    const want = this.#showPanel
    if (want && !this.#popup.open) this.#popup.show()
    else if (!want && this.#popup.open) this.#popup.hide()
    else if (want) this.#popup.place()
    if (changed.has('_active') && this._active >= 0) this.renderRoot.querySelector(`#opt-${this._active}`)?.scrollIntoView({ block: 'nearest' })
  }

  /** State back to closed (the panel was hidden by us or by an outside click) */
  #reset(): void {
    this._open = false
    this._active = -1
    this._status = ''
  }

  #pick(item: ListItem): void {
    if (item.disabled) return
    this.value = item.label
    this.#close()
    emit(this, 'sub-select', { value: item.value, label: item.label })
    this.dispatchEvent(new Event('change', { bubbles: true }))
    this.field()?.focus() // the caret stays in the input
  }

  #close(): void {
    this.#popup.hide()
    this.#reset()
  }

  protected override onInput = (event: Event): void => {
    this.value = (event.target as HTMLInputElement).value
    this._active = -1 // never auto-select the first suggestion
    this._open = this.#query.length >= this.minChars
    if (this._open) {
      this.#search()
      this.#settle()
    } else this._status = ''
  }

  #onFocus = (): void => {
    if (this.minChars === 0 && !this._open) this._open = true
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
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault()
        if (!this._open && this.#query.length >= this.minChars) this._open = true
        if (list.length) this._active = this._open && this._active >= 0 ? this.#next(this._active, 1) : this.#next(-1, 1)
        break
      case 'ArrowUp':
        if (!this._open || !list.length) return
        event.preventDefault()
        this._active = this._active <= 0 ? -1 : this.#next(this._active, -1)
        break
      case 'Enter': {
        const item = list[this._active]
        if (this._open && item) {
          event.preventDefault() // pick, do not submit the form
          this.#pick(item)
        }
        break
      }
      case 'Escape':
        if (this._open) {
          event.preventDefault()
          event.stopPropagation() // closes the list only, not a dialog around it
          this.#close() // keep what the user typed
        }
        break
      case 'Tab':
        if (this._open) this.#close()
        break
    }
  }

  protected override render() {
    const results = this.#results
    const open = this._open
    const showPanel = this.#showPanel
    return html`<div class="field">
      ${this.renderLabel()} ${this.renderHint()}
      <div class="wrap">
        <input
          id="control"
          class="control"
          part="input"
          type="text"
          role="combobox"
          aria-expanded=${open && results.length ? 'true' : 'false'}
          aria-controls="listbox"
          aria-autocomplete="list"
          aria-activedescendant=${open && this._active >= 0 ? `opt-${this._active}` : nothing}
          autocomplete="off"
          .value=${live(this.value)}
          name=${this.name || nothing}
          placeholder=${this.placeholder || nothing}
          minlength=${ifDefined(this.minlength)}
          maxlength=${ifDefined(this.maxlength)}
          ?required=${this.required}
          ?readonly=${this.readonly}
          ?disabled=${this.isDisabled}
          aria-invalid=${this.displayedError ? 'true' : nothing}
          aria-describedby=${ifDefined(this.describedBy())}
          aria-busy=${this.loading ? 'true' : nothing}
          @input=${this.onInput}
          @keydown=${this.#onKey}
          @focus=${this.#onFocus}
          @change=${this.onChange}
          @blur=${this.onControlBlur}
        />
        <div class="panel" part="panel" popover=${supportsPopover ? 'manual' : nothing} ?hidden=${!showPanel}>
          <div id="listbox" class="list" role="listbox" aria-label=${this.label}>
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
                <span class="text"><span>${highlight(s.label, this.#query)}</span>${s.description ? html`<span class="desc">${s.description}</span>` : nothing}</span>
              </div>`,
            )}
          </div>
          ${!results.length ? html`<div class="empty" aria-hidden="true">${this.loading ? messages.loading : messages.noSuggestions}</div>` : nothing}
        </div>
      </div>
      <div class="sr-only" aria-live="polite">${this._status}</div>
      ${this.renderError()}
    </div>`
  }
}

export function defineAutocomplete(): void {
  defineOption()
  define('sub-autocomplete', SubAutocomplete)
}

declare global {
  interface HTMLElementTagNameMap {
    'sub-autocomplete': SubAutocomplete
  }
}
