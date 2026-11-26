import { LitElement, css, nothing } from 'lit'
import { html, unsafeStatic } from 'lit/static-html.js'
import { baseStyles } from './shared/styles'
import { define, warn } from './shared/utils'

export type EmptyVariant = 'first-use' | 'no-results' | 'filtered' | 'error'

/**
 * Empty state: explain WHY it is empty and give the next action (max 2 actions, the primary one
 * specific: "Create your first project"). Never a blank area or a bare "No data".
 *
 * Variants (write distinct copy for each):
 *  - `first-use`   "You don't have any projects yet" + what will appear + CTA
 *  - `no-results`  echo the query ("No results for 'blue shoes'"), offer recovery, never clear the query
 *  - `filtered`    say the filters caused it; show removable chips (<sub-chip>) + "Clear all"
 *  - `error`       say loading FAILED (not "no projects"), "Try again" first; announced assertively
 *
 * Description in the default slot, actions in `slot="actions"`, optional decoration in
 * `slot="illustration"` (hidden from assistive tech; the state must work without it).
 */
export class SubEmptyState extends LitElement {
  static override properties = {
    variant: { type: String, reflect: true },
    heading: { type: String },
    level: { type: Number },
  }

  declare variant: EmptyVariant
  declare heading: string
  /** Heading level (2-6) matching the page outline */
  declare level: number

  constructor() {
    super()
    this.variant = 'first-use'
    this.heading = ''
    this.level = 2
  }

  static override styles = [
    baseStyles,
    css`
      :host {
        display: block;
        font-family: var(--sub-font-sans);
        color: var(--sub-color-text);
      }

      .empty {
        display: grid;
        gap: var(--sub-empty-state-gap);
        justify-items: center;
        max-inline-size: var(--sub-empty-state-max-width);
        margin-inline: auto;
        padding: var(--sub-empty-state-padding-block) var(--sub-space-4);
        text-align: center;
      }

      :host([variant='error']) .empty {
        padding-block: var(--sub-space-8);
      }

      .illustration {
        max-inline-size: 12rem;
      }

      .illustration:not(:has(::slotted(*))) {
        display: none;
      }

      h2,
      h3,
      h4,
      h5,
      h6 {
        margin: 0;
        font-size: var(--sub-empty-state-heading-size);
        font-weight: var(--sub-weight-semibold);
        line-height: var(--sub-leading-snug);
        text-wrap: balance;
      }

      .description {
        color: var(--sub-color-muted);
        text-wrap: pretty;
      }

      .description ::slotted(*) {
        margin: 0;
      }

      .actions {
        display: flex;
        flex-wrap: wrap;
        gap: var(--sub-target-gap);
        justify-content: center;
        margin-block-start: var(--sub-space-2);
      }

      .actions:not(:has(::slotted(*))) {
        display: none;
      }
    `,
  ]

  protected override firstUpdated(): void {
    if (!this.heading) warn('<sub-empty-state> needs a "heading" that explains why it is empty.')
    if (this.querySelectorAll(':scope > [slot=actions]').length > 2) warn('<sub-empty-state>: at most 2 actions.')
  }

  protected override render() {
    const tag = unsafeStatic(`h${Math.min(6, Math.max(2, this.level))}`)
    // no-results/filtered change in place: announce politely. error: assertively. first-use is static.
    const live = this.variant === 'error' ? 'alert' : undefined
    const polite = this.variant === 'no-results' || this.variant === 'filtered' ? 'polite' : undefined
    return html`<div class="empty" role=${live ?? nothing} aria-live=${polite ?? nothing}>
      <div class="illustration" aria-hidden="true"><slot name="illustration"></slot></div>
      <${tag}>${this.heading}</${tag}>
      <div class="description"><slot></slot></div>
      <div class="actions"><slot name="actions"></slot></div>
    </div>`
  }
}

export function defineEmptyState(): void {
  define('sub-empty-state', SubEmptyState)
}

declare global {
  interface HTMLElementTagNameMap {
    'sub-empty-state': SubEmptyState
  }
}
