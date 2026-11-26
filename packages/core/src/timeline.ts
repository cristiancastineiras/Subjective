import { LitElement, css, html, nothing } from 'lit'
import { ChildrenController } from './shared/children'
import { baseStyles, focusStyles, iconStyles, visuallyHidden } from './shared/styles'
import { define } from './shared/utils'
import { iconCheckCircleFill, iconErrorFill, iconInfoFill, iconSchedule } from './shared/material-icons'

const STATUS = { done: iconCheckCircleFill, current: iconSchedule, todo: iconSchedule, error: iconErrorFill, info: iconInfoFill } as const
const WORD = { done: 'Completed', current: 'In progress', todo: 'Upcoming', error: 'Failed', info: 'Note' } as const

/**
 * Chronological list on a real `<ol>`. Children:
 *
 *   <sub-timeline label="Order history">
 *     <sub-timeline-item time="2026-11-20" status="done" heading="Order placed">We received it.</sub-timeline-item>
 *   </sub-timeline>
 *
 * Status is icon + a visually hidden word, never colour alone. The author's item markup is shown in place (a slot).
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

  protected override willUpdate(): void {
    // the item's content is projected into its entry, not copied: the author's nodes and listeners keep working
    this.#items.elements.forEach((el, i) => el.setAttribute('slot', `item-${i}`))
  }

  protected override render() {
    return html`<ol aria-label=${this.label || nothing}>
      ${this.#items.elements.map((el, i) => {
        const status = (el.getAttribute('status') ?? 'done') as keyof typeof STATUS
        const time = el.getAttribute('time')
        return html`<li data-status=${status}>
          <span class="dot">${(STATUS[status] ?? iconCheckCircleFill)()}</span>
          <div>
            ${time ? html`<time datetime=${time}>${time}</time>` : nothing}
            <div class="title">${el.getAttribute('heading')}<span class="sr-only"> (${WORD[status] ?? ''})</span></div>
            <div><slot name=${`item-${i}`}></slot></div>
          </div>
        </li>`
      })}
    </ol>`
  }
}

/** One entry of <sub-timeline>: the attributes describe it, its content is shown in place. */
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
      display: contents;
    }
  `
  protected override render() {
    return html`<slot></slot>`
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
