import { LitElement, css, html, nothing } from 'lit'
import { baseStyles } from './shared/styles'
import { define, warn } from './shared/utils'

const initials = (name: string): string =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w.charAt(0).toUpperCase())
    .join('')

/**
 * Person or entity avatar. `name` is its accessible name (always required unless `decorative`, e.g.
 * when the name is written right next to it). Falls back to initials when the image fails.
 * Size from `size` (xs sm md lg xl) or `--sub-avatar-size`.
 */
export class SubAvatar extends LitElement {
  static override properties = {
    name: { type: String },
    src: { type: String },
    size: { type: String, reflect: true },
    decorative: { type: Boolean },
    _failed: { state: true },
  }

  declare name: string
  declare src: string
  declare size: '' | 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  declare decorative: boolean
  declare _failed: boolean

  constructor() {
    super()
    this.name = ''
    this.src = ''
    this.size = ''
    this.decorative = false
    this._failed = false
  }

  static override styles = [
    baseStyles,
    css`
      :host {
        --_size: var(--sub-avatar-size);
        display: inline-grid;
        flex: none;
        vertical-align: middle;
      }

      :host([size='xs']) {
        --_size: 1.5rem;
      }
      :host([size='sm']) {
        --_size: 2rem;
      }
      :host([size='md']) {
        --_size: 2.5rem;
      }
      :host([size='lg']) {
        --_size: 3.5rem;
      }
      :host([size='xl']) {
        --_size: 5rem;
      }

      .avatar {
        display: grid;
        place-items: center;
        inline-size: var(--_size);
        block-size: var(--_size);
        border: var(--sub-avatar-border-width) solid var(--sub-color-border);
        border-radius: var(--sub-avatar-radius);
        background: var(--sub-color-accent-subtle);
        color: var(--sub-color-on-accent-subtle);
        font: var(--sub-weight-bold) max(0.75rem, calc(var(--_size) * 0.4)) / 1 var(--sub-font-sans);
        overflow: hidden;
      }

      img {
        inline-size: 100%;
        block-size: 100%;
        object-fit: cover;
      }
    `,
  ]

  protected override willUpdate(changed: Map<string, unknown>): void {
    if (changed.has('src')) this._failed = false
  }

  protected override firstUpdated(): void {
    if (!this.name && !this.decorative) warn('<sub-avatar> needs a "name" (or "decorative" when the name is next to it).')
  }

  protected override render() {
    const showImage = this.src && !this._failed
    return html`<span
      class="avatar"
      part="avatar"
      role=${this.decorative ? nothing : 'img'}
      aria-label=${this.decorative ? nothing : this.name}
      aria-hidden=${this.decorative ? 'true' : nothing}
      >${showImage
        ? html`<img src=${this.src} alt="" @error=${() => (this._failed = true)} />`
        : html`<span aria-hidden="true">${initials(this.name) || '?'}</span>`}</span
    >`
  }
}

export function defineAvatar(): void {
  define('sub-avatar', SubAvatar)
}

declare global {
  interface HTMLElementTagNameMap {
    'sub-avatar': SubAvatar
  }
}
