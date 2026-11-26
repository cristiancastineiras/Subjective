import { expect, test, type Page } from '@playwright/test'
import { open } from './helpers'

/** [label, value] of every row as rendered: the value is what the row's slot actually shows */
const descPairs = (page: Page) =>
  page.locator('sub-descriptions').first().evaluate((el) =>
    [...el.shadowRoot!.querySelectorAll('.row')].map((row) => [
      row.querySelector('dt')!.textContent!.trim(),
      row.querySelector('dd slot')!.assignedNodes().map((n) => n.textContent).join('').trim(),
    ]),
  )

// Robustness of the components themselves: author content is shown in place (never copied),
// one bad value cannot take a whole component down.

test.describe('author content is projected, not copied', () => {
  test('descriptions: a value is the author\'s own node (exists once, keeps its listeners, updates live)', async ({ page }) => {
    await open(page, 'descriptions')
    await expect(page.getByText('Ana Ruiz', { exact: true })).toHaveCount(1)
    await expect(page.getByText('Ana Ruiz', { exact: true })).toBeVisible()
    expect(await descPairs(page)).toEqual([['Customer', 'Ana Ruiz'], ['Status', 'Shipped'], ['Delivery', '3-5 days, track parcel'], ['Total', '48.20 EUR']])
    // the link in a value is the author's link: it works and is reachable
    await expect(page.getByRole('link', { name: 'track parcel' })).toBeVisible()

    await page.evaluate(() => {
      const desc = document.querySelector('sub-desc[label="Status"]')!
      const button = Object.assign(document.createElement('button'), { type: 'button', textContent: 'Refund' })
      button.addEventListener('click', () => (document.getElementById('result')!.textContent = 'Refund clicked'))
      desc.append(' ', button)
    })
    await page.getByRole('button', { name: 'Refund' }).click()
    await expect(page.locator('#result')).toHaveText('Refund clicked')

    await page.evaluate(() => (document.querySelector('sub-desc[label="Customer"]')!.textContent = 'Luis Gil'))
    await expect.poll(async () => (await descPairs(page))[0]).toEqual(['Customer', 'Luis Gil'])
    await expect(page.getByText('Luis Gil', { exact: true })).toBeVisible()
  })

  test('descriptions: rows follow added and removed pairs, labels stay paired with their values', async ({ page }) => {
    await open(page, 'descriptions')
    await page.evaluate(() => {
      const list = document.querySelector('sub-descriptions')!
      list.querySelector('sub-desc[label="Status"]')!.remove()
      list.insertAdjacentHTML('afterbegin', '<sub-desc label="Order">1042</sub-desc>')
    })
    await expect
      .poll(() => descPairs(page))
      .toEqual([['Order', '1042'], ['Customer', 'Ana Ruiz'], ['Delivery', '3-5 days, track parcel'], ['Total', '48.20 EUR']])
  })

  test('timeline: item content is shown in place, once, inside its own entry', async ({ page }) => {
    await open(page, 'timeline')
    const text = page.getByText('With the carrier.', { exact: true })
    await expect(text).toHaveCount(1)
    await expect(text).toBeVisible()
    // the entry that shows it is the third one, "In transit"
    const entry = await text.evaluate((el) => {
      const li = el.assignedSlot?.closest('li')
      return li ? { index: [...li.parentElement!.children].indexOf(li), title: li.querySelector('.title')!.textContent!.trim() } : null
    })
    expect(entry).toEqual({ index: 2, title: 'In transit (In progress)' })
  })
})

test('children added or removed directly under a component re-render it (tabs)', async ({ page }) => {
  await open(page, 'tabs')
  const host = page.locator('#preview sub-tabs').first()
  const tabs = host.getByRole('tab')
  const before = await tabs.count()
  await host.evaluate((el) => el.insertAdjacentHTML('beforeend', '<sub-tab-panel label="Extra">More content</sub-tab-panel>'))
  await expect(tabs).toHaveCount(before + 1)
  await host.getByRole('tab', { name: 'Extra' }).click()
  await expect(page.getByText('More content')).toBeVisible()
  await host.evaluate((el) => el.querySelector(':scope > sub-tab-panel[label="Extra"]')!.remove())
  await expect(tabs).toHaveCount(before)
})

test('table: a column whose render() throws shows the raw value instead of blanking the table', async ({ page }) => {
  const warnings: string[] = []
  page.on('console', (m) => m.type() === 'warning' && warnings.push(m.text()))
  await open(page, 'table')
  await page.locator('#preview sub-table').first().evaluate((el) => {
    const table = el as HTMLElement & { columns: unknown[]; rows: unknown[] }
    table.columns = [
      { key: 'name', label: 'Name' },
      { key: 'day', label: 'Day', render: () => { throw new RangeError('Invalid time value') } },
    ]
    table.rows = [{ id: 'a', name: 'Alpha', day: '2026-11-31' }, { id: 'b', name: 'Beta', day: '2026-12-01' }]
  })
  const table = page.locator('#preview sub-table').first()
  await expect(table.getByRole('rowheader', { name: 'Alpha' })).toBeVisible()
  await expect(table.getByRole('cell', { name: '2026-12-01' })).toBeVisible()
  expect(warnings.some((w) => w.includes('column "day": render() threw (Invalid time value)'))).toBe(true)
})

test('card: wide content (a table) scrolls inside the card at 320px instead of pushing it wider', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 740 })
  // the table page registers <sub-table>; moving to the card page in place keeps it registered
  await open(page, 'table')
  await page.evaluate(() => (window as unknown as { playground: { navigate(u: string): Promise<void> } }).playground.navigate('?c=card'))
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Card')
  const overflow = await page.evaluate(async () => {
    const card = document.querySelector('#preview sub-card')!
    const table = document.createElement('sub-table') as HTMLElement & { columns: unknown[]; rows: unknown[]; updateComplete: Promise<unknown> }
    table.setAttribute('caption', 'Wide')
    table.columns = 'abcdefgh'.split('').map((k) => ({ key: k, label: `Column ${k.toUpperCase()} with a long label` }))
    table.rows = [Object.fromEntries([['id', '1'], ...'abcdefgh'.split('').map((k) => [k, 'Some long cell text'])])]
    card.append(table)
    await table.updateComplete
    return Math.round(table.getBoundingClientRect().right - card.getBoundingClientRect().right)
  })
  expect(overflow).toBeLessThanOrEqual(0)
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0)
})

test('breadcrumbs: no "3+ levels" warning while the trail is still empty, one when it really is short', async ({ page }) => {
  const warnings: string[] = []
  page.on('console', (m) => m.type() === 'warning' && warnings.push(m.text()))
  await open(page, 'breadcrumbs')
  await page.evaluate(async () => {
    const crumbs = document.createElement('sub-breadcrumbs')
    document.getElementById('preview')!.append(crumbs)
    await (crumbs as HTMLElement & { updateComplete: Promise<unknown> }).updateComplete
    // a router fills it a moment later
    crumbs.innerHTML = '<a href="/">Home</a><a href="/a">A</a><span>B</span>'
    await new Promise((r) => setTimeout(r, 50))
  })
  expect(warnings.filter((w) => w.includes('3+ levels'))).toEqual([])

  await page.evaluate(async () => {
    const short = document.createElement('sub-breadcrumbs')
    short.innerHTML = '<a href="/">Home</a><span>Here</span>'
    document.getElementById('preview')!.append(short)
    await (short as HTMLElement & { updateComplete: Promise<unknown> }).updateComplete
  })
  expect(warnings.filter((w) => w.includes('3+ levels'))).toHaveLength(1)
})
