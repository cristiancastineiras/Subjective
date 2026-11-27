import { LitElement, css, html, nothing } from 'lit'
import { messages } from './shared/messages'
import { baseStyles, focusStyles, iconStyles } from './shared/styles'
import { define, emit } from './shared/utils'
import { iconChevronLeft, iconChevronRight } from './shared/material-icons'

const pad = (n: number) => String(n).padStart(2, '0')
export const toIso = (d: Date): string => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
export function parseIso(v: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v.trim())
  if (!m) return null
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
  return d.getFullYear() === Number(m[1]) && d.getMonth() === Number(m[2]) - 1 && d.getDate() === Number(m[3]) ? d : null
}
const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n)
const addMonths = (d: Date, n: number) => {
  const t = new Date(d.getFullYear(), d.getMonth() + n, 1)
  const last = new Date(t.getFullYear(), t.getMonth() + 1, 0).getDate()
  return new Date(t.getFullYear(), t.getMonth(), Math.min(d.getDate(), last))
}

/**
 * Month calendar following the ARIA date-grid pattern: one tab stop (the focused day), arrows move by
 * day/week, Home/End go to the start/end of the week, PageUp/PageDown change month (Shift: year),
 * Enter/Space select. Days are buttons with full-date names ("Thursday, 26 November 2026"); today is
 * `aria-current="date"`, the selection is `aria-selected`. `locale` drives names and the first weekday.
 * @fires {Event} change - The value changed (native event: works with any framework and form library)
 * @fires {CustomEvent<{ value: string }>} sub-select - A day was chosen (ISO date)
 */
export class SubCalendar extends LitElement {
  static override properties = {
    value: { type: String, reflect: true },
    min: { type: String },
    max: { type: String },
    locale: { type: String },
    firstDay: { type: Number, attribute: 'first-day' },
    _focus: { state: true },
  }

  /** ISO date `yyyy-mm-dd` */
  declare value: string
  declare min: string
  declare max: string
  declare locale: string
  /** 0 = Sunday ... 6 = Saturday (default: Monday) */
  declare firstDay: number
  declare _focus: Date

  constructor() {
    super()
    this.value = ''
    this.min = ''
    this.max = ''
    this.locale = navigator.language
    this.firstDay = 1
    this._focus = new Date()
  }

  static override styles = [
    baseStyles,
    focusStyles,
    iconStyles,
    css`
      /* Natural size = 7 cells; on a narrower screen the cells shrink instead of overflowing */
      :host {
        display: inline-block;
        max-inline-size: 100%;
        font-family: var(--sub-font-sans);
        color: var(--sub-color-text);
      }

      .cal {
        inline-size: calc(7 * var(--sub-calendar-cell-size) + 8 * var(--sub-calendar-gap) + 2 * var(--sub-space-3) + 2 * var(--sub-calendar-border-width));
        max-inline-size: 100%;
        display: grid;
        gap: var(--sub-space-2);
        padding: var(--sub-space-3);
        border: var(--sub-calendar-border-width) solid var(--sub-color-border);
        border-radius: var(--sub-calendar-radius);
        background: var(--sub-color-surface);
      }

      header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: var(--sub-space-2);
      }

      .title {
        font-weight: var(--sub-weight-bold);
        text-transform: capitalize;
      }

      table {
        inline-size: 100%;
        border-collapse: separate;
        border-spacing: var(--sub-calendar-gap);
        table-layout: fixed;
      }

      th {
        font-size: var(--sub-text-sm);
        font-weight: var(--sub-weight-semibold);
        color: var(--sub-color-muted);
        text-transform: capitalize;
      }

      td {
        padding: 0;
        text-align: center;
      }

      button {
        display: grid;
        place-items: center;
        inline-size: 100%;
        min-inline-size: 0;
        block-size: var(--sub-calendar-cell-size);
        padding: 0;
        border: var(--sub-calendar-border-width) solid transparent;
        border-radius: var(--sub-calendar-day-radius);
        background: transparent;
        color: var(--sub-color-text);
        font: var(--sub-weight-regular) var(--sub-text-md) / 1 var(--sub-font-sans);
        font-variant-numeric: tabular-nums;
        cursor: pointer;
      }

      .nav {
        font-weight: var(--sub-weight-bold);
      }

      @media (hover: hover) {
        button:enabled:hover {
          background: var(--sub-color-surface-hover);
        }
      }

      td.out button {
        color: var(--sub-color-muted);
      }

      [aria-current='date'] button {
        border-color: var(--sub-color-border);
        font-weight: var(--sub-weight-bold);
        text-decoration: underline;
      }

      [aria-selected='true'] button {
        background: var(--sub-color-accent);
        color: var(--sub-color-on-accent);
        border-color: var(--sub-color-accent);
        font-weight: var(--sub-weight-bold);
      }

      button:disabled {
        color: var(--sub-color-on-disabled);
        text-decoration: line-through;
        cursor: not-allowed;
      }
    `,
  ]

