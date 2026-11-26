import { LitElement, css, html } from 'lit'
import { baseStyles } from './shared/styles'
import { define } from './shared/utils'

/**
 * Repeating text mark over its content (confidential, draft, user name). Purely visual: `aria-hidden`,
 * `pointer-events: none`, so it never blocks or confuses interaction. Make sure the text under it
 * keeps 4.5:1 contrast (keep `--sub-watermark-opacity` low) and never use it as the only way to say
 * "draft": put that in real text too. It is a deterrent, not security.
 */
export class SubWatermark extends LitElement {
  static override properties = {
    content: { type: String },
    rotate: { type: Number },
    _url: { state: true },
  }

  declare content: string
  declare rotate: number
  declare _url: string

  constructor() {
    super()
    this.content = ''
    this.rotate = -20
    this._url = ''
  }

  static override styles = [
    baseStyles,
    css`
      :host {
        position: relative;
        display: block;
      }

      .mark {
        position: absolute;
        inset: 0;
        pointer-events: none;
        opacity: var(--sub-watermark-opacity);
        background-repeat: repeat;
        z-index: 1;
      }

      @media (forced-colors: active) {
        .mark {
          display: none;
        }
      }
    `,
  ]

  protected override updated(changed: Map<string, unknown>): void {
    if (!changed.has('content') && !changed.has('rotate')) return
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    if (!ctx || !this.content) {
      this._url = ''
      return
    }
    const color = getComputedStyle(this).getPropertyValue('--sub-color-text').trim() || '#000'
    canvas.width = 240
    canvas.height = 140
    ctx.translate(120, 70)
    ctx.rotate((this.rotate * Math.PI) / 180)
    ctx.fillStyle = color
    ctx.font = '600 18px sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText(this.content, 0, 0)
    this._url = canvas.toDataURL()
  }

  protected override render() {
    return html`<slot></slot>
      <div class="mark" aria-hidden="true" style=${this._url ? `background-image:url(${this._url})` : ''}></div>`
  }
}

export function defineWatermark(): void {
  define('sub-watermark', SubWatermark)
}

declare global {
  interface HTMLElementTagNameMap {
    'sub-watermark': SubWatermark
  }
}
