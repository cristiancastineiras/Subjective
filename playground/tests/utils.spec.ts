import { expect, test } from '@playwright/test'
import { open } from './helpers'

type Tools = {
  accessibleName(el: Element): string
  checkContrast(fg: string, bg: string, o?: { kind?: string; level?: string }): { ratio: number; required: number; passes: boolean; level: string }
  lintA11y(root: ParentNode): Array<{ rule: string; message: string }>
  tabOrder(root: ParentNode): Array<{ order: number; role: string; name: string; tabindex: number; issues: string[] }>
  targetSize(el: Element): { width: number; height: number; aa: boolean; aaa: boolean }
  getPreferences(): Record<string, unknown>
  trapFocus(el: HTMLElement, o?: object): () => void
  lockScroll(): () => void
  Typeahead: new <T>(text: (i: T) => string, ms?: number) => { match(items: T[], key: string, from?: number, skip?: (i: T) => boolean): number }
  matchesShortcut(e: KeyboardEvent, s: string): boolean
  isActivationKey(e: KeyboardEvent): boolean
  arrowDirection(e: KeyboardEvent, rtl?: boolean): string | null
}
const tools = 'window.subA11yTools'

test('accessibleName reads labels, aria-labelledby, alt, content and shadow DOM', async ({ page }) => {
  await open(page, 'a11y-tools')
  const names = await page.evaluate(async (expr) => {
    const t = eval(expr) as Tools
    const box = document.createElement('div')
    box.innerHTML = `<label for="e1">Email address</label><input id="e1"><span id="lab">Billing</span><input id="e2" aria-labelledby="lab"><img id="i" src="x" alt="Logo"><button id="b1"><span aria-hidden="true">x</span> Close</button><button id="b2" aria-label="Menu">...</button><div id="d" title="Tip"></div><button id="b3"></button>`
    document.body.append(box)
    const n = (id: string) => t.accessibleName(box.querySelector('#' + id)!)
    const shadow = document.querySelector('#sandbox sub-button')!.shadowRoot!.querySelector('button')!
    const out = { label: n('e1'), labelledby: n('e2'), alt: n('i'), content: n('b1'), aria: n('b2'), title: n('d'), none: n('b3'), shadow: t.accessibleName(shadow) }
    box.remove()
    return out
  }, tools)
  expect(names).toEqual({ label: 'Email address', labelledby: 'Billing', alt: 'Logo', content: 'Close', aria: 'Menu', title: 'Tip', none: '', shadow: 'Save draft' })
})

test('checkContrast: ratio, the ratio needed and pass/fail for text, large text and UI', async ({ page }) => {
  await open(page, 'a11y-tools')
  const r = await page.evaluate((expr) => {
    const t = eval(expr) as Tools
    return {
      grey: t.checkContrast('#767676', '#ffffff'),
      lighter: t.checkContrast('#777777', '#ffffff'),
      aaa: t.checkContrast('#000000', '#ffffff', { level: 'AAA' }),
      ui: t.checkContrast('#949494', '#ffffff', { kind: 'ui' }),
      named: t.checkContrast('rebeccapurple', 'white'),
    }
  }, tools)
  expect(r.grey).toMatchObject({ passes: true, level: 'AA', required: 4.5 })
  expect(r.lighter).toMatchObject({ passes: false, level: 'fail' })
  expect(r.aaa).toMatchObject({ passes: true, level: 'AAA', required: 7, ratio: 21 })
  expect(r.ui).toMatchObject({ passes: true, required: 3 })
  expect(r.named.ratio).toBeGreaterThan(7)
})

test('tabOrder: positive tabindex goes first and every problem is reported', async ({ page }) => {
  await open(page, 'a11y-tools')
  const stops = await page.evaluate((expr) => {
    const t = eval(expr) as Tools
    const box = document.createElement('div')
    box.innerHTML = '<a href="#a">First link</a><button>Plain</button><button tabindex="2">Jumps ahead</button><button aria-label=""></button><div aria-hidden="true"><button>Hidden but focusable</button></div>'
    document.body.append(box)
    const out = t.tabOrder(box).map((s) => ({ order: s.order, name: s.name, issues: s.issues }))
    box.remove()
    return out
  }, tools)
  expect(stops[0]).toMatchObject({ order: 1, name: 'Jumps ahead' })
  expect(stops[0]!.issues.join(' ')).toContain('tabindex="2"')
  expect(stops.find((s) => s.name === '')!.issues).toContain('no accessible name')
  expect(stops.find((s) => s.name === 'Hidden but focusable')!.issues.join(' ')).toContain('aria-hidden')
})

