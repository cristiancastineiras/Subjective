import { LitElement, css, nothing } from 'lit'
import { html, unsafeStatic } from 'lit/static-html.js'
import { baseStyles, iconStyles } from './shared/styles'
import { define } from './shared/utils'
import { iconCheckCircleFill, iconErrorFill, iconInfoFill, iconLock, iconSearchOff, iconWarningFill } from './shared/material-icons'

export type ResultStatus = 'success' | 'info' | 'warning' | 'error' | '403' | '404' | '500'

const ICON = { success: iconCheckCircleFill, info: iconInfoFill, warning: iconWarningFill, error: iconErrorFill, '403': iconLock, '404': iconSearchOff, '500': iconErrorFill } as const
const COLOUR = { success: 'success', info: 'info', warning: 'warning', error: 'danger', '403': 'warning', '404': 'info', '500': 'danger' } as const

/**
 * Outcome page or panel: what happened, what it means, what to do next (actions in `slot="actions"`).
 * Status is icon + title + text, never colour alone. Error codes are decoration: the title says it in words.
 */
export class SubResult extends LitElement {
  static override properties = {
    status: { type: String, reflect: true },
    heading: { type: String },
    subtitle: { type: String },
    level: { type: Number },
  }

  declare status: ResultStatus
  declare heading: string
  declare subtitle: string
  declare level: number

  constructor() {
    super()
    this.status = 'info'
    this.heading = ''
    this.subtitle = ''
    this.level = 2
  }

  static override styles = [
    baseStyles,
    iconStyles,
    css`
      :host {
        display: block;
        font-family: var(--sub-font-sans);
        color: var(--sub-color-text);
      }

      .result {
        display: grid;
        gap: var(--sub-result-gap);
        justify-items: center;
        padding-block: var(--sub-result-padding-block);
        text-align: center;
      }

      .icon {
        inline-size: var(--sub-result-icon-size);
        block-size: var(--sub-result-icon-size);
        color: var(--_c);
      }

      .code {
        color: var(--_c);
        font-size: var(--sub-text-3xl);
        font-weight: var(--sub-weight-bold);
        line-height: 1;
      }

      h2,
      h3,
      h4,
      h5,
      h6 {
        margin: 0;
        font-size: var(--sub-text-2xl);
        line-height: var(--sub-leading-snug);
        text-wrap: balance;
      }

      .sub {
        margin: 0;
        max-inline-size: var(--sub-measure);
        color: var(--sub-color-muted);
      }

      .actions {
        display: flex;
        flex-wrap: wrap;
        gap: var(--sub-target-gap);
        justify-content: center;
      }

      .actions:not(:has(::slotted(*))) {
        display: none;
      }
    `,
  ]

  protected override render() {
    const tag = unsafeStatic(`h${Math.min(6, Math.max(1, this.level))}`)
    const colour = COLOUR[this.status] ?? 'info'
    const code = /^\d{3}$/.test(this.status) ? this.status : ''
    return html`<section class="result" style=${`--_c: var(--sub-color-${colour})`}>
      ${(ICON[this.status] ?? iconInfoFill)()}${code ? html`<span class="code" aria-hidden="true">${code}</span>` : nothing}
      <${tag}>${this.heading}</${tag}>
      ${this.subtitle ? html`<p class="sub">${this.subtitle}</p>` : nothing}
      <slot></slot>
      <div class="actions"><slot name="actions"></slot></div>
    </section>`
  }
}

export function defineResult(): void {
  define('sub-result', SubResult)
}

declare global {
  interface HTMLElementTagNameMap {
    'sub-result': SubResult
  }
}
