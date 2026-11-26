import { expect, test, type Locator, type Page } from '@playwright/test'
import { open } from './helpers'

// Phones get the phone version of each component: sheets docked to the bottom edge within thumb reach,
// navigation behind a Menu button, stacked layouts, swipe. Desktop keeps the anchored / side-by-side version.

const PHONE = { viewport: { width: 375, height: 740 }, isMobile: true, hasTouch: true }

/** Box of a part inside a component's shadow root */
const box = (host: Locator, selector: string) =>
  host.evaluate((el, selector) => {
    const r = el.shadowRoot!.querySelector(selector)!.getBoundingClientRect()
    return { left: Math.round(r.left), top: Math.round(r.top), right: Math.round(r.right), bottom: Math.round(r.bottom), width: Math.round(r.width), height: Math.round(r.height) }
  }, selector)

const deepFocusedLabel = (page: Page) =>
  page.evaluate(() => {
    let a = document.activeElement
    while (a?.shadowRoot?.activeElement) a = a.shadowRoot.activeElement
    return a?.getAttribute('aria-label') ?? a?.textContent?.trim() ?? ''
  })

test.describe('on a phone', () => {
  test.use(PHONE)
  test.skip(({ browserName }) => browserName !== 'chromium', 'phone emulation (isMobile) is Chromium only')

  test('date picker: the calendar is a bottom sheet with the field name and Done; focus returns to the button', async ({ page }) => {
    await open(page, 'date-picker')
    const picker = page.locator('#preview sub-date-picker').first()
    await picker.getByRole('button', { name: 'Choose date' }).tap()
    const sheet = page.getByRole('dialog', { name: 'Choose date: Start date' })
    await expect(sheet).toBeVisible()
    // docked to the bottom edge, full width (once it has slid in)
    await expect.poll(() => box(picker, '.sheet')).toMatchObject({ left: 0, right: 375, bottom: 740 })
    // the days get the full width: no smaller than 44px
    const day = await box(picker, 'sub-calendar')
    expect(day.width).toBeGreaterThan(320)

    await sheet.getByRole('button', { name: 'Done' }).tap()
    await expect(sheet).toBeHidden()
    expect(await deepFocusedLabel(page)).toBe('Choose date') // not the text field: no keyboard popping up
  })

  test('date picker: tapping the dimmed page closes the sheet and does not touch what is underneath', async ({ page }) => {
    await open(page, 'date-picker')
    const picker = page.locator('#preview sub-date-picker').first()
    await picker.getByRole('button', { name: 'Choose date' }).tap()
    await expect(page.getByRole('dialog', { name: /Choose date/ })).toBeVisible()
    let navigated = false
    page.on('framenavigated', () => (navigated = true))
    await page.touchscreen.tap(30, 120) // over the page heading and links
    await expect(page.getByRole('dialog', { name: /Choose date/ })).toBeHidden()
    expect(navigated).toBe(false)
  })

  test('date picker: digits alone are a date (a phone number pad has no "-")', async ({ page }) => {
    await open(page, 'date-picker')
    const field = page.getByRole('textbox', { name: /End date/ })
    await field.fill('20261205')
    await field.blur()
    await expect(field).toHaveValue('2026-12-05')
  })

  test('menu: an action sheet at the bottom edge; tapping outside closes it and focus goes back', async ({ page }) => {
    await open(page, 'menu')
    const host = page.locator('#preview sub-menu').first()
    await host.getByRole('button', { name: 'More actions' }).tap()
    await expect(host.getByRole('menuitem', { name: 'Duplicate' })).toBeVisible()
    await expect.poll(() => box(host, '.items')).toMatchObject({ left: 0, right: 375, bottom: 740 })
    expect((await box(host, '[role=menuitem]')).height).toBeGreaterThanOrEqual(44)

    await page.touchscreen.tap(180, 100)
    await expect(host.getByRole('menuitem', { name: 'Duplicate' })).toBeHidden()
    await expect(host.getByRole('button', { name: 'More actions' })).toHaveAttribute('aria-expanded', 'false')

    await host.getByRole('button', { name: 'More actions' }).tap()
    await host.getByRole('menuitem', { name: 'Archive' }).tap()
    await expect(page.locator('#result')).toHaveText('Chose: archive.')
  })

  test('layout: the navigation folds behind a Menu button; a link or Esc folds it again', async ({ page }) => {
    await open(page, 'shell')
    const layout = page.locator('#preview sub-layout')
    const menu = layout.getByRole('button', { name: 'Menu', exact: true })
    const link = layout.getByRole('link', { name: 'Reports' })
    await expect(menu).toHaveAttribute('aria-expanded', 'false')
    await expect(link).toBeHidden()

    await menu.tap()
    await expect(menu).toHaveAttribute('aria-expanded', 'true')
    await expect(link).toBeVisible()
    await link.tap()
    await expect(link).toBeHidden()

    await menu.click()
    await layout.getByRole('link', { name: 'Overview' }).focus()
    await page.keyboard.press('Escape')
    await expect(link).toBeHidden()
    await expect(menu).toBeFocused()
  })

  test('carousel: one row of controls with "1 / 3", and a swipe moves to the next slide (and stops autoplay)', async ({ page }) => {
    await open(page, 'carousel')
    const host = page.locator('#preview sub-carousel')
    await expect(host.getByText('1 / 3')).toBeVisible()
    await expect(host.getByRole('button', { name: '2 of 3', exact: true })).toBeHidden()
    const controls = await box(host, '.controls')
    expect(controls.height).toBeLessThan(60) // a single row

    const view = await box(host, '.viewport')
    const y = view.top + view.height / 2
    await host.evaluate((el, { y, from, to }) => {
      const viewport = el.shadowRoot!.querySelector('.viewport')!
      const fire = (type: string, x: number) => viewport.dispatchEvent(new PointerEvent(type, { bubbles: true, composed: true, pointerId: 7, pointerType: 'touch', clientX: x, clientY: y }))
      fire('pointerdown', from)
      fire('pointerup', to)
    }, { y, from: view.right - 40, to: view.left + 40 })
    await expect(host.getByText('2 / 3')).toBeVisible()
    await expect(host.getByRole('button', { name: 'Play' })).toBeVisible() // autoplay paused by the swipe
  })

  test('transfer: stacked lists, full-width move buttons whose arrows point up and down', async ({ page }) => {
    await open(page, 'transfer')
    const host = page.locator('#preview sub-transfer')
    const [down, up] = await host.evaluate((el) =>
      [...el.shadowRoot!.querySelectorAll('.moves button')].map((b) => ({
        width: Math.round(b.getBoundingClientRect().width),
        vertical: getComputedStyle(b.querySelector('.v')!).display !== 'none',
        horizontal: getComputedStyle(b.querySelector('.h')!).display !== 'none',
      })),
    )
    expect(down).toMatchObject({ vertical: true, horizontal: false })
    expect(up).toMatchObject({ vertical: true, horizontal: false })
    expect(down!.width).toBe(up!.width)
    expect(down!.width).toBeGreaterThan(220)
  })

  test('splitter: the panes stack at full width and the handle goes away', async ({ page }) => {
    await open(page, 'splitter')
    const host = page.locator('#preview sub-splitter')
    await expect(host.getByRole('separator')).toBeHidden()
    const start = await box(host, '#start')
    const end = await box(host, '#end')
    expect(end.top).toBeGreaterThanOrEqual(start.bottom)
    expect(end.width).toBe(start.width)
  })

  test('upload: no "drag and drop" on a touch screen; the button spans the zone', async ({ page }) => {
    await open(page, 'upload')
    const host = page.locator('#preview sub-upload')
    await expect(host.getByText('or drag and drop them here')).toBeHidden()
    const pick = await box(host, '.pick')
    const zone = await box(host, '.zone')
    expect(pick.width).toBeGreaterThan(zone.width * 0.8)
  })
})

