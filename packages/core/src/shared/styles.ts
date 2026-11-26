import { css, unsafeCSS, type CSSResult } from 'lit'

/** Reset + `hidden` that cannot be overridden by `display`. Add to every component. */
export const baseStyles = css`
  *,
  *::before,
  *::after {
    box-sizing: border-box;
  }

  :host([hidden]),
  [hidden] {
    display: none !important;
  }
`

/**
 * One focus indicator for every native control inside a shadow root (never `outline: none`):
 * an inner dark ring (box-shadow) + an outer yellow ring (outline). Two rings so it contrasts on
 * light AND dark backgrounds (WCAG 2.4.7 / 2.4.11 / 2.4.13). `outline` survives forced-colors mode.
 * Tokens: --sub-focus-width, --sub-focus-inner-width, --sub-focus-offset, --sub-color-focus(-inner).
 */
export const focusStyles = css`
  :is(a, button, input, select, textarea, summary, [tabindex]):focus-visible {
    --_ring: calc(var(--sub-focus-offset) + var(--sub-focus-inner-width));
    outline: var(--sub-focus-width) solid var(--sub-color-focus);
    outline-offset: var(--_ring);
    box-shadow: 0 0 0 var(--_ring) var(--sub-color-focus-inner);
  }
`

/**
 * Same indicator drawn INSIDE the element, for items that sit flush against a clipping container
 * (tabs, accordion headers, menu items). `selector` is a constant written by us, never user input.
 */
export const focusInset = (selector: string): CSSResult =>
  unsafeCSS(`${selector.split(',').map((s) => `${s.trim()}:focus-visible`).join(', ')} {
    outline: var(--sub-focus-width) solid transparent; /* shows in forced-colors mode */
    outline-offset: calc(var(--sub-focus-width) * -1);
    box-shadow:
      inset 0 0 0 var(--sub-focus-width) var(--sub-color-focus),
      inset 0 0 0 calc(var(--sub-focus-width) + var(--sub-focus-inner-width)) var(--sub-color-focus-inner);
  }`)

/** Text that is only for assistive technology. Usage: <span class="sr-only"> */
export const visuallyHidden = css`
  .sr-only {
    position: absolute;
    inline-size: 1px;
    block-size: 1px;
    margin: -1px;
    padding: 0;
    overflow: hidden;
    clip-path: inset(50%);
    white-space: nowrap;
    border: 0;
  }
`

/** Size + alignment for the inline SVG icons from `icons.ts` */
export const iconStyles = css`
  .icon {
    flex: none;
    inline-size: var(--sub-icon-md);
    block-size: var(--sub-icon-md);
  }

  /* Arrows/chevrons point the other way in right-to-left layouts */
  :host(:dir(rtl)) .icon.flip {
    scale: -1 1;
  }

  @media (forced-colors: active) {
    .icon {
      forced-color-adjust: auto;
    }
  }
`

/** Family + rhythm shared by button-like controls (size/weight come from each component's tokens). */
export const controlTypography = css`
  font-family: var(--sub-font-sans);
  line-height: var(--sub-leading-normal);
`

export const commonStyles = [baseStyles, focusStyles, visuallyHidden, iconStyles]

/**
 * Appear/disappear for a top-layer popup (fade + a short slide, `--sub-motion-distance`), written for
 * `selector` (a constant of ours). Durations are 0ms when animations are off or reduced, so it is a no-op then.
 */
export const popupMotion = (selector: string): CSSResult =>
  unsafeCSS(`${selector} {
    opacity: 0;
    translate: 0 calc(var(--sub-motion-distance) * -0.5);
    transition:
      opacity var(--sub-duration-fast) var(--sub-ease-standard),
      translate var(--sub-duration-fast) var(--sub-ease-standard),
      overlay var(--sub-duration-fast) allow-discrete,
      display var(--sub-duration-fast) allow-discrete;
  }
  ${selector}:popover-open, ${selector}[data-open] {
    opacity: 1;
    translate: 0 0;
  }
  @starting-style {
    ${selector}:popover-open {
      opacity: 0;
      translate: 0 calc(var(--sub-motion-distance) * -0.5);
    }
  }`)
