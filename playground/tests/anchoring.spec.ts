import { expect, test, type Page } from '@playwright/test'
import { open } from './helpers'

// Everything that hangs from a component (menu, calendar, popover, option list, tooltip, tour step) stays ATTACHED
// to it: it follows every scroll, moves above when there is no room below, and leaves the screen with its anchor
// instead of sticking to the edge (shared/position.ts: placeNear + autoUpdate).

interface Case {
  id: string
  /** Opens the floating part */
  open: (page: Page) => Promise<unknown>
  /** JS expression returning [anchor element, floating element] */
  parts: string
  /** The side it takes when there is room (`top` for tooltips) */
  side: 'top' | 'bottom'
}

const shadow = (host: string, anchor: string, floating: string) =>
  `(() => { const h = document.querySelector('${host}'); return [${anchor}, ${floating}] })()`

const CASES: Case[] = [
  {
    id: 'menu',
    open: (p) => p.locator('#preview sub-menu').first().getByRole('button', { name: 'More actions' }).click(),
    parts: shadow('#preview sub-menu', "h.shadowRoot.querySelector('.trigger')", "h.shadowRoot.querySelector('[role=menu]')"),
    side: 'bottom',
  },
  {
    id: 'date-picker',
    open: (p) => p.locator('#preview sub-date-picker').first().getByRole('button', { name: 'Choose date' }).click(),
    parts: shadow('#preview sub-date-picker', "h.shadowRoot.querySelector('.wrap')", "h.shadowRoot.querySelector('.pop')"),
    side: 'bottom',
  },
  {
    id: 'popover',
    open: (p) => p.getByRole('button', { name: 'Shipping details' }).click(),
    parts: shadow('#preview sub-popover', "h.querySelector('[slot=trigger]')", "h.shadowRoot.querySelector('.panel')"),
    side: 'bottom',
  },
  {
    id: 'select',
    open: (p) => p.getByRole('combobox', { name: /^Country/ }).click(),
    parts: shadow('#preview sub-select', "h.shadowRoot.querySelector('.trigger')", "h.shadowRoot.querySelector('.panel')"),
    side: 'bottom',
  },
  {
    // onboarding: the highlight follows its target, the step card follows the highlight
    id: 'tour',
    open: (p) => p.getByRole('button', { name: 'Start the tour' }).click(),
    parts: shadow('#preview sub-tour', "h.shadowRoot.querySelector('.spot')", "h.shadowRoot.querySelector('.card')"),
    side: 'bottom',
  },
  {
    id: 'tooltip',
    open: (p) => p.getByRole('button', { name: 'Export report' }).focus(),
    parts: `[document.querySelector('#export'), document.querySelector('#preview sub-tooltip')]`,
    side: 'top',
  },
]

const measure = (page: Page, parts: string) =>
  page.evaluate(`(() => {
    const [a, f] = ${parts}
    const r = (e) => { const b = e.getBoundingClientRect(); return { top: Math.round(b.top), bottom: Math.round(b.bottom) } }
    return { anchor: r(a), panel: r(f), side: f.dataset.placement, vh: document.documentElement.clientHeight }
  })()`) as Promise<{ anchor: { top: number; bottom: number }; panel: { top: number; bottom: number }; side: string; vh: number }>

/** Scroll the page so that the anchor's top is at `y` in the viewport */
const putAnchorAt = (page: Page, parts: string, y: number) =>
  page.evaluate(`(() => { const [a] = ${parts}; if (a) window.scrollBy(0, a.getBoundingClientRect().top - ${y}) })()`) // (a tour draws its highlight only once started)

/** Distance between the panel and the anchor edge it hangs from */
const gap = (m: Awaited<ReturnType<typeof measure>>) => (m.side === 'top' ? m.anchor.top - m.panel.bottom : m.panel.top - m.anchor.bottom)

for (const c of CASES) {
  test(`${c.id}: stays attached while scrolling, moves above at the bottom, leaves with its anchor`, async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 })
    await page.emulateMedia({ reducedMotion: 'reduce' }) // no opening slide: positions are final at once
    await open(page, c.id)
    // room to scroll the anchor anywhere on the screen
    await page.evaluate(() => {
      for (const where of ['prepend', 'append'] as const) {
        const spacer = Object.assign(document.createElement('div'), { className: 'test-spacer' })
        spacer.style.blockSize = '150vh'
        document.body[where](spacer)
      }
    })
    await putAnchorAt(page, c.parts, 300)
    await c.open(page)
    await expect.poll(async () => (await measure(page, c.parts)).side).toBe(c.side)
    const start = await measure(page, c.parts)
    const attached = gap(start)
    expect(attached).toBeGreaterThanOrEqual(0)
    expect(attached).toBeLessThan(24)
    // the position follows in the scroll event, before the next frame is painted: wait for that frame, not longer
    let last = start
    const settled = (step: string, check: (m: Awaited<ReturnType<typeof measure>>) => boolean) =>
      expect.poll(async () => { last = await measure(page, c.parts); return check(last) || `${step}: ${JSON.stringify(last)} (attached ${attached})` }, { timeout: 2000, message: step }).toBe(true)

    // 1. a scroll moves it exactly with its anchor
    await page.evaluate(() => window.scrollBy(0, 120))
    await settled('1 scroll', (m) => m.anchor.top < start.anchor.top - 60 && gap(m) === attached && m.side === c.side)

    if (c.side === 'bottom') {
      // 2. no room below: it moves above its anchor, still attached
      const m = await measure(page, c.parts)
      await putAnchorAt(page, c.parts, m.vh - (m.anchor.bottom - m.anchor.top) - 24)
      await settled('2 flip', (now) => now.side === 'top' && now.panel.bottom <= now.anchor.top && gap(now) < 24)
    }

    // 3. the anchor scrolls off the top of the screen: the panel goes with it (never stuck to the edge)
    await putAnchorAt(page, c.parts, -200)
    await settled('3 leaves', (now) => now.anchor.top < -150 && gap(now) >= 0 && gap(now) < 24 && now.panel.top < start.panel.top - 300)
  })
}
