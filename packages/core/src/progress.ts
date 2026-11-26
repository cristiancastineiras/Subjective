import { LitElement, css, html, nothing } from 'lit'
import { styleMap } from 'lit/directives/style-map.js'
import { baseStyles } from './shared/styles'
import { define, warn } from './shared/utils'

/**
 * Progress bar. With a `value` it is determinate (`aria-valuenow/min/max` + text "42%"); without one
 * it is indeterminate and says what is happening. Never fake values, never jump to 100% and freeze.
 * Always named: it says WHAT is progressing ("Uploading report.pdf").
 */
export class SubProgress extends LitElement {
  static override properties = {
    value: { type: Number },
    max: { type: Number },
    label: { type: String },
    valuetext: { type: String },
    showValue: { type: Boolean, attribute: 'show-value' },
  }

  /** Current amount. Omit for indeterminate. */
  declare value: number | undefined
  declare max: number
  declare label: string
  /** Human text instead of a percentage: "2.3 MB of 8 MB" */
  declare valuetext: string
  declare showValue: boolean

  constructor() {
    super()
    this.value = undefined
    this.max = 100
    this.label = ''
    this.valuetext = ''
    this.showValue = false
  }

  static override styles = [
    baseStyles,
    css`
      :host {
        display: block;
        font-family: var(--sub-font-sans);
        color: var(--sub-color-text);
      }

      .top {
        display: flex;
        gap: var(--sub-space-3);
        justify-content: space-between;
        margin-block-end: var(--sub-space-1);
        font-weight: var(--sub-weight-semibold);
      }

      .value {
        font-variant-numeric: tabular-nums;
      }

      .track {
        block-size: var(--sub-progress-height);
        border: var(--sub-progress-border-width) solid var(--sub-color-border);
        border-radius: var(--sub-progress-radius);
        background: var(--sub-color-surface);
        overflow: hidden;
      }

      .fill {
        block-size: 100%;
        background: var(--sub-color-accent);
        transition: inline-size var(--sub-duration-base) var(--sub-ease-standard);
      }

      .track[data-indeterminate] .fill {
        inline-size: 40%;
        animation: slide 1.4s var(--sub-ease-standard) infinite;
      }

      @keyframes slide {
        from {
          translate: -100% 0;
        }
        to {
          translate: 250% 0;
        }
      }

      /* No motion: a still partial bar still reads as "in progress" with the label */
      @media (prefers-reduced-motion: reduce) {
        .track[data-indeterminate] .fill {
          animation: none;
        }
      }

      @media (forced-colors: active) {
        .fill {
          background: Highlight;
        }
      }
    `,
  ]

  protected override firstUpdated(): void {
    if (!this.label) warn('<sub-progress> needs a "label" saying what is progressing.')
  }

  protected override render() {
    const determinate = this.value !== undefined
    const pct = determinate ? Math.min(100, Math.max(0, (this.value! / this.max) * 100)) : 0
    const text = this.valuetext || `${Math.round(pct)}%`
    return html`<div class="top">
        <span id="label">${this.label}</span>${this.showValue && determinate ? html`<span class="value">${text}</span>` : nothing}
      </div>
      <div
        class="track"
        role="progressbar"
        aria-labelledby="label"
        aria-valuemin=${determinate ? '0' : nothing}
        aria-valuemax=${determinate ? String(this.max) : nothing}
        aria-valuenow=${determinate ? String(this.value) : nothing}
        aria-valuetext=${determinate ? text : nothing}
        ?data-indeterminate=${!determinate}
      >
        <div class="fill" style=${styleMap(determinate ? { inlineSize: `${pct}%` } : {})}></div>
      </div>`
  }
}

export function defineProgress(): void {
  define('sub-progress', SubProgress)
}

declare global {
  interface HTMLElementTagNameMap {
    'sub-progress': SubProgress
  }
}
