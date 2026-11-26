import { LitElement, css, html, nothing } from 'lit'
import { unsafeHTML } from 'lit/directives/unsafe-html.js'
import { ChildrenController } from './shared/children'
import { icons } from './shared/icons'
import { baseStyles, focusStyles, iconStyles, visuallyHidden } from './shared/styles'
import { define } from './shared/utils'

const STATUS = { done: 'check_circle-fill', current: 'schedule', todo: 'schedule', error: 'error-fill', info: 'info-fill' } as const
const WORD = { done: 'Completed', current: 'In progress', todo: 'Upcoming', error: 'Failed', info: 'Note' } as const

/**
 * Chronological list on a real `<ol>`. Children:
 *
 *   <sub-timeline label="Order history">
 *     <sub-timeline-item time="2026-11-20" status="done" heading="Order placed">We received it.</sub-timeline-item>
 *   </sub-timeline>
 *
 * Status is icon + a visually hidden word, never colour alone. The author's item markup is reused as is.
 */
export class SubTimeline extends LitElement {
  static override properties = {
    label: { type: String },
  }

  declare label: string

  readonly #items = new ChildrenController<HTMLElement>(this, 'sub-timeline-item', ['time', 'status', 'heading'])

  constructor() {
    super()
    this.label = ''
  }

  static override styles = [
    baseStyles,
    focusStyles,
    iconStyles,
    visuallyHidden,
    css`
      a {
        color: var(--sub-color-link);
        text-decoration: underline;
        text-underline-offset: 0.2em;
      }

      :host {
        display: block;
        font-family: var(--sub-font-sans);
        color: var(--sub-color-text);
      }

      ol {
        margin: 0;
        padding: 0;
        list-style: none;
      }

      li {
        position: relative;
        display: grid;
        grid-template-columns: var(--sub-timeline-dot-size) minmax(0, 1fr);
        gap: var(--sub-space-3);
        padding-block-end: var(--sub-timeline-gap);
      }

      li:not(:last-child)::before {
        content: '';
        position: absolute;
        inset-block: var(--sub-timeline-dot-size) 0;
        inset-inline-start: calc(var(--sub-timeline-dot-size) / 2 - var(--sub-timeline-line-width) / 2);
        border-inline-start: var(--sub-timeline-line-width) solid var(--sub-color-border-subtle);
      }

      .dot {
        color: var(--_c, var(--sub-color-muted));
      }

      .dot .icon {
        inline-size: var(--sub-timeline-dot-size);
        block-size: var(--sub-timeline-dot-size);
      }

      li[data-status='done'] {
        --_c: var(--sub-color-success);
      }
      li[data-status='current'] {
        --_c: var(--sub-color-accent);
      }
      li[data-status='error'] {
        --_c: var(--sub-color-danger);
      }
      li[data-status='info'] {
        --_c: var(--sub-color-info);
      }

      time {
        display: block;
        color: var(--sub-color-muted);
        font-size: var(--sub-text-sm);
      }

      .title {
        font-weight: var(--sub-weight-bold);
      }
    `,
  ]

  protected override render() {
    return html`<ol aria-label=${this.label || nothing}>
      ${this.#items.elements.map((el) => {
        const status = (el.getAttribute('status') ?? 'done') as keyof typeof STATUS
        const time = el.getAttribute('time')
        return html`<li data-status=${status}>
          <span class="dot">${icons[STATUS[status] ?? 'check_circle-fill']()}</span>
          <div>
            ${time ? html`<time datetime=${time}>${time}</time>` : nothing}
            <div class="title">${el.getAttribute('heading')}<span class="sr-only"> (${WORD[status] ?? ''})</span></div>
            <div>${unsafeHTML(el.innerHTML)}</div>
          </div>
        </li>`
      })}
    </ol>`
  }
}

/** Data holder for <sub-timeline>. Renders nothing itself. */
export class SubTimelineItem extends LitElement {
  static override properties = { time: { type: String }, status: { type: String }, heading: { type: String } }
  declare time: string
  declare status: 'done' | 'current' | 'todo' | 'error' | 'info'
  declare heading: string
  constructor() {
    super()
    this.time = ''
    this.status = 'done'
    this.heading = ''
  }
  static override styles = css`
    :host {
      display: none;
    }
  `
  protected override render() {
    return nothing
  }
}

export function defineTimeline(): void {
  define('sub-timeline-item', SubTimelineItem)
  define('sub-timeline', SubTimeline)
}

declare global {
  interface HTMLElementTagNameMap {
    'sub-timeline': SubTimeline
    'sub-timeline-item': SubTimelineItem
  }
}
