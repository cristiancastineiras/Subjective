import { css, html, unsafeCSS, type CSSResult } from 'lit'

/**
 * Small screens: panels become sheets. One breakpoint for the whole library (dialogs, select, date picker,
 * menus, layout components), so a page never mixes a desktop popup with a phone sheet.
 */
export const SHEET_QUERY = '(max-width: 40rem)'
export const isSheet = (): boolean => typeof matchMedia === 'function' && matchMedia(SHEET_QUERY).matches

/** Title + Done row at the top of a sheet (hidden on large screens, see `sheetHeadStyles`) */
export function sheetHeader(title: string, done: string, onDone: () => void) {
  return html`<div class="sheet-head"><span class="sheet-title">${title}</span><button type="button" class="sheet-done" @click=${onDone}>${done}</button></div>`
}

export const sheetHeadStyles = css`
  .sheet-head {
    display: none;
  }

  @media (max-width: 40rem) {
    .sheet-head {
      display: flex;
      flex: none;
      gap: var(--sub-space-3);
      align-items: center;
      justify-content: space-between;
      padding: var(--sub-space-2) var(--sub-space-4);
      border-block-end: var(--sub-listbox-border-width) solid var(--sub-color-border-subtle);
    }

    .sheet-title {
      font-weight: var(--sub-weight-bold);
      font-size: var(--sub-text-lg);
    }

    .sheet-done {
      min-block-size: var(--sub-target-size);
      min-inline-size: var(--sub-target-size);
      padding: 0 var(--sub-space-4);
      border: var(--sub-field-border-width) solid var(--sub-color-accent);
      border-radius: var(--sub-field-radius);
      background: var(--sub-color-accent);
      color: var(--sub-color-on-accent);
      font: var(--sub-weight-semibold) var(--sub-text-md) / 1 var(--sub-font-sans);
      cursor: pointer;
    }
  }
`

/**
 * Anchored popup on large screens, BOTTOM SHEET on small ones: `container` (the popover element) covers the
 * screen, its `.scrim` child dims the page and closes the sheet when tapped (the tap never reaches what is
 * underneath), and `panel` is docked to the bottom edge, full width, within thumb reach, above the
 * home indicator (safe area). Give the container a `<div class="scrim" aria-hidden="true">` first child;
 * `panel` is a simple selector of the container's other direct child (e.g. `.sheet`).
 */
export const bottomSheet = (container: string, panel: string): CSSResult =>
  unsafeCSS(`
  ${container} > .scrim {
    display: none;
  }

  @media (max-width: 40rem) {
    ${container} {
      /* !important: beats the inline top/left a desktop placement may have left */
      inset: 0 !important;
      inline-size: 100%;
      block-size: 100dvh;
      min-inline-size: 0;
      max-inline-size: none;
      max-block-size: none;
      margin: 0;
      padding: 0;
      border: 0;
      border-radius: 0;
      background: transparent;
      overflow: hidden;
      translate: 0 0;
    }

    ${container}:popover-open,
    ${container}[data-open] {
      display: flex;
      flex-direction: column;
      justify-content: flex-end;
    }

    ${container} > .scrim {
      display: block;
      position: fixed;
      inset: 0;
      background: var(--sub-color-overlay);
      touch-action: none; /* a swipe on the dimmed page does not scroll the page behind */
    }

    ${container} > ${panel} {
      position: relative;
      max-block-size: 85dvh;
      overflow: auto;
      overscroll-behavior: contain;
      border-block-start: var(--sub-surface-border-width) solid var(--sub-color-border);
      border-start-start-radius: var(--sub-surface-radius);
      border-start-end-radius: var(--sub-surface-radius);
      background: var(--sub-color-surface-raised);
      padding-block-end: env(safe-area-inset-bottom);
      translate: 0 var(--sub-motion-distance);
      transition: translate var(--sub-duration-base) var(--sub-ease-standard);
    }

    ${container}:popover-open > ${panel},
    ${container}[data-open] > ${panel} {
      translate: 0 0;
    }

    @starting-style {
      ${container}:popover-open > ${panel} {
        translate: 0 var(--sub-motion-distance);
      }
    }
  }
`)
