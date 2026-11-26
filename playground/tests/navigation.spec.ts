import { expect, test, type Page } from '@playwright/test'
import { open } from './helpers'

// Moving between pages of the playground swaps the content in place (src/router.ts): no reload,
// the sidebar stays put, Back/Forward and focus behave like real page loads.

const sidebar = (page: Page) => page.getByRole('navigation', { name: 'Components' })
const navLink = (page: Page, name: string) => sidebar(page).getByRole('link', { name, exact: true })
const h1 = (page: Page) => page.getByRole('heading', { level: 1 })

/** Something only the same document still has after a "navigation" */
const markDocument = (page: Page) => page.evaluate(() => ((window as unknown as { marker: number }).marker = 42))
const sameDocument = (page: Page) => page.evaluate(() => (window as unknown as { marker?: number }).marker === 42)

test('moving between pages does not reload the document', async ({ page }) => {
  await open(page, 'button')
  await markDocument(page)
  await navLink(page, 'Input').click()
  await expect(page).toHaveURL(/\?c=input$/)
  await expect(h1(page)).toHaveText('Input')
  await expect(page).toHaveTitle('Input | SUB Playground')
  await expect(page.locator('#preview sub-input').first()).toBeVisible()
  expect(await sameDocument(page)).toBe(true)
})

test('focus lands on the new heading, the page is announced and the sidebar marks it', async ({ page }) => {
  await open(page, 'button')
  await navLink(page, 'Tabs').focus()
  await page.keyboard.press('Enter')
  await expect(h1(page)).toHaveText('Tabs')
  await expect(h1(page)).toBeFocused()
  await expect(page.locator('[data-sub-announcer="polite"]')).toHaveText('Navigated to Tabs | SUB Playground')
  await expect(navLink(page, 'Tabs')).toHaveAttribute('aria-current', 'page')
  await expect(navLink(page, 'Button')).not.toHaveAttribute('aria-current', /.*/)
  // what the breadcrumb trail SHOWS (its shadow DOM), not just the children the page wrote
  const trail = page.getByRole('navigation', { name: 'Breadcrumb' })
  await expect(trail.locator('[aria-current="page"]')).toHaveText('Tabs')
  await expect(trail.getByRole('link', { name: 'Components' })).toBeVisible()
})

test('Back and Forward work and each page keeps its scroll position', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 600 })
  await open(page, 'components')
  await markDocument(page)
  await page.evaluate(() => window.scrollTo(0, 900))
  // a real click event without the test runner scrolling the card into view first
  await page.locator('#overview').getByRole('link', { name: 'Tabs', exact: true }).dispatchEvent('click')
  await expect(h1(page)).toHaveText('Tabs')
  expect(await page.evaluate(() => scrollY)).toBe(0)

  await page.goBack()
  await expect(h1(page)).toHaveText('Components')
  await expect.poll(() => page.evaluate(() => Math.round(scrollY))).toBe(900)

  await page.goForward()
  await expect(h1(page)).toHaveText('Tabs')
  await expect(page).toHaveURL(/\?c=tabs$/)
  expect(await sameDocument(page)).toBe(true)
})

test('links rendered inside a component (shadow DOM) navigate in place too', async ({ page }) => {
  await open(page, 'button')
  await markDocument(page)
  await page.getByRole('link', { name: 'Go to link docs' }).click()
  await expect(h1(page)).toHaveText('Link')
  expect(await sameDocument(page)).toBe(true)
})

test('Ctrl/Cmd+click still opens a new tab, and the page stays where it is', async ({ page, context }) => {
  await open(page, 'button')
  const opened = context.waitForEvent('page')
  await navLink(page, 'Input').click({ modifiers: [process.platform === 'darwin' ? 'Meta' : 'Control'] })
  const tab = await opened
  await tab.waitForLoadState()
  expect(tab.url()).toMatch(/\?c=input$/)
  await expect(page).toHaveURL(/\?c=button$/)
  await expect(h1(page)).toHaveText('Button')
})

