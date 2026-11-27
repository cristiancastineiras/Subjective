export type Placement = 'top' | 'bottom'

type Anchor = Pick<Element, 'getBoundingClientRect'>

export interface PlaceOptions {
  /** The side it is on now: kept while it still fits, so it does not jump from side to side while you scroll */
  current?: Placement
  /** Limit the height to the room on its side when it fits on neither (lists, calendars): it scrolls inside */
  fitHeight?: boolean
  /** Smallest height `fitHeight` may leave (px) */
  minHeight?: number
}

/**
 * Place a `position: fixed` element (a popover in the top layer) against its anchor. It is ATTACHED to the anchor,
 * always: below it (or above, `preferred`), on the other side when there is no room, and when the anchor scrolls
 * out of the screen the element goes with it rather than staying stuck to the edge. Only the horizontal position
 * is kept inside the screen. Writes `data-placement` (top | bottom) on the element for direction-aware styling.
 * Anchor-positioning CSS is not Baseline in every engine yet.
 */
export function placeNear(
  anchor: Anchor,
  floating: HTMLElement,
  preferred: Placement = 'top',
  align: 'center' | 'start' = 'center',
  gap = 8,
  pad = 8,
  options: PlaceOptions = {},
): Placement {
  if (options.fitHeight) floating.style.maxBlockSize = '' // measure its natural height
  const a = anchor.getBoundingClientRect()
  const f = floating.getBoundingClientRect()
  const vw = document.documentElement.clientWidth
  const vh = document.documentElement.clientHeight
  const room = { top: a.top - gap - pad, bottom: vh - pad - a.bottom - gap }
  const fits = (side: Placement) => f.height <= room[side]
  const other: Placement = preferred === 'top' ? 'bottom' : 'top'
  const placement: Placement =
    options.current && fits(options.current)
      ? options.current
      : fits(preferred)
        ? preferred
        : fits(other)
          ? other
          : room[other] > room[preferred]
            ? other
            : preferred
  let height = f.height
  if (options.fitHeight && !fits(placement)) {
    height = Math.max(options.minHeight ?? 120, room[placement])
    floating.style.maxBlockSize = `${height}px`
  }
  const top = placement === 'top' ? a.top - gap - height : a.bottom + gap
  const wanted = align === 'center' ? a.left + a.width / 2 - f.width / 2 : a.left
  const left = Math.max(pad, Math.min(wanted, vw - f.width - pad))
  floating.style.top = `${top}px`
  floating.style.left = `${left}px`
  floating.dataset.placement = placement
  return placement
}

/**
 * While a floating element is open, call `update` whenever its anchor may have moved: a scroll of the page or of
 * ANY scroll container (synchronously, before the frame is painted, so it never lags behind), a resize, the
 * visual viewport (phone keyboard, pinch zoom), and a size change of `observe` (the anchor, the element itself).
 * Returns the function that stops it.
 */
export function autoUpdate(update: () => void, observe: Array<Element | null | undefined> = []): () => void {
  let raf = 0
  const later = () => {
    cancelAnimationFrame(raf)
    raf = requestAnimationFrame(update)
  }
  const viewport = typeof visualViewport === 'undefined' ? null : visualViewport
  window.addEventListener('scroll', update, { capture: true, passive: true })
  window.addEventListener('resize', update, { passive: true })
  viewport?.addEventListener('resize', update)
  viewport?.addEventListener('scroll', update)
  // a resize observer reports before paint; positioning there could loop on its own size: next frame instead
  const sizes = typeof ResizeObserver === 'undefined' ? undefined : new ResizeObserver(later)
  for (const el of observe) if (el) sizes?.observe(el)
  update()
  return () => {
    cancelAnimationFrame(raf)
    window.removeEventListener('scroll', update, { capture: true })
    window.removeEventListener('resize', update)
    viewport?.removeEventListener('resize', update)
    viewport?.removeEventListener('scroll', update)
    sizes?.disconnect()
  }
}
