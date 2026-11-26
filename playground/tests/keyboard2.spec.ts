import { expect, test, type Page } from '@playwright/test'
import { open } from './helpers'

const status = (page: Page) => page.locator('#result')
const deepActive = (page: Page) =>
  page.evaluate(() => {
    let a = document.activeElement as HTMLElement | null
    while (a?.shadowRoot?.activeElement) a = a.shadowRoot.activeElement as HTMLElement
    return { tag: a?.localName ?? '', day: a?.getAttribute('data-day') ?? '', id: a?.getAttribute('data-id') ?? '', role: a?.getAttribute('role') ?? '' }
  })

test('checkbox: Enter toggles like Space and does not submit the form', async ({ page }) => {
  await open(page, 'checkbox')
  const terms = page.getByRole('checkbox', { name: /I accept the terms/ })
  await terms.focus()
  await page.keyboard.press('Enter')
  await expect(terms).toBeChecked()
  await page.keyboard.press('Space')
  await expect(terms).not.toBeChecked()
  // inside a form, Enter must not submit
  await open(page, 'form')
  const box = page.getByRole('checkbox', { name: 'I accept the terms' })
  await box.focus()
  await page.keyboard.press('Enter')
  await expect(box).toBeChecked()
  await expect(status(page)).toHaveText('No action yet.')
})

test('tree: one tab stop, arrows expand/collapse/move, Enter selects, type-ahead', async ({ page }) => {
  await open(page, 'tree')
  const item = (id: string) => page.locator(`sub-tree [role=treeitem][data-id="${id}"]`)
  await item('src').focus()
  await page.keyboard.press('ArrowRight') // already open: into the first child
  expect((await deepActive(page)).id).toBe('comp')
  await page.keyboard.press('ArrowRight') // expand components
  await expect(item('comp')).toHaveAttribute('aria-expanded', 'true')
  await page.keyboard.press('ArrowDown')
  expect((await deepActive(page)).id).toBe('btn')
  await page.keyboard.press('Enter')
  await expect(status(page)).toHaveText('Selected: button.ts')
  await page.keyboard.press('ArrowLeft') // leaf: go to parent
  expect((await deepActive(page)).id).toBe('comp')
  await page.keyboard.press('ArrowLeft') // collapse
  await expect(item('comp')).toHaveAttribute('aria-expanded', 'false')
  await page.keyboard.press('End')
  expect((await deepActive(page)).id).toBe('pkg')
  await page.keyboard.press('d') // type-ahead
  expect((await deepActive(page)).id).toBe('docs')
  // roving: exactly one item is in the tab order
  expect(await page.locator('sub-tree [role=treeitem][tabindex="0"]').count()).toBe(1)
})

test('calendar: date-grid keys (arrows, PageUp/PageDown, Home/End, Enter)', async ({ page }) => {
  await open(page, 'calendar')
  const day = (iso: string) => page.locator(`sub-calendar button[data-day="${iso}"]`)
  await day('2026-11-26').focus()
  await page.keyboard.press('ArrowRight')
  expect((await deepActive(page)).day).toBe('2026-11-27')
  await page.keyboard.press('ArrowDown')
  expect((await deepActive(page)).day).toBe('2026-12-04')
  await page.keyboard.press('PageUp')
  expect((await deepActive(page)).day).toBe('2026-11-04')
  await page.keyboard.press('Home') // Monday-first week: 2 Nov
  expect((await deepActive(page)).day).toBe('2026-11-02')
  await page.keyboard.press('Enter')
  await expect(status(page)).toHaveText('Picked 2026-11-02.')
  await expect(day('2026-11-02').locator('xpath=..')).toHaveAttribute('aria-selected', 'true')
})

test('date picker: Alt+Down opens the calendar, Enter picks, Esc returns to the field', async ({ page }) => {
  await open(page, 'date-picker')
  const field = page.getByRole('textbox', { name: /End date/ })
  await field.focus()
  await page.keyboard.press('Alt+ArrowDown')
  await expect(page.getByRole('dialog', { name: 'Choose date' }).last()).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(field).toBeFocused()
  await field.fill('2027-01-05') // after max (2026-12-31)
  await field.blur()
  await expect(page.getByText(/End date must be/)).toBeVisible()
})