/** Every popup open on the page (top-layer popovers, open dialogs, tooltips), deep in shadow roots */
const openPanels = (page: Page) =>
  page.evaluate(() => {
    const out: Array<{ el: string; inView: boolean }> = []
    const walk = (root: ParentNode) => {
      for (const el of root.querySelectorAll('*')) {
        if (el.matches(':popover-open, dialog[open], [role=tooltip]') && !el.closest('#nav-menu')) {
          const r = el.getBoundingClientRect()
          if (r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== 'hidden')
            out.push({ el: `${el.localName}${el.className ? '.' + String(el.className) : ''} in ${(el.getRootNode() as ShadowRoot).host?.localName ?? 'page'}`, inView: r.left >= -1 && r.top >= -1 && r.right <= innerWidth + 1 && r.bottom <= innerHeight + 1 })
        }
        if (el.shadowRoot) walk(el.shadowRoot)
      }
    }
    walk(document)
    return out
  })

const deepTap = async (page: Page, host: string, inner: string) => {
  const at = await page.locator(host).first().evaluate((el, inner) => {
    const t = el.shadowRoot!.querySelector(inner) as HTMLElement
    t.scrollIntoView({ block: 'center' })
    const r = t.getBoundingClientRect()
    return { x: r.x + r.width / 2, y: r.y + r.height / 2 }
  }, inner)
  await page.touchscreen.tap(at.x, at.y)
}

