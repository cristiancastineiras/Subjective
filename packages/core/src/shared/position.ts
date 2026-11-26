export type Placement = 'top' | 'bottom'

/**
 * Place a `position: fixed` element next to an anchor, flipping when there is no room.
 * Used by tooltip, menu, popover and date picker. Anchor-positioning CSS is not Baseline in every engine yet.
 * When it fits on neither side (a short viewport: a phone in landscape, a zoomed page) it goes where there is
 * more room and stays on screen, covering part of the anchor rather than leaving the viewport.
 * shortcut: vertical placements only, add left/right when a component needs them.
 */
export function placeNear(
  anchor: Pick<Element, "getBoundingClientRect">,
  floating: HTMLElement,
  preferred: Placement = 'top',
  align: 'center' | 'start' = 'center',
  gap = 8,
  pad = 8,
): Placement {
  const a = anchor.getBoundingClientRect()
  const f = floating.getBoundingClientRect()
  const vw = document.documentElement.clientWidth
  const vh = document.documentElement.clientHeight
  const roomTop = a.top - gap - pad
  const roomBottom = vh - pad - a.bottom - gap
  const fitsTop = f.height <= roomTop
  const fitsBottom = f.height <= roomBottom
  const placement: Placement =
    preferred === 'top'
      ? fitsTop ? 'top' : fitsBottom ? 'bottom' : roomTop >= roomBottom ? 'top' : 'bottom'
      : fitsBottom ? 'bottom' : fitsTop ? 'top' : roomBottom >= roomTop ? 'bottom' : 'top'
  const wantedTop = placement === 'top' ? a.top - gap - f.height : a.bottom + gap
  const top = Math.max(pad, Math.min(wantedTop, vh - f.height - pad))
  const wanted = align === 'center' ? a.left + a.width / 2 - f.width / 2 : a.left
  const left = Math.min(Math.max(pad, wanted), vw - f.width - pad)
  floating.style.top = `${top}px`
  floating.style.left = `${Math.max(pad, left)}px`
  return placement
}
