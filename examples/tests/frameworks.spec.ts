import { expect, test, type Page } from '@playwright/test'

// One conformance suite, run against every framework example (playwright.config.ts: a project per framework).
// What each framework must get right with SUB: render every component, receive its events, bind values both
// ways, submit it in a native form, and route the links it draws without reloading the page.

const card = (page: Page, id: string) => page.locator(`[data-card="${id}"]`)
const log = (page: Page, id: string) => page.locator(`[data-log="${id}"]`)

test.beforeEach(async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
  await page.goto('/')
  // every card rendered (and at least one: "0 / 0" is a page that did not start)
  await expect(page.locator('.top [data-status]'), `page errors: ${errors.join(' | ')}`).toHaveText(/^\s*([1-9]\d*) \/ \1 components rendered/, { timeout: 20_000 })
})

test('every component is registered and rendered by the framework', async ({ page }) => {
  const status = page.locator('.top [data-status]')
  const [, ok, total] = (await status.textContent())!.match(/(\d+) \/ (\d+)/)!
  expect(Number(total)).toBeGreaterThanOrEqual(80)
  expect(ok).toBe(total)
  // a property only JavaScript can set (rows of a table) arrived
  expect(await card(page, 'table').getByRole('row').count()).toBeGreaterThan(2)
})

test('component events reach the framework, with their detail', async ({ page }) => {
  await card(page, 'carousel').getByRole('button', { name: 'Next slide' }).click()
  await expect(log(page, 'carousel')).toContainText('sub-slide {"index":1}')

  await card(page, 'rate').getByRole('radio').nth(1).check()
  await expect(log(page, 'rate')).toContainText('change')
})

test('two-way binding: typing updates the state, and the state updates the elements', async ({ page }) => {
  const binding = page.locator('[data-check="binding"]')
  const mirror = page.locator('[data-test="mirror"]')
  const name = binding.getByRole('textbox', { name: /Your name/ })

  await name.fill('Grace')
  await expect(mirror).toContainText('name=Grace')
  await binding.getByRole('switch', { name: /Email alerts/ }).click()
  await expect(mirror).toContainText('alerts=false')
  await binding.getByRole('combobox', { name: /Plan/ }).click()
  await binding.getByRole('option', { name: 'Free' }).click()
  await expect(mirror).toContainText('plan=free')

  await binding.getByRole('button', { name: 'Reset' }).click()
  await expect(mirror).toHaveText('name=Ada · alerts=true · plan=pro')
  await expect(name).toHaveValue('Ada')
  await expect(binding.getByRole('switch', { name: /Email alerts/ })).toBeChecked()
})

test('a native form submits the SUB controls (they are form-associated)', async ({ page }) => {
  await page.locator('[data-check="form"]').getByRole('button', { name: 'Send' }).click()
  await expect(page.locator('[data-test="form-result"]')).toHaveText(/^email=ada@example\.com, size=m, news=/)
})

test('links drawn by components go through the app router: no page reload', async ({ page }) => {
  await page.evaluate(() => ((window as unknown as { marker: number }).marker = 1))
  const router = page.locator('[data-check="router"]')
  const route = page.locator('[data-test="route"]')

  // <sub-button href>: offered to configure({ navigate })
  await router.getByRole('link', { name: 'Settings' }).click()
  await expect(route).toHaveText('Route: /settings')
  // a plain author link that a component copies (breadcrumbs): offered to the router
  await router.getByRole('link', { name: 'Docs' }).click()
  await expect(route).toHaveText('Route: /docs')
  // an author link with its own framework click handler (nav menu): the handler runs
  await router.getByRole('link', { name: 'Profile' }).click()
  await expect(route).toHaveText('Route: /profile (link handler)')

  expect(await page.evaluate(() => (window as unknown as { marker?: number }).marker)).toBe(1)
})
