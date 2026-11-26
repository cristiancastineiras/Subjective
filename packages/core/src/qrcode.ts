import qrcode from 'qrcode-generator'
import { LitElement, css, html, nothing } from 'lit'
import { baseStyles } from './shared/styles'
import { define } from './shared/utils'

/**
 * QR code as inline SVG (crisp at any size, follows `--sub-color-text` on `--sub-color-surface` so it
 * stays scannable in dark mode: the quiet zone is a real light square). A QR code is NOT accessible by
 * itself: it is an image with a name AND the encoded value is shown as text (`show-value`) so people who
 * cannot scan can still use it. `level`: error correction L, M (default), Q, H.
 */
export class SubQrcode extends LitElement {
  static override properties = {
    value: { type: String },
    label: { type: String },
    level: { type: String },
    showValue: { type: Boolean, attribute: 'show-value' },
  }

  declare value: string
  declare label: string
  declare level: 'L' | 'M' | 'Q' | 'H'
  declare showValue: boolean

  constructor() {
    super()
    this.value = ''
    this.label = ''
    this.level = 'M'
    this.showValue = true
  }

  static override styles = [
    baseStyles,
    css`
      :host {
        display: inline-block;
        font-family: var(--sub-font-sans);
        color: var(--sub-color-text);
      }

      figure {
        display: grid;
        gap: var(--sub-space-2);
        justify-items: center;
        margin: 0;
      }

      svg {
        inline-size: var(--sub-qrcode-size);
        block-size: var(--sub-qrcode-size);
        padding: var(--sub-qrcode-padding);
        border: var(--sub-qrcode-border-width) solid var(--sub-color-border);
        /* A QR needs dark modules on a LIGHT quiet zone in every theme */
        background: #fff;
        color: #000;
      }

      figcaption {
        max-inline-size: var(--sub-qrcode-size);
        font-size: var(--sub-text-sm);
        text-align: center;
        overflow-wrap: anywhere;
      }
    `,
  ]

  #path(): { d: string; n: number } {
    if (!this.value) return { d: '', n: 0 }
    const qr = qrcode(0, this.level)
    qr.addData(this.value)
    qr.make()
    const n = qr.getModuleCount()
    let d = ''
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (qr.isDark(r, c)) d += `M${c} ${r}h1v1h-1z`
    return { d, n }
  }

  protected override render() {
    const { d, n } = this.#path()
    if (!n) return nothing
    return html`<figure>
      <svg viewBox=${`0 0 ${n} ${n}`} role="img" aria-label=${this.label || `QR code: ${this.value}`} shape-rendering="crispEdges">
        <path d=${d} fill="currentColor"></path>
      </svg>
      ${this.showValue ? html`<figcaption>${this.value}</figcaption>` : nothing}
    </figure>`
  }
}

export function defineQrcode(): void {
  define('sub-qrcode', SubQrcode)
}

declare global {
  interface HTMLElementTagNameMap {
    'sub-qrcode': SubQrcode
  }
}
