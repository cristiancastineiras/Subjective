export type Placement = 'top' | 'bottom'

/**
 * Place a `position: fixed` element next to an anchor, flipping when there is no room.
 * Used by tooltip and menu. Anchor-positioning CSS is not Baseline in every engine yet.
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
  const fitsTop = a.top - gap - f.height >= pad
  const fitsBottom = a.bottom + gap + f.height <= vh - pad
  const placement: Placement = preferred === 'top' ? (fitsTop || !fitsBottom ? 'top' : 'bottom') : fitsBottom || !fitsTop ? 'bottom' : 'top'
  const top = placement === 'top' ? a.top - gap - f.height : a.bottom + gap
  const wanted = align === 'center' ? a.left + a.width / 2 - f.width / 2 : a.left
  const left = Math.min(Math.max(pad, wanted), vw - f.width - pad)
  floating.style.top = `${Math.max(pad, top)}px`
  floating.style.left = `${Math.max(pad, left)}px`
  return placement
}