/** How to open each overlay on its demo page */
const OVERLAYS: Array<[string, (page: Page) => Promise<unknown>]> = [
  ['popover', (p) => p.getByRole('button', { name: 'Shipping details' }).tap()],
  ['popconfirm', (p) => p.getByRole('button', { name: 'Delete row' }).tap()],
  ['dropdown', (p) => p.locator('#preview').getByRole('button', { name: 'Account' }).first().tap()],
  ['menu', (p) => p.getByRole('button', { name: 'More actions' }).tap()],
  ['date-picker', (p) => deepTap(p, '#preview sub-date-picker', 'button.open')],
  ['autocomplete', async (p) => { await p.getByRole('combobox', { name: /City/ }).first().tap(); await p.keyboard.type('ma') }],
  ['mentions', async (p) => { await p.getByRole('textbox', { name: /Comment/ }).tap(); await p.keyboard.type('Hi @') }],
  ['drawer', (p) => p.getByRole('button', { name: 'Open filters' }).tap()],
  ['tour', (p) => p.getByRole('button', { name: 'Start the tour' }).tap()],
  ['tooltip', (p) => p.getByRole('button', { name: 'Export report' }).tap()],
  ['select', (p) => p.getByRole('combobox', { name: /^Country/ }).tap()],
  ['tree-select', (p) => p.locator('#preview sub-tree-select').first().getByRole('combobox').first().tap()],
  ['cascader', (p) => p.locator('#preview sub-cascader').getByRole('combobox').first().tap()],
  ['modal', (p) => p.locator('#preview sub-modal').first().getByRole('button').first().tap()],
  ['dialog', (p) => p.locator('#preview sub-button').first().tap()],
  ['confirm-dialog', (p) => p.locator('#preview sub-button').first().tap()],
]

test.describe('every overlay on a phone', () => {
  test.use(PHONE)
  test.skip(({ browserName }) => browserName !== 'chromium', 'phone emulation (isMobile) is Chromium only')
  for (const [id, openIt] of OVERLAYS) {
    test(`${id}: what opens stays inside the screen`, async ({ page }) => {
      await open(page, id)
      await openIt(page)
      await expect.poll(async () => (await openPanels(page)).length, { message: 'something opened' }).toBeGreaterThan(0)
      await expect.poll(async () => (await openPanels(page)).filter((p) => !p.inView).map((p) => p.el)).toEqual([])
    })
  }
})

test.describe('on a desktop', () => {
  test('the same components keep their desktop form: anchored menu and calendar, side-by-side panes, numbered slides', async ({ page }) => {
    await open(page, 'menu')
    const menuHost = page.locator('#preview sub-menu').first()
    await menuHost.getByRole('button', { name: 'More actions' }).click()
    const items = await box(menuHost, '.items')
    expect(items.width).toBeLessThan(400)

    await open(page, 'splitter')
    await expect(page.locator('#preview sub-splitter').getByRole('separator')).toBeVisible()

    await open(page, 'carousel')
    await expect(page.locator('#preview sub-carousel').getByRole('button', { name: '2 of 3', exact: true })).toBeVisible()

    // the layout answers to its OWN width (40rem): give the example a wide screen
    await page.setViewportSize({ width: 1920, height: 1000 })
    await open(page, 'shell')
    await expect(page.locator('#preview sub-layout').getByRole('button', { name: 'Menu', exact: true })).toBeHidden()
    await expect(page.locator('#preview sub-layout').getByRole('link', { name: 'Reports' })).toBeVisible()
  })

  test('a popup that fits neither above nor below stays on screen (short window)', async ({ page }) => {
    await page.setViewportSize({ width: 900, height: 380 })
    await open(page, 'date-picker')
    const picker = page.locator('#preview sub-date-picker').first()
    await picker.getByRole('button', { name: 'Choose date' }).click()
    const pop = await box(picker, '.pop')
    expect(pop.top).toBeGreaterThanOrEqual(0)
    expect(pop.bottom).toBeLessThanOrEqual(380)
  })
})