test('lintA11y finds the common mistakes in markup', async ({ page }) => {
  await open(page, 'a11y-tools')
  const rules = await page.evaluate((expr) => {
    const t = eval(expr) as Tools
    const box = document.createElement('div')
    box.innerHTML = '<img src="x.png"><button></button><a href="/a" target="_blank">Docs</a><input id="q" aria-label="Search"><input id="q" aria-label="Again"><div aria-labelledby="nope" tabindex="3">Panel</div><img src="d.png" alt="">'
    return t.lintA11y(box).map((i) => i.rule).sort()
  }, tools)
  expect(rules).toEqual(['aria-reference', 'control-name', 'duplicate-id', 'img-alt', 'link-target', 'positive-tabindex'])
  // the Studio and the demo pages themselves are clean of these basics
  const clean = await page.evaluate((expr) => (eval(expr) as Tools).lintA11y(document.querySelector('#sandbox')!), tools)
  expect(clean).toEqual([])
})

test('targetSize and getPreferences', async ({ page }) => {
  await open(page, 'a11y-tools')
  const r = await page.evaluate((expr) => {
    const t = eval(expr) as Tools
    const button = document.querySelector('#sandbox sub-button')!.shadowRoot!.querySelector('button')!
    return { size: t.targetSize(button), prefs: t.getPreferences() }
  }, tools)
  expect(r.size).toMatchObject({ aa: true, aaa: true })
  expect(r.prefs).toMatchObject({ reducedMotion: false, colorScheme: 'light', forcedColors: false })
  await page.emulateMedia({ reducedMotion: 'reduce', colorScheme: 'dark' })
  const after = await page.evaluate((expr) => (eval(expr) as Tools).getPreferences(), tools)
  expect(after).toMatchObject({ reducedMotion: true, colorScheme: 'dark' })
})

test('Typeahead, shortcuts and arrow directions', async ({ page }) => {
  await open(page, 'a11y-tools')
  const r = await page.evaluate((expr) => {
    const t = eval(expr) as Tools
    const items = ['Madrid', 'Malaga', 'Milan', 'Paris']
    const a = new t.Typeahead<string>((s) => s)
    const first = a.match(items, 'm', -1)
    const second = a.match(items, 'm', first) // same letter again cycles
    const b = new t.Typeahead<string>((s) => s)
    b.match(items, 'm')
    const narrowed = b.match(items, 'a', 0) // "ma" -> Madrid (from 0)
    const key = (init: KeyboardEventInit) => new KeyboardEvent('keydown', init)
    return {
      first,
      second,
      narrowed,
      ctrlK: t.matchesShortcut(key({ key: 'k', ctrlKey: true }), 'Ctrl+K'),
      noCtrl: t.matchesShortcut(key({ key: 'k' }), 'Ctrl+K'),
      shiftQ: t.matchesShortcut(key({ key: '?', shiftKey: true }), 'Shift+?'),
      altDown: t.matchesShortcut(key({ key: 'ArrowDown', altKey: true }), 'Alt+ArrowDown'),
      space: t.isActivationKey(key({ key: ' ' })),
      rtl: [t.arrowDirection(key({ key: 'ArrowRight' })), t.arrowDirection(key({ key: 'ArrowRight' }), true)],
    }
  }, tools)
  expect(r).toEqual({ first: 0, second: 1, narrowed: 0, ctrlK: true, noCtrl: false, shiftQ: true, altDown: true, space: true, rtl: ['next', 'previous'] })
})

test('trapFocus keeps Tab inside and restores focus; lockScroll is counted', async ({ page }) => {
  await open(page, 'a11y-tools')
  await page.getByRole('link', { name: 'A plain link' }).focus()
  await page.evaluate((expr) => {
    const t = eval(expr) as Tools
    const box = document.createElement('div')
    box.id = 'trap'
    box.innerHTML = '<button id="t1">One</button><button id="t2">Two</button>'
    document.body.append(box)
    ;(window as unknown as { release: () => void }).release = t.trapFocus(box)
  }, tools)
  await expect(page.locator('#t1')).toBeFocused()
  await page.keyboard.press('Tab')
  await expect(page.locator('#t2')).toBeFocused()
  await page.keyboard.press('Tab') // wraps
  await expect(page.locator('#t1')).toBeFocused()
  await page.keyboard.press('Shift+Tab') // wraps back
  await expect(page.locator('#t2')).toBeFocused()
  await page.evaluate(() => (window as unknown as { release: () => void }).release())
  await expect(page.getByRole('link', { name: 'A plain link' })).toBeFocused()

  const overflow = await page.evaluate((expr) => {
    const t = eval(expr) as Tools
    const a = t.lockScroll()
    const b = t.lockScroll()
    const locked = getComputedStyle(document.documentElement).overflow
    a()
    const stillLocked = getComputedStyle(document.documentElement).overflow
    b()
    return [locked, stillLocked, getComputedStyle(document.documentElement).overflow]
  }, tools)
  expect(overflow).toEqual(['hidden', 'hidden', 'visible'])
})