  override willUpdate(changed: Map<string, unknown>): void {
    if (changed.has('value')) {
      const v = parseIso(this.value)
      if (v) this._focus = v
    }
  }

  /** Move keyboard focus to the focusable day (used by date-picker after opening) */
  focusDay(): void {
    void this.updateComplete.then(() => this.renderRoot.querySelector<HTMLElement>('button[tabindex="0"][data-day]')?.focus())
  }

  #disabled(d: Date): boolean {
    const iso = toIso(d)
    return (this.min !== '' && iso < this.min) || (this.max !== '' && iso > this.max)
  }

  #move(d: Date): void {
    this._focus = d
    this.focusDay()
  }

  #select(d: Date): void {
    if (this.#disabled(d)) return
    this.value = toIso(d)
    emit(this, 'sub-select', { value: this.value })
    this.dispatchEvent(new Event('change', { bubbles: true }))
  }

  #onKey = (event: KeyboardEvent): void => {
    const f = this._focus
    const weekStart = (f.getDay() - this.firstDay + 7) % 7
    const map: Record<string, Date> = {
      ArrowLeft: addDays(f, -1),
      ArrowRight: addDays(f, 1),
      ArrowUp: addDays(f, -7),
      ArrowDown: addDays(f, 7),
      Home: addDays(f, -weekStart),
      End: addDays(f, 6 - weekStart),
      PageUp: event.shiftKey ? addMonths(f, -12) : addMonths(f, -1),
      PageDown: event.shiftKey ? addMonths(f, 12) : addMonths(f, 1),
    }
    const next = map[event.key]
    if (next) {
      event.preventDefault()
      this.#move(next)
    }
  }

  protected override render() {
    const f = this._focus
    const first = new Date(f.getFullYear(), f.getMonth(), 1)
    const lead = (first.getDay() - this.firstDay + 7) % 7
    const start = addDays(first, -lead)
    const title = new Intl.DateTimeFormat(this.locale, { month: 'long', year: 'numeric' }).format(f)
    const dayName = new Intl.DateTimeFormat(this.locale, { weekday: 'long' })
    const dayShort = new Intl.DateTimeFormat(this.locale, { weekday: 'short' })
    const full = new Intl.DateTimeFormat(this.locale, { dateStyle: 'full' })
    const todayIso = toIso(new Date())
    const weeks = Array.from({ length: 6 }, (_, w) => Array.from({ length: 7 }, (_, d) => addDays(start, w * 7 + d)))
    return html`<div class="cal" part="calendar">
      <header>
        <button class="nav" type="button" aria-label=${messages.previousMonth} @click=${() => this.#move(addMonths(f, -1))}>${iconChevronLeft()}</button>
        <div class="title" id="title" aria-live="polite">${title}</div>
        <button class="nav" type="button" aria-label=${messages.nextMonth} @click=${() => this.#move(addMonths(f, 1))}>${iconChevronRight()}</button>
      </header>
      <table role="grid" aria-labelledby="title" @keydown=${this.#onKey}>
        <thead>
          <tr>
            ${weeks[0]!.map((d) => html`<th scope="col" abbr=${dayName.format(d)}>${dayShort.format(d)}</th>`)}
          </tr>
        </thead>
        <tbody>
          ${weeks.map(
            (row) => html`<tr>
              ${row.map((d) => {
                const iso = toIso(d)
                const out = d.getMonth() !== f.getMonth()
                return html`<td
                  role="gridcell"
                  class=${out ? 'out' : ''}
                  aria-selected=${this.value === iso ? 'true' : 'false'}
                  aria-current=${iso === todayIso ? 'date' : nothing}
                >
                  <button
                    type="button"
                    data-day=${iso}
                    tabindex=${iso === toIso(f) ? '0' : '-1'}
                    aria-label=${full.format(d)}
                    ?disabled=${this.#disabled(d)}
                    @click=${() => this.#select(d)}
                    @focus=${() => (this._focus = d)}
                  >
                    ${d.getDate()}
                  </button>
                </td>`
              })}
            </tr>`,
          )}
        </tbody>
      </table>
    </div>`
  }
}

export function defineCalendar(): void {
  define('sub-calendar', SubCalendar)
}

declare global {
  interface HTMLElementTagNameMap {
    'sub-calendar': SubCalendar
  }
}
