import { LitElement, css, html, nothing } from 'lit'
import { baseStyles } from './shared/styles'
import { define, warn } from './shared/utils'

/**
 * Image that cannot ship without a text decision (WCAG 1.1.1):
 *  - informative: `alt="what it conveys or the action it triggers"` (purpose, not appearance; < 125 chars)
 *  - decorative: `decorative` (or `alt=""`) -> `alt=""` so assistive tech skips it
 * Missing alt is a developer error: it logs a warning and renders `alt=""` (never the file name).
 * `caption` renders a real `<figure>/<figcaption>`.
 */
export class SubImage extends LitElement {
  static override properties = {
    src: { type: String },
    alt: { type: String },
    decorative: { type: Boolean },
    caption: { type: String },
    loading: { type: String },
    width: { type: Number },
    height: { type: Number },
  }

  declare src: string
  declare alt: string | null
  declare decorative: boolean
  declare caption: string
  declare loading: 'lazy' | 'eager'
  /** Intrinsic size: reserves space and prevents layout shift */
  declare width: number | undefined
  declare height: number | undefined

  constructor() {
    super()
    this.src = ''
    this.alt = null
    this.decorative = false
    this.caption = ''
    this.loading = 'lazy'
    this.width = undefined
    this.height = undefined
  }

  static override styles = [
    baseStyles,
    css`
      :host {
        display: block;
      }

      figure {
        margin: 0;
      }

      img {
        display: block;
        max-inline-size: 100%;
        block-size: auto;
        border: var(--sub-image-border-width) solid var(--sub-color-border);
      }

      figcaption {
        margin-block-start: var(--sub-space-2);
        color: var(--sub-color-muted);
        font: var(--sub-weight-regular) var(--sub-image-caption-size) / var(--sub-leading-normal) var(--sub-font-sans);
      }
    `,
  ]

  protected override firstUpdated(): void {
    const alt = this.alt
    if (alt === null && !this.decorative) warn(`<sub-image src="${this.src}"> needs "alt" (or "decorative"). Rendering alt="".`)
    if (alt && /^(image|picture|photo|graphic) of\b/i.test(alt)) warn(`<sub-image alt="${alt}">: do not start with "image of"; screen readers already say it is an image.`)
    if (alt && alt.length > 125) warn('<sub-image> alt is over 125 characters: move the long description into the surrounding text.')
  }

  protected override render() {
    const alt = this.decorative ? '' : (this.alt ?? '')
    const img = html`<img
      src=${this.src}
      alt=${alt}
      loading=${this.loading}
      width=${this.width ?? nothing}
      height=${this.height ?? nothing}
      decoding="async"
    />`
    return this.caption ? html`<figure>${img}<figcaption>${this.caption}</figcaption></figure>` : img
  }
}

export function defineImage(): void {
  define('sub-image', SubImage)
}

declare global {
  interface HTMLElementTagNameMap {
    'sub-image': SubImage
  }
}
