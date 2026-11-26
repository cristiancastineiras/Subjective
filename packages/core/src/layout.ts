import { LitElement, css, html } from 'lit'
import { baseStyles } from './shared/styles'
import { define } from './shared/utils'

/**
 * Page container: centred, bounded (never full-bleed on ultra-wide screens), with a responsive
 * gutter. `size`: `prose` (~720px), `wide` (1200px, default), `max` (1440px) or `full`.
 */
export class SubContainer extends LitElement {
  static override properties = {
    size: { type: String, reflect: true },
  }

  declare size: 'prose' | 'wide' | 'max' | 'full'

  constructor() {
    super()
    this.size = 'wide'
  }

  static override styles = [
    baseStyles,
    css`
      :host {
        display: block;
        inline-size: 100%;
        max-inline-size: var(--sub-page-wide);
        margin-inline: auto;
        padding-inline: var(--sub-gutter);
      }

      :host([size='prose']) {
        max-inline-size: var(--sub-page-prose);
      }

      :host([size='max']) {
        max-inline-size: var(--sub-page-max);
      }

      :host([size='full']) {
        max-inline-size: none;
      }
    `,
  ]

  protected override render() {
    return html`<slot></slot>`
  }
}

/**
 * Vertical rhythm from the spacing scale: related things close, unrelated things far (proximity).
 * `gap` is the scale step: 1 (4px) 2 (8px) 3 (12px) 4 (16px) 6 (24px) 8 (32px) 12 (48px).
 */
export class SubStack extends LitElement {
  static override properties = {
    gap: { type: String, reflect: true },
  }

  declare gap: '1' | '2' | '3' | '4' | '6' | '8' | '12'

  constructor() {
    super()
    this.gap = '4'
  }

  static override styles = [
    baseStyles,
    css`
      :host {
        display: grid;
        gap: var(--sub-space-4);
        align-content: start;
      }

      :host([gap='1']) {
        gap: var(--sub-space-1);
      }
      :host([gap='2']) {
        gap: var(--sub-space-2);
      }
      :host([gap='3']) {
        gap: var(--sub-space-3);
      }
      :host([gap='6']) {
        gap: var(--sub-space-6);
      }
      :host([gap='8']) {
        gap: var(--sub-space-8);
      }
      :host([gap='12']) {
        gap: var(--sub-space-12);
      }
    `,
  ]

  protected override render() {
    return html`<slot></slot>`
  }
}

/**
 * Long-form reading column: 45-75 characters per line (`--sub-measure`), unitless line height
 * 1.5-1.6, paragraph spacing >= 1.5x the line height. Survives WCAG 1.4.12 text-spacing overrides.
 */
export class SubProse extends LitElement {
  static override styles = [
    baseStyles,
    css`
      :host {
        display: block;
        max-inline-size: var(--sub-measure);
        font-family: var(--sub-font-sans);
        font-size: var(--sub-text-md);
        line-height: var(--sub-leading-relaxed);
        color: var(--sub-color-text);
        overflow-wrap: break-word;
      }

      ::slotted(*) {
        margin-block: 0 calc(1em * var(--sub-leading-relaxed) * 1.5);
      }

      ::slotted(:last-child) {
        margin-block-end: 0;
      }
    `,
  ]

  protected override render() {
    return html`<slot></slot>`
  }
}

export function defineLayout(): void {
  define('sub-container', SubContainer)
  define('sub-stack', SubStack)
  define('sub-prose', SubProse)
}

declare global {
  interface HTMLElementTagNameMap {
    'sub-container': SubContainer
    'sub-stack': SubStack
    'sub-prose': SubProse
  }
}
