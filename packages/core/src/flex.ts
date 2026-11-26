import { LitElement, css, html } from 'lit'
import { baseStyles } from './shared/styles'
import { define } from './shared/utils'

/**
 * Flexbox container. `direction`, `gap` (a step of the spacing scale: 0 1 2 3 4 6 8 12),
 * `align`, `justify`, `wrap`. DOM order is visual order: never reorder with CSS only.
 */
export class SubFlex extends LitElement {
  static override properties = {
    direction: { type: String, reflect: true },
    gap: { type: String, reflect: true },
    align: { type: String, reflect: true },
    justify: { type: String, reflect: true },
    wrap: { type: Boolean, reflect: true },
  }

  declare direction: 'row' | 'column'
  declare gap: string
  declare align: 'start' | 'center' | 'end' | 'stretch' | 'baseline'
  declare justify: 'start' | 'center' | 'end' | 'between' | 'around'
  declare wrap: boolean

  constructor() {
    super()
    this.direction = 'row'
    this.gap = ''
    this.align = 'stretch'
    this.justify = 'start'
    this.wrap = false
  }

  static override styles = [
    baseStyles,
    css`
      :host {
        display: flex;
        gap: var(--sub-flex-gap);
      }

      :host([direction='column']) {
        flex-direction: column;
      }
      :host([wrap]) {
        flex-wrap: wrap;
      }
      :host([gap='0']) {
        gap: 0;
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
      :host([gap='4']) {
        gap: var(--sub-space-4);
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
      :host([align='start']) {
        align-items: flex-start;
      }
      :host([align='center']) {
        align-items: center;
      }
      :host([align='end']) {
        align-items: flex-end;
      }
      :host([align='baseline']) {
        align-items: baseline;
      }
      :host([justify='center']) {
        justify-content: center;
      }
      :host([justify='end']) {
        justify-content: flex-end;
      }
      :host([justify='between']) {
        justify-content: space-between;
      }
      :host([justify='around']) {
        justify-content: space-around;
      }
    `,
  ]

  protected override render() {
    return html`<slot></slot>`
  }
}

/** Inline group of controls that wraps and keeps small, consistent gaps (>= 8px between targets). */
export class SubSpace extends LitElement {
  static override properties = {
    direction: { type: String, reflect: true },
    align: { type: String, reflect: true },
  }

  declare direction: 'horizontal' | 'vertical'
  declare align: 'start' | 'center' | 'end'

  constructor() {
    super()
    this.direction = 'horizontal'
    this.align = 'center'
  }

  static override styles = [
    baseStyles,
    css`
      :host {
        display: inline-flex;
        flex-wrap: wrap;
        gap: var(--sub-space-gap);
        align-items: center;
      }

      :host([direction='vertical']) {
        display: inline-flex;
        flex-direction: column;
        align-items: flex-start;
      }

      :host([align='start']) {
        align-items: flex-start;
      }
      :host([align='end']) {
        align-items: flex-end;
      }
    `,
  ]

  protected override render() {
    return html`<slot></slot>`
  }
}

export function defineFlex(): void {
  define('sub-flex', SubFlex)
  define('sub-space', SubSpace)
}

declare global {
  interface HTMLElementTagNameMap {
    'sub-flex': SubFlex
    'sub-space': SubSpace
  }
}
