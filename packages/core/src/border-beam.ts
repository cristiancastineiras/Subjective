import { LitElement, css, html } from 'lit'
import { baseStyles } from './shared/styles'
import { define } from './shared/utils'

/**
 * Border beam: a light that travels around the border of whatever it wraps (a highlighted card, an AI
 * answer, a call to action). Purely decorative: it adds no content, nothing is announced, and the still
 * border underneath keeps the shape readable. It stops under `prefers-reduced-motion`, `data-sub-motion="off"`
 * and forced-colors, so use it for emphasis only, never to carry meaning.
 *
 *   <sub-border-beam><sub-card>New: dark mode</sub-card></sub-border-beam>
 */
export class SubBorderBeam extends LitElement {
  static override styles = [
    baseStyles,
    css`
      :host {
        position: relative;
        display: block;
        border: var(--sub-border-beam-width) solid var(--sub-border-beam-base);
        border-radius: var(--sub-border-beam-radius);
      }

      /* A ring (the border area only) in which a big conic gradient turns */
      .beam {
        position: absolute;
        inset: calc(var(--sub-border-beam-width) * -1);
        padding: var(--sub-border-beam-width);
        overflow: hidden;
        border-radius: inherit;
        pointer-events: none;
        mask:
          linear-gradient(#000 0 0) content-box,
          linear-gradient(#000 0 0);
        mask-composite: exclude;
        -webkit-mask-composite: xor;
      }

      .beam::before {
        content: '';
        position: absolute;
        inset-block-start: 50%;
        inset-inline-start: 50%;
        inline-size: 300%;
        aspect-ratio: 1;
        translate: -50% -50%;
        background: conic-gradient(from 0deg, transparent 0 75%, var(--sub-border-beam-color) 100%);
        animation: turn calc(var(--sub-border-beam-duration) * var(--sub-motion-scale)) linear infinite;
      }

      @keyframes turn {
        to {
          rotate: 360deg;
        }
      }

      @media (forced-colors: active) {
        .beam {
          display: none;
        }
      }
    `,
  ]

  protected override render() {
    return html`<slot></slot><div class="beam" aria-hidden="true"></div>`
  }
}

export function defineBorderBeam(): void {
  define('sub-border-beam', SubBorderBeam)
}

declare global {
  interface HTMLElementTagNameMap {
    'sub-border-beam': SubBorderBeam
  }
}