test('every page starts clean: the previous example, its overrides and its listeners are gone', async ({ page }) => {
  await open(page, 'button')
  await page.locator('#a11y[data-score]').waitFor()
  await page.getByRole('button', { name: 'Save changes' }).click()
  await expect(page.locator('#result')).toHaveText('Save changes activated (1).')
  await page.evaluate(() => {
    const preview = document.getElementById('preview')!
    preview.style.setProperty('--sub-button-min-size', '1rem')
    ;(window as unknown as { oldPreview: HTMLElement }).oldPreview = preview
  })

  await navLink(page, 'Tabs').click()
  await expect(h1(page)).toHaveText('Tabs')
  expect(await page.evaluate(() => (window as unknown as { oldPreview: HTMLElement }).oldPreview.isConnected)).toBe(false)
  await expect(page.locator('#preview')).not.toHaveAttribute('style', /.+/)
  await expect(page.locator('#result')).toHaveText('No action yet.')
  // the audit describes the new example, not the old one
  await page.locator('#a11y[data-score]').waitFor()
  await expect(page.locator('#a11y')).toContainText('sub-tabs')
  await expect(page.locator('#a11y')).not.toContainText('sub-button')

  await page.goBack()
  await expect(h1(page)).toHaveText('Button')
  await page.getByRole('button', { name: 'Save changes' }).click()
  await expect(page.locator('#result')).toHaveText('Save changes activated (1).')
})

test('the compact density follows you to the next page', async ({ page }) => {
  await open(page, 'button')
  await page.getByRole('checkbox', { name: 'Compact density' }).check()
  await navLink(page, 'Input').click()
  await expect(h1(page)).toHaveText('Input')
  await expect(page.locator('#preview')).toHaveAttribute('data-sub-density', 'compact')
})

test('only the page you open is downloaded; pointing at a link starts loading it', async ({ page }) => {
  const scripts: string[] = []
  page.on('request', (r) => r.resourceType() === 'script' && scripts.push(new URL(r.url()).pathname))
  await open(page, 'components')
  await page.waitForLoadState('networkidle')
  const tabsChunk = (list: string[]) => list.some((p) => /\/tabs-[\w-]+\.js$/.test(p))
  expect(tabsChunk(scripts)).toBe(false) // the overview needs no component code
  expect(scripts.length).toBeLessThan(15)

  await page.locator('#overview').getByRole('link', { name: 'Tabs', exact: true }).hover()
  await expect.poll(() => tabsChunk(scripts)).toBe(true)
})

test('Ctrl/Cmd+K finds a component; Enter opens the first match', async ({ page }) => {
  await open(page, 'button')
  await page.keyboard.press('ControlOrMeta+k')
  const find = page.getByRole('searchbox', { name: 'Find a component' })
  await expect(find).toBeFocused()

  const said = page.locator('[data-sub-announcer="polite"]')
  await find.fill('zzz')
  await expect(page.getByText('No component matches. Try another word.')).toBeVisible()
  await expect(said).toHaveText('No component matches "zzz".')

  await find.fill('PICK') // date picker, time picker, color picker: matches inside the name, ignoring case
  await expect(navLink(page, 'Date picker')).toBeVisible()
  await expect(navLink(page, 'Button')).toBeHidden()
  await expect(said).toHaveText(/^\d+ components match\.$/)
  await page.keyboard.press('Enter')
  await expect(h1(page)).toHaveText('Color picker')

  await find.focus()
  await page.keyboard.press('Escape')
  await expect(find).toHaveValue('')
  await expect(navLink(page, 'Button')).toBeVisible()
})

test('the example code is one click away, can be copied and changes with the page', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  await open(page, 'button')
  const code = page.getByRole('region', { name: 'Example code' })
  await expect(code).toBeHidden()
  await page.getByText('Code', { exact: true }).click()
  await expect(code).toContainText('<sub-button variant="danger">Delete project</sub-button>')
  await page.getByRole('button', { name: 'Copy code' }).click()
  await expect(page.getByRole('button', { name: 'Copied' })).toBeVisible()
  expect(await page.evaluate(() => navigator.clipboard.readText())).toContain('<sub-button>Save changes</sub-button>')

  await navLink(page, 'Tabs').click()
  await expect(h1(page)).toHaveText('Tabs')
  await expect(code).toBeHidden() // closed again on the new page
  await page.getByText('Code', { exact: true }).click()
  await expect(code).toContainText('<sub-tabs')
})

