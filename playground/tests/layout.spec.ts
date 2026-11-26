import { expect, test } from '@playwright/test'
import { open } from './helpers'

const rect = (page: import('@playwright/test').Page, selector: string) =>
  page.locator(selector).first().evaluate((el) => {
    const r = el.getBoundingClientRect()
    return { left: r.left, right: r.right, width: r.width, height: r.height }
  })

test('segmented: the border hugs the last segment (no empty stretch of border)', async ({ page }) => {
  await open(page, 'segmented')
  const strip = await rect(page, 'sub-segmented .options')
  const last = await rect(page, 'sub-segmented .option:last-child')
  expect(strip.right - last.right).toBeLessThanOrEqual(3) // only the 2px border
  // and `block` stretches it with equal segments
  await page.locator('sub-segmented').first().evaluate((el) => el.toggleAttribute('block', true))
  const wide = await rect(page, 'sub-segmented .options')
  const host = await rect(page, 'sub-segmented')
  expect(wide.width).toBeGreaterThan(strip.width)
  expect(Math.abs(wide.width - host.width)).toBeLessThanOrEqual(1)
})

test('transfer fills the row: stacked in a narrow box, side by side in a wide one', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 })
  await open(page, 'transfer')
  const narrow = await rect(page, 'sub-transfer')
  expect(narrow.width).toBeGreaterThan(400)
  const list = await rect(page, 'sub-transfer fieldset.list')
  expect(list.width).toBeGreaterThan(narrow.width * 0.8) // stacked lists use the whole width

  await page.setViewportSize({ width: 1900, height: 900 })
  await page.locator('sub-transfer').evaluate((el) => ((el.parentElement as HTMLElement).style.inlineSize = '60rem'))
  const left = await rect(page, 'sub-transfer fieldset.list')
  const right = await page.locator('sub-transfer fieldset.list').nth(1).evaluate((el) => el.getBoundingClientRect().left)
  expect(right).toBeGreaterThan(left.right) // side by side
  expect(left.width).toBeGreaterThan(200)
})

test('density: compact shrinks every component (targets 32px), comfortable is the default (44px)', async ({ page }) => {
  await open(page, 'button')
  const height = () =>
    page.locator('#preview sub-button').first().evaluate((el) => getComputedStyle(el.shadowRoot!.querySelector('button')!).minHeight)
  expect(await height()).toBe('44px')
  await page.getByRole('checkbox', { name: 'Compact density' }).check()
  await expect.poll(height).toBe('32px')
  await page.getByRole('checkbox', { name: 'Compact density' }).uncheck()
  await expect.poll(height).toBe('44px')
})

test('density works on any element: <div density="compact"> only changes what is inside', async ({ page }) => {
  await open(page, 'button')
  const sizes = await page.evaluate(async () => {
    const host = document.querySelector('#preview')!
    host.insertAdjacentHTML('beforeend', '<div density="compact"><sub-button id="tight">Tight</sub-button></div><sub-button id="roomy">Roomy</sub-button>')
    await Promise.all(['tight', 'roomy'].map((id) => (document.getElementById(id) as HTMLElement & { updateComplete: Promise<unknown> }).updateComplete))
    const h = (id: string) => getComputedStyle(document.getElementById(id)!.shadowRoot!.querySelector('button')!).minHeight
    return { tight: h('tight'), roomy: h('roomy') }
  })
  expect(sizes).toEqual({ tight: '32px', roomy: '44px' })
})

test('density: the theme SDK carries it (shape.density) and <sub-app density> applies it', async ({ page }) => {
  await open(page, 'studio')
  const sizes = await page.evaluate(async () => {
    const sdk = (window as unknown as { subTheme: typeof import('@sub/core/theme') }).subTheme
    const scope = document.createElement('div')
    scope.innerHTML = '<sub-button>Hi</sub-button>'
    document.body.append(scope)
    await (scope.querySelector('sub-button') as HTMLElement & { updateComplete: Promise<unknown> }).updateComplete
    const handle = sdk.applyTheme({ ...sdk.generateTheme({ primary: '#0e7490', density: 'compact' }) }, scope)
    const inner = () => getComputedStyle(scope.querySelector('sub-button')!.shadowRoot!.querySelector('button')!).minHeight
    const out = { themed: inner() }
    handle.clear()
    scope.remove()
    return out
  })
  expect(sizes.themed).toBe('32px')
})
