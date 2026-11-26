import { LitElement, css, html, nothing } from 'lit'
import { icons } from './shared/icons'
import { baseStyles, iconStyles, visuallyHidden } from './shared/styles'
import { define } from './shared/utils'

/**
 * Key figure with context: label, value, optional prefix/suffix and a trend. A metric always has a
 * label and a comparison ("Active users (last 30 days): 1,247, up 12% vs last month"); a trend is
 * arrow + words, never colour alone. Built on a real `<dl>`.
 */
export class SubStatistic extends LitElement {
  static override properties = {
    label: { type: String },
    value: { type: String },
    prefix: { type: String },
    suffix: { type: String },
    trend: { type: String, reflect: true },
    trendText: { type: String, attribute: 'trend-text' },
    raw: { type: Boolean },
  }

  declare label: string
  declare value: string
  declare prefix: string
  declare suffix: string
  declare trend: '' | 'up' | 'down' | 'flat'
  /** Comparison in words: "12% vs last month" */
  declare trendText: string
  /** Do not localise a numeric value */
  declare raw: boolean

  constructor() {
    super()
    this.label = ''
    this.value = ''
    this.prefix = ''
    this.suffix = ''
    this.trend = ''
    this.trendText = ''
    this.raw = false
  }

  static override styles = [
    baseStyles,
    iconStyles,
    visuallyHidden,
    css`
      :host {
        display: block;
        font-family: var(--sub-font-sans);
        color: var(--sub-color-text);
      }

      dl {
        display: grid;
        gap: var(--sub-statistic-gap);
        margin: 0;
      }

      dt {
        color: var(--sub-color-muted);
        font-size: var(--sub-statistic-label-size);
        font-weight: var(--sub-weight-semibold);
      }

      dd {
        margin: 0;
      }

      .value {
        font-size: var(--sub-statistic-value-size);
        font-weight: var(--sub-weight-bold);
        line-height: var(--sub-leading-tight);
        font-variant-numeric: tabular-nums;
      }

      .trend {
        display: inline-flex;
        gap: var(--sub-space-1);
        align-items: center;
        font-size: var(--sub-text-sm);
        font-weight: var(--sub-weight-semibold);
      }

      :host([trend='up']) .trend {
        color: var(--sub-color-success);
      }

      :host([trend='down']) .trend {
        color: var(--sub-color-danger);
      }

      :host([trend='flat']) .trend {
        color: var(--sub-color-muted);
      }

      .icon {
        inline-size: 1.25em;
        block-size: 1.25em;
      }
    `,
  ]

  #format(): string {
    const n = Number(this.value.replace(/,/g, ''))
    return !this.raw && this.value.trim() !== '' && Number.isFinite(n) ? n.toLocaleString() : this.value
  }

  protected override render() {
    const trendIcon = this.trend === 'up' ? icons.trending_up() : this.trend === 'down' ? icons.trending_down() : icons.trending_flat()
    const trendWord = this.trend === 'up' ? 'Up' : this.trend === 'down' ? 'Down' : 'No change'
    return html`<dl part="statistic">
      <dt>${this.label}</dt>
      <dd class="value">${this.prefix}${this.#format()}${this.suffix}</dd>
      ${this.trend
        ? html`<dd class="trend">${trendIcon}<span><span class="sr-only">${trendWord}: </span>${this.trendText}</span></dd>`
        : nothing}
    </dl>`
  }
}

export function defineStatistic(): void {
  define('sub-statistic', SubStatistic)
}

declare global {
  interface HTMLElementTagNameMap {
    'sub-statistic': SubStatistic
  }
}