test('splitter: arrows, Shift, Home/End and Enter to collapse', async ({ page }) => {
  await open(page, 'splitter')
  const sep = page.getByRole('separator')
  await sep.focus()
  await expect(sep).toHaveAttribute('aria-valuenow', '40')
  await page.keyboard.press('ArrowRight')
  await expect(sep).toHaveAttribute('aria-valuenow', '41')
  await page.keyboard.press('Shift+ArrowRight')
  await expect(sep).toHaveAttribute('aria-valuenow', '51')
  await page.keyboard.press('Home')
  await expect(sep).toHaveAttribute('aria-valuenow', '10')
  await page.keyboard.press('Enter')
  await expect(sep).toHaveAttribute('aria-valuenow', '0')
  await page.keyboard.press('Enter')
  await expect(sep).toHaveAttribute('aria-valuenow', '10')
})

test('popconfirm: focus starts on Cancel, Esc cancels and returns to the trigger, confirm is deliberate', async ({ page }) => {
  await open(page, 'popconfirm')
  const trigger = page.getByRole('button', { name: 'Delete row', exact: true }).first()
  await trigger.focus()
  await page.keyboard.press('Enter')
  await expect(page.getByRole('dialog', { name: 'Confirm deletion' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Cancel' })).toBeFocused()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog', { name: 'Confirm deletion' })).toBeHidden()
  await expect(trigger).toBeFocused()
  await page.keyboard.press('Enter')
  await page.keyboard.press('Tab')
  await page.keyboard.press('Enter')
  await expect(status(page)).toHaveText('Row deleted.')
})

test('popover: opens with Enter, exposes aria-expanded on the real button, Esc closes', async ({ page }) => {
  await open(page, 'popover')
  const trigger = page.getByRole('button', { name: 'Shipping details' })
  await expect(trigger).toHaveAttribute('aria-expanded', 'false')
  await trigger.focus()
  await page.keyboard.press('Enter')
  await expect(trigger).toHaveAttribute('aria-expanded', 'true')
  await expect(page.getByRole('dialog', { name: 'Shipping details' })).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog', { name: 'Shipping details' })).toBeHidden()
  await expect(trigger).toBeFocused()
})

test('carousel: real controls, one visible slide, autoplay can be paused', async ({ page }) => {
  await open(page, 'carousel')
  await expect(page.locator('sub-carousel > div:not([hidden])')).toHaveCount(1)
  await page.getByRole('button', { name: 'Next slide' }).focus()
  await page.keyboard.press('Enter')
  await expect(page.getByRole('button', { name: '2 of 3' })).toHaveAttribute('aria-current', 'true')
  await expect(page.getByRole('group', { name: '2 of 3' })).toBeVisible()
  const pause = page.getByRole('button', { name: 'Pause' })
  await pause.click()
  // the label carries the state (no aria-pressed on top of a changing name)
  await expect(page.getByRole('button', { name: 'Play' })).toBeVisible()
  const before = await page.getByRole('button', { name: /of 3/ }).evaluateAll((els) => els.findIndex((e) => e.getAttribute('aria-current') === 'true'))
  await page.waitForTimeout(500)
  const after = await page.getByRole('button', { name: /of 3/ }).evaluateAll((els) => els.findIndex((e) => e.getAttribute('aria-current') === 'true'))
  expect(after).toBe(before)
})

test('nav menu: groups are disclosure buttons; the current page is aria-current', async ({ page }) => {
  await open(page, 'nav-menu')
  await expect(page.getByRole('link', { name: 'Dashboard' })).toHaveAttribute('aria-current', 'page')
  const group = page.getByRole('button', { name: 'Reports' })
  await group.focus()
  await expect(group).toHaveAttribute('aria-expanded', 'false')
  await page.keyboard.press('Enter')
  await expect(group).toHaveAttribute('aria-expanded', 'true')
  await expect(page.getByRole('link', { name: 'Sales' })).toBeVisible()
})

test('rate: arrows choose, a labelled button clears', async ({ page }) => {
  await open(page, 'rate')
  const four = page.getByRole('radio', { name: '4 of 5 stars' }).first()
  await page.getByRole('radio', { name: '3 of 5 stars' }).first().focus()
  await page.keyboard.press('ArrowRight')
  await expect(four).toBeChecked()
  await page.getByRole('button', { name: 'Clear rating' }).click()
  await expect(four).not.toBeChecked()
  await expect(page.getByRole('img', { name: /Average rating/ })).toBeVisible()
})

test('input number, slider and segmented: native keyboard semantics', async ({ page }) => {
  await open(page, 'input-number')
  const qty = page.getByRole('spinbutton', { name: 'Quantity' })
  await qty.focus()
  await page.keyboard.press('ArrowUp')
  await expect(qty).toHaveValue('3')
  await page.getByRole('button', { name: 'Increase Quantity' }).click()
  await expect(qty).toHaveValue('4')
  await qty.fill('10')
  await expect(page.getByRole('button', { name: 'Increase Quantity' })).toBeDisabled()

  await open(page, 'slider')
  const vol = page.getByRole('slider', { name: 'Volume' })
  await vol.focus()
  await page.keyboard.press('ArrowRight')
  await expect(vol).toHaveValue('41')
  await page.keyboard.press('End')
  await expect(vol).toHaveValue('100')
  await expect(page.locator('sub-slider output').first()).toHaveText('100%')

  await open(page, 'segmented')
  await page.getByRole('radio', { name: 'Week' }).focus()
  await page.keyboard.press('ArrowRight')
  await expect(page.getByRole('radio', { name: 'Month' })).toBeChecked()
  await expect(status(page)).toHaveText('View: month')
})

test('upload: files are listed with named remove buttons, problems are written down', async ({ page }) => {
  await open(page, 'upload')
  const input = page.locator('sub-upload input[type=file]')
  await input.setInputFiles([
    { name: 'invoice.pdf', mimeType: 'application/pdf', buffer: Buffer.from('x') },
    { name: 'notes.txt', mimeType: 'text/plain', buffer: Buffer.from('y') },
    { name: 'huge.png', mimeType: 'image/png', buffer: Buffer.alloc(3 * 1048576) },
  ])
  await expect(page.getByText('invoice.pdf')).toBeVisible()
  // the same text is also sent to the global live region, so scope to the component
  const problems = page.locator('sub-upload').getByRole('alert')
  await expect(problems).toContainText('notes.txt is not an accepted type')
  await expect(problems).toContainText('huge.png is larger than 2 MB')
  await page.getByRole('button', { name: 'Remove file: invoice.pdf' }).focus()
  await page.keyboard.press('Enter')
  await expect(page.getByText('invoice.pdf', { exact: true })).toBeHidden()
})

test('color picker: the hex value is typeable, presets are named toggles', async ({ page }) => {
  await open(page, 'color-picker')
  const hex = page.getByRole('textbox', { name: 'Hex value' })
  await hex.fill('#00703c')
  await expect(page.getByRole('button', { name: 'Green' })).toHaveAttribute('aria-pressed', 'true')
  await page.getByRole('button', { name: 'Red' }).click()
  await expect(hex).toHaveValue('#d4351c')
})

test('transfer: tick, move with a real button, the move is announced', async ({ page }) => {
  await open(page, 'transfer')
  await page.getByRole('checkbox', { name: 'Ana Ruiz' }).check()
  await page.getByRole('button', { name: 'Move selected to On the project' }).click()
  await expect(status(page)).toHaveText('On the project: mei, ana')
  await expect(page.locator('[data-sub-announcer="polite"]')).toContainText('1 moved to On the project: Ana Ruiz')
})

test('table: sortable headers, select all, scroll region is keyboard focusable', async ({ page }) => {
  await open(page, 'table')
  await expect(page.getByRole('region', { name: 'Projects' })).toHaveAttribute('tabindex', '0')
  await page.getByRole('button', { name: 'Project' }).focus()
  await page.keyboard.press('Enter')
  await expect(page.getByRole('columnheader', { name: /Project/ })).toHaveAttribute('aria-sort', 'ascending')
  await page.keyboard.press('Enter')
  await expect(page.getByRole('columnheader', { name: /Project/ })).toHaveAttribute('aria-sort', 'descending')
  await page.getByRole('checkbox', { name: 'Select all rows' }).first().check()
  await expect(status(page)).toHaveText('4 row(s) selected.')
  await expect(page.getByRole('checkbox', { name: 'Select Atlas' })).toBeChecked()
})

test('anchor: following a link moves focus to the heading (not just the scroll)', async ({ page }) => {
  await open(page, 'anchor')
  await page.getByRole('link', { name: 'API' }).focus()
  await page.keyboard.press('Enter')
  await expect(page.getByRole('heading', { name: 'API' })).toBeFocused()
  await expect(page.getByRole('link', { name: 'API' })).toHaveAttribute('aria-current', 'location')
})

test('dialog-like extras: drawer and statistic trend words', async ({ page }) => {
  await open(page, 'drawer')
  await page.getByRole('button', { name: 'Open filters' }).click()
  await expect(page.getByRole('dialog', { name: 'Filters' })).toBeVisible()
  await expect(page.getByRole('textbox', { name: /Keyword/ })).toBeFocused()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('button', { name: 'Open filters' })).toBeFocused()
  await open(page, 'statistic')
  await expect(page.getByText('Up: 12% vs last month')).toBeAttached()
})