test('Previous and Next follow the sidebar order', async ({ page }) => {
  await open(page, 'button')
  const order = await sidebar(page).locator('section:not([data-start]) a').evaluateAll((links) => links.map((a) => a.textContent))
  const at = order.indexOf('Button')
  const pager = page.getByRole('navigation', { name: 'Previous and next component' })
  await pager.getByRole('link', { name: new RegExp(`^Next ${order[at + 1]}$`) }).click()
  await expect(h1(page)).toHaveText(order[at + 1]!)
  await pager.getByRole('link', { name: /^Previous / }).click()
  await expect(h1(page)).toHaveText('Button')
})

test('an unknown page says so and offers the list', async ({ page }) => {
  await open(page, 'not-a-component')
  await expect(h1(page)).toHaveText('Components')
  await expect(page.getByText('There is no component called "not-a-component". Pick one below.')).toBeVisible()
  await navLink(page, 'All components').click()
  await expect(page.getByText(/There is no component called/)).toBeHidden()
})

test('the page change crossfades, unless the user asked for reduced motion', async ({ page }) => {
  await page.addInitScript(() => {
    const w = window as unknown as { transitions: number }
    w.transitions = 0
    const original = document.startViewTransition?.bind(document)
    if (original) document.startViewTransition = ((cb: () => void) => (w.transitions++, original(cb))) as typeof document.startViewTransition
  })
  await open(page, 'button')
  await navLink(page, 'Input').click()
  await expect(h1(page)).toHaveText('Input')
  expect(await page.evaluate(() => (window as unknown as { transitions: number }).transitions)).toBe(1)

  await page.emulateMedia({ reducedMotion: 'reduce' })
  await navLink(page, 'Tabs').click()
  await expect(h1(page)).toHaveText('Tabs')
  expect(await page.evaluate(() => (window as unknown as { transitions: number }).transitions)).toBe(1)
})

test('quick successive clicks: the last one wins', async ({ page }) => {
  await open(page, 'button')
  await navLink(page, 'Tabs').click()
  await navLink(page, 'Input').click()
  await expect(h1(page)).toHaveText('Input')
  await expect(page).toHaveURL(/\?c=input$/)
  await page.waitForTimeout(300)
  await expect(h1(page)).toHaveText('Input')
})

test('the Studio keeps its state when you come back to it', async ({ page }) => {
  await open(page, 'studio')
  await page.locator('#ed-presets').getByRole('button', { name: 'Forest' }).click()
  await navLink(page, 'Button').click()
  await expect(h1(page)).toHaveText('Button')
  await page.goBack()
  await expect(h1(page)).toHaveText('Studio')
  await expect(page.locator('#ed-json')).toContainText('"name": "Forest"')
})

test('a component removed while it is open stops listening to the page (menu)', async ({ page }) => {
  await page.addInitScript(() => {
    const live = new Set<unknown>()
    const add = EventTarget.prototype.addEventListener
    const remove = EventTarget.prototype.removeEventListener
    Document.prototype.addEventListener = function (this: Document, type: string, fn: EventListenerOrEventListenerObject | null, options?: boolean | AddEventListenerOptions) {
      if (type === 'pointerdown') live.add(fn)
      return add.call(this, type, fn, options)
    }
    Document.prototype.removeEventListener = function (this: Document, type: string, fn: EventListenerOrEventListenerObject | null, options?: boolean | EventListenerOptions) {
      if (type === 'pointerdown') live.delete(fn)
      return remove.call(this, type, fn, options)
    }
    ;(window as unknown as { pointerdownListeners: () => number }).pointerdownListeners = () => live.size
  })
  await open(page, 'menu')
  const count = () => page.evaluate(() => (window as unknown as { pointerdownListeners: () => number }).pointerdownListeners())
  const before = await count()
  await page.getByRole('button', { name: 'More actions' }).click()
  await expect(page.getByRole('menuitem', { name: 'Duplicate' })).toBeFocused()
  expect(await count()).toBe(before + 1)
  // leave without closing it (Alt+Left, a script, a route change...)
  await page.evaluate(() => (window as unknown as { playground: { navigate(u: string): Promise<void> } }).playground.navigate('?c=button'))
  await expect(h1(page)).toHaveText('Button')
  expect(await count()).toBe(before)
})
