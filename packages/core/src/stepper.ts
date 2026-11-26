import { LitElement, css, html, nothing } from 'lit'
import { ChildrenController } from './shared/children'
import { messages } from './shared/messages'
import { baseStyles, iconStyles, visuallyHidden } from './shared/styles'
import { define } from './shared/utils'
import { iconCheck } from './shared/material-icons'

/**
 * Progress through a multi-step form: "Step 2 of 3: Profile". Never hides the total number of steps.
 * Steps are plain list items, so the markup still reads without JavaScript:
 *
 *   <sub-stepper current="2"><li>Account</li><li>Profile</li><li>Setup</li></sub-stepper>
 *
 * Progress is text + tick + position, never colour alone. The step title changes politely.
 */
export class SubStepper extends LitElement {
  static override properties = {
    current: { type: Number, reflect: true },
    label: { type: String },
  }

  /** 1-based current step */
  declare current: number
  /** Accessible name of the progress navigation */
  declare label: string

  readonly #steps = new ChildrenController<HTMLLIElement>(this, 'li')

  constructor() {
    super()
    this.current = 1
    this.label = 'Progress'
  }

  static override styles = [
    baseStyles,
    visuallyHidden,
    iconStyles,
    css`
      :host {
        display: block;
        inline-size: 100%; /* a container never shrink-wraps its content: fill the line (also inside a flex row) */
        container-type: inline-size;
        font-family: var(--sub-font-sans);
        color: var(--sub-color-text);
      }

      .title {
        margin: 0 0 var(--sub-space-3);
        font-size: var(--sub-text-lg);
        font-weight: var(--sub-weight-semibold);
      }

      ol {
        display: grid;
        grid-auto-flow: column;
        grid-auto-columns: 1fr;
        gap: var(--sub-stepper-gap);
        margin: 0;
        padding: 0;
        list-style: none;
      }

      li {
        display: grid;
        gap: var(--sub-space-1);
        padding-block-start: var(--sub-space-2);
        border-block-start: var(--sub-stepper-bar-height) solid var(--sub-color-border-subtle);
        font-size: var(--sub-stepper-font-size);
        color: var(--sub-color-muted);
      }

      li[data-state='done'],
      li[aria-current='step'] {
        border-block-start-color: var(--sub-color-accent);
      }

      li[aria-current='step'] {
        color: var(--sub-color-text);
        font-weight: var(--sub-weight-semibold);
      }

      .name {
        display: flex;
        gap: var(--sub-space-1);
        align-items: center;
      }

      .icon {
        inline-size: var(--sub-icon-sm);
        block-size: var(--sub-icon-sm);
        color: var(--sub-color-accent);
      }

      /* Narrow: only the current step name is visible; the others stay readable by screen readers */
      @container (inline-size < 30rem) {
        li:not([aria-current='step']) .name {
          position: absolute;
          inline-size: 1px;
          block-size: 1px;
          margin: -1px;
          overflow: hidden;
          clip-path: inset(50%);
        }
      }

      @media (forced-colors: active) {
        li {
          border-block-start-color: GrayText;
        }

        li[data-state='done'],
        li[aria-current='step'] {
          border-block-start-color: Highlight;
        }
      }
    `,
  ]

  protected override render() {
    const items = this.#steps.elements.map((li) => li.textContent?.trim() ?? '')
    const total = items.length
    const current = Math.min(Math.max(1, this.current), Math.max(1, total))
    const name = items[current - 1] ?? ''
    return html`<nav aria-label=${this.label}>
      <p class="title" aria-live="polite">${messages.stepOf(current, total)}${name ? html`: ${name}` : nothing}</p>
      <ol>
        ${items.map((text, i) => {
          const n = i + 1
          const state = n < current ? 'done' : n === current ? 'current' : 'todo'
          return html`<li data-state=${state} aria-current=${state === 'current' ? 'step' : nothing}>
            <span class="name"
              >${state === 'done' ? iconCheck() : nothing}<span>${text}</span>${state === 'done'
                ? html`<span class="sr-only"> (completed)</span>`
                : nothing}</span
            >
          </li>`
        })}
      </ol>
    </nav>`
  }
}

export function defineStepper(): void {
  define('sub-stepper', SubStepper)
}

declare global {
  interface HTMLElementTagNameMap {
    'sub-stepper': SubStepper
  }
}
