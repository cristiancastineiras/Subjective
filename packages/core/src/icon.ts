import { LitElement, css, html, nothing } from 'lit'
import { iconNames, iconPath, isDirectional, registerIcon } from './shared/icons'
import { baseStyles } from './shared/styles'
import { define, warn } from './shared/utils'

export { registerIcon, iconNames }

/**
 * Icon from Material Symbols (https://fonts.google.com/icons), inline SVG. DECORATIVE by default
 * (`aria-hidden`): put the meaning in text next to it. Add `label` only when the icon stands alone
 * and conveys information ("Warning"): it becomes `role="img"` with that name. Inside a button,
 * label the BUTTON, not the icon.
 *
 * `filled` uses the filled variant. `currentColor` fill (text colour, forced-colors safe), size from
 * `--sub-icon-size`, mirrored in right-to-left layouts when directional (arrows, chevrons).
 * Never focusable. Ships only the icons in `icons.config.json`; add yours with `registerIcon()`.
 */
export class SubIcon extends LitElement {
  static override properties = {
    name: { type: String, reflect: true },
    label: { type: String },
    filled: { type: Boolean },
  }

  /** Material Symbols name, e.g. `search`, `close`, `check_circle` */
  declare name: string
  declare label: string
  declare filled: boolean

  constructor() {
    super()
    this.name = ''
    this.label = ''
    this.filled = false
  }

  static override styles = [
    baseStyles,
    css`
      :host {
        display: inline-flex;
        flex: none;
        vertical-align: -0.2em;
        inline-size: var(--sub-icon-size);
        block-size: var(--sub-icon-size);
      }

      svg {
        inline-size: 100%;
        block-size: 100%;
      }

      :host(:dir(rtl)) svg.flip {
        scale: -1 1;
      }
    `,
  ]

  protected override firstUpdated(): void {
    if (this.name && !iconPath(this.name)) warn(`<sub-icon name="${this.name}"> is not shipped. Add it to icons.config.json (or registerIcon). Known: ${iconNames().join(', ')}`)
  }

  protected override render() {
    const path = (this.filled && iconPath(`${this.name}-fill`)) || iconPath(this.name)
    if (!path) return nothing
    const named = Boolean(this.label)
    return html`<svg
      class=${isDirectional(this.name) ? 'flip' : ''}
      viewBox="0 -960 960 960"
      fill="currentColor"
      focusable="false"
      role=${named ? 'img' : nothing}
      aria-label=${named ? this.label : nothing}
      aria-hidden=${named ? nothing : 'true'}
    >
      <path d=${path}></path>
    </svg>`
  }
}

export function defineIcon(): void {
  define('sub-icon', SubIcon)
}

declare global {
  interface HTMLElementTagNameMap {
    'sub-icon': SubIcon
  }
}
