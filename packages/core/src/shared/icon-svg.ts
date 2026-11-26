import { html, type TemplateResult } from 'lit'

/**
 * Decorative inline icon from Material Symbols path data (960 grid). `fill="currentColor"` follows the text colour
 * and survives forced colours; `flip` mirrors it in right-to-left layouts (the `.flip` rule in `iconStyles`).
 * Meaning must always live in text next to it.
 */
export function svgIcon(d: string, flip = false): TemplateResult {
  return html`<svg class="icon${flip ? ' flip' : ''}" viewBox="0 -960 960 960" aria-hidden="true" focusable="false" fill="currentColor">
    <path d=${d}></path>
  </svg>`
}
