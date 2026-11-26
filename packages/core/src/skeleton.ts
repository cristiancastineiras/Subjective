import { LitElement, css, html } from 'lit'
import { baseStyles } from './shared/styles'
import { define } from './shared/utils'

/**
 * Loading placeholder that MATCHES the real layout (a generic one feels slower). Use it for areas
 * that take ~0.5-3 s; show real structure (header, nav) immediately and fill content after.
 *
 * Give the loading region ONE name: `<sub-skeleton label="Loading projects">` becomes a
 * `role="status"` with `aria-busy="true"`; without a label it is purely decorative (`aria-hidden`).
 * Size with `lines` (text), `variant="avatar"` or `variant="block"` + `--sub-skeleton-height`.
 */
export class SubSkeleton extends LitElement {
  static override properties = {
    variant: { type: String, reflect: true },
    lines: { type: Number },
    label: { type: String },
  }

  declare variant: 'text' | 'avatar' | 'block'
  declare lines: number
  declare label: string

  constructor() {
    super()
    this.variant = 'text'
    this.lines = 3
    this.label = ''
  }

  static override styles = [
    baseStyles,
    css`
      :host {
        display: block;
      }

      .bar {
        --_base: var(--sub-color-surface-sunken);
        --_shine: var(--sub-color-surface-hover);
        block-size: var(--sub-skeleton-line-height);
        margin-block: 0.4em;
        border-radius: var(--sub-skeleton-radius);
        background: linear-gradient(90deg, var(--_base) 25%, var(--_shine) 50%, var(--_base) 75%) 100% 0 / 400% 100%;
        animation: shimmer 1.6s linear infinite;
        font-size: var(--sub-text-md);
      }

      .bar:last-child:not(:only-child) {
        inline-size: 60%;
      }

      :host([variant='avatar']) .bar {
        inline-size: var(--sub-skeleton-size, 3rem);
        block-size: var(--sub-skeleton-size, 3rem);
        margin: 0;
        border-radius: 50%;
      }

      :host([variant='block']) .bar {
        inline-size: 100%;
        block-size: var(--sub-skeleton-height, 8rem);
        margin: 0;
      }

      @keyframes shimmer {
        to {
          background-position: 0 0;
        }
      }

      /* No motion: a still placeholder is enough */
      @media (prefers-reduced-motion: reduce) {
        .bar {
          animation: none;
        }
      }

      @media (forced-colors: active) {
        .bar {
          border: 1px solid GrayText;
        }
      }
    `,
  ]

  protected override updated(): void {
    if (this.label) {
      this.setAttribute('role', 'status')
      this.setAttribute('aria-busy', 'true')
      this.setAttribute('aria-label', this.label)
      this.removeAttribute('aria-hidden')
    } else {
      this.removeAttribute('role')
      this.removeAttribute('aria-busy')
      this.removeAttribute('aria-label')
      this.setAttribute('aria-hidden', 'true')
    }
  }

  protected override render() {
    const n = this.variant === 'text' ? Math.max(1, this.lines) : 1
    return html`${Array.from({ length: n }, () => html`<div class="bar"></div>`)}`
  }
}

export function defineSkeleton(): void {
  define('sub-skeleton', SubSkeleton)
}

declare global {
  interface HTMLElementTagNameMap {
    'sub-skeleton': SubSkeleton
  }
}
