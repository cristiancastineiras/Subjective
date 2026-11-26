import { expect, test, type Page } from '@playwright/test'
import { open } from './helpers'

const status = (page: Page) => page.locator('#result')
/** True when the real focused element (through shadow roots) is `locator`'s element */
const isFocused = (loc: ReturnType<Page['locator']>) =>
  loc.evaluate((el) => {
    let a: Element | null = document.activeElement
    while (a?.shadowRoot?.activeElement) a = a.shadowRoot.activeElement
    return a === el
  })

test.describe('select (our own, not the native one)', () => {
  test('single: opens with Down, moves, chooses with Enter, focus stays on the field', async ({ page }) => {
    await open(page, 'select')
    const country = page.getByRole('combobox', { name: /^Country/ })
    await country.focus()
    await page.keyboard.press('ArrowDown')
    await expect(country).toHaveAttribute('aria-expanded', 'true')
    await expect(page.getByRole('listbox', { name: 'Country' })).toBeVisible()
    await expect(country).toHaveAttribute('aria-activedescendant', /opt-/)
    await page.keyboard.press('ArrowDown')
    await page.keyboard.press('Enter')
    await expect(country).toContainText('France')
    await expect(country).toHaveAttribute('aria-expanded', 'false')
    expect(await isFocused(country)).toBe(true)
    await expect(status(page)).toHaveText('Country: fr')
  })

  test('a letter jumps to a match, Esc closes without changing, the disabled option is skipped', async ({ page }) => {
    await open(page, 'select')
    const country = page.getByRole('combobox', { name: /^Country/ })
    await country.focus()
    await page.keyboard.press('p') // opens on Portugal
    await expect(country).toHaveAttribute('aria-expanded', 'true')
    await page.keyboard.press('Enter')
    await expect(country).toContainText('Portugal')
    await page.keyboard.press('ArrowDown') // open on the selected option
    await page.keyboard.press('End') // last ENABLED option (United States is disabled)
    await page.keyboard.press('Escape')
    await expect(country).toHaveAttribute('aria-expanded', 'false')
    await expect(country).toContainText('Portugal')
    expect(await isFocused(country)).toBe(true)
    await page.keyboard.press('ArrowDown')
    await page.keyboard.press('End')
    await page.keyboard.press('Enter')
    await expect(country).toContainText('United Kingdom')
  })

  test('clicking an option works and a click outside closes the list', async ({ page }) => {
    await open(page, 'select')
    const country = page.getByRole('combobox', { name: /^Country/ })
    await country.click()
    await page.getByRole('option', { name: /Italy/ }).click()
    await expect(country).toContainText('Italy')
    await country.click()
    await expect(country).toHaveAttribute('aria-expanded', 'true')
    await page.getByRole('heading', { name: 'Select', level: 1 }).click()
    await expect(country).toHaveAttribute('aria-expanded', 'false')
    // clicking the field while it is open closes it (and does not reopen it)
    await country.click()
    await country.click()
    await expect(country).toHaveAttribute('aria-expanded', 'false')
  })

  test('multiple + searchable: filter, tick several, tags can be removed, FormData has one entry each', async ({ page }) => {
    await open(page, 'select')
    const skills = page.getByRole('combobox', { name: /^Skills/ })
    await expect(page.locator('sub-select#multi .tag')).toHaveCount(2) // a11y, css preset via value=
    await skills.click()
    const search = page.getByRole('combobox', { name: 'Search Skills' })
    await expect.poll(() => isFocused(search)).toBe(true)
    await page.keyboard.type('script')
    await expect(page.getByRole('option')).toHaveCount(1)
    await page.keyboard.press('Enter')
    await expect(skills).toHaveAttribute('aria-expanded', 'true') // stays open while ticking
    await expect(page.getByRole('option', { name: /TypeScript/ })).toHaveAttribute('aria-selected', 'true')
    await page.keyboard.press('Escape')
    await expect(skills).toHaveAttribute('aria-expanded', 'false')
    expect(await isFocused(skills)).toBe(true)
    await expect(page.locator('sub-select#multi .tag')).toHaveCount(3)
    const entries = await page.evaluate(() => {
      const el = document.querySelector('#multi')!
      const form = document.createElement('form')
      el.replaceWith(form)
      form.append(el)
      return new FormData(form).getAll('skills')
    })
    expect(entries).toEqual(['a11y', 'css', 'ts'])
  })

  test('multiple: tags have real remove buttons', async ({ page }) => {
    await open(page, 'select')
    const remove = page.getByRole('button', { name: 'Remove CSS' })
    await remove.focus()
    await page.keyboard.press('Enter')
    await expect(page.locator('sub-select#multi .tag')).toHaveCount(1)
    await expect(status(page)).toContainText('a11y')
  })

  test('searchable: filtering is accent-insensitive, empty result is said in words', async ({ page }) => {
    await open(page, 'select')
    await page.getByRole('combobox', { name: /^City/ }).click()
    await page.keyboard.type('zurich')
    await expect(page.getByRole('option')).toHaveText(/Zürich/)
    await page.keyboard.press('Control+a')
    await page.keyboard.type('xyz')
    await expect(page.getByRole('option')).toHaveCount(0)
    await expect(page.locator('sub-select#grouped').getByText('No results').first()).toBeVisible()
  })

  test('the panel is a top-layer popover that nothing can clip', async ({ page }) => {
    await open(page, 'select')
    await page.getByRole('combobox', { name: /^Country/ }).click()
    const open_ = await page.locator('sub-select#single .panel').evaluate((el) => el.matches(':popover-open'))
    expect(open_).toBe(true)
  })

  test('corner tiers: a pill control keeps a capped panel and capped options', async ({ page }) => {
    await open(page, 'select')
    await page.evaluate(() => document.documentElement.style.setProperty('--sub-control-radius', '9999px'))
    const country = page.getByRole('combobox', { name: /^Country/ })
    await country.click()
    const radius = (sel: string) => page.locator(sel).first().evaluate((el) => getComputedStyle(el).borderTopLeftRadius)
    expect(await radius('sub-select#single .trigger')).toBe('9999px')
    expect(await radius('sub-select#single .panel')).toBe('16px') // --sub-surface-radius-max
    expect(await radius('sub-select#single .option')).toBe('8px') // --sub-item-radius-max
  })
})

test.describe('autocomplete', () => {
  test('typing from the first letter opens a list; a click on a suggestion fills the field', async ({ page }) => {
    await open(page, 'autocomplete')
    const box = page.getByRole('combobox', { name: 'City' })
    await box.click()
    await page.keyboard.type('m')
    await expect(page.getByRole('option').first()).toBeVisible()
    await page.keyboard.type('a')
    await expect(page.getByRole('option')).toHaveCount(4)
    await page.getByRole('option', { name: 'Malaga' }).click()
    await expect(box).toHaveValue('Malaga')
    await expect(box).toHaveAttribute('aria-expanded', 'false')
    await expect(status(page)).toHaveText('Selected: Malaga.')
    expect(await isFocused(box)).toBe(true)
  })

  test('remote suggestions arrive later and are announced', async ({ page }) => {
    await open(page, 'autocomplete')
    const box = page.getByRole('combobox', { name: /npm package/ })
    await box.click()
    await page.keyboard.type('li')
    await expect(page.getByRole('option')).toHaveCount(4)
    await page.keyboard.press('ArrowDown')
    await page.keyboard.press('Enter')
    await expect(box).toHaveValue('lit')
  })

  test('inside a dialog the list is not clipped and Esc closes the list first, the dialog second', async ({ page }) => {
    await open(page, 'studio') // the Studio registers every component
    await page.evaluate(() => {
      const dialog = document.createElement('sub-dialog') as HTMLElement & { show(): void }
      dialog.setAttribute('heading', 'Where do you live?')
      dialog.innerHTML = '<sub-autocomplete label="Town" min-chars="1"><sub-option>Madrid</sub-option><sub-option>Malaga</sub-option></sub-autocomplete>'
      document.body.append(dialog)
      dialog.show()
    })
    const town = page.getByRole('combobox', { name: 'Town' })
    await town.click()
    await page.keyboard.type('ma')
    await expect(page.getByRole('option')).toHaveCount(2)
    const inside = await page.getByRole('option', { name: 'Madrid' }).evaluate((el) => el.closest('.panel')!.matches(':popover-open'))
    expect(inside).toBe(true) // top layer: no overflow ancestor can clip it
    await page.keyboard.press('Escape')
    await expect(page.getByRole('option')).toHaveCount(0)
    await expect(page.getByRole('dialog', { name: 'Where do you live?' })).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(page.getByRole('dialog', { name: 'Where do you live?' })).toBeHidden()
  })
})

test.describe('modal (opens from its own button)', () => {
  test('opens, focuses the first field, Esc closes and focus returns to the button', async ({ page }) => {
    await open(page, 'modal')
    const trigger = page.getByRole('button', { name: 'Edit profile' })
    await trigger.focus()
    await page.keyboard.press('Enter')
    const dialog = page.getByRole('dialog', { name: 'Edit profile' })
    await expect(dialog).toBeVisible()
    await expect(page.getByRole('textbox', { name: /Display name/ })).toBeFocused()
    await page.keyboard.press('Escape')
    await expect(dialog).toBeHidden()
    await expect(trigger).toBeFocused()
  })

  test('on a phone the modal covers the whole screen; the sheet variant docks to the bottom', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 780 })
    await open(page, 'modal')
    await page.getByRole('button', { name: 'Edit profile' }).click()
    const dialog = page.getByRole('dialog', { name: 'Edit profile' })
    await expect.poll(async () => (await dialog.boundingBox())?.width).toBe(390)
    await expect.poll(async () => (await dialog.boundingBox())?.height).toBe(780)
    await page.keyboard.press('Escape')
    await page.getByRole('button', { name: 'Open as a sheet' }).click()
    const sheet = page.getByRole('dialog', { name: 'Share this page' })
    await expect.poll(async () => (await sheet.boundingBox())?.width).toBe(390)
    await expect.poll(async () => {
      const box = await sheet.boundingBox()
      return box ? Math.round(box.y + box.height) : 0
    }).toBe(780)
    expect((await sheet.boundingBox())!.height).toBeLessThan(780)
  })

  test('on a desktop it stays a centred box', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 })
    await open(page, 'modal')
    await page.getByRole('button', { name: 'Edit profile' }).click()
    const dialog = page.getByRole('dialog', { name: 'Edit profile' })
    await expect.poll(async () => (await dialog.boundingBox())?.width).toBeLessThan(700)
  })

  test('the select inside a full-screen modal opens its own sheet above it', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 780 })
    await open(page, 'modal')
    await page.getByRole('button', { name: 'Edit profile' }).click()
    await page.getByRole('combobox', { name: /Language/ }).click()
    await expect(page.getByRole('option', { name: 'French' })).toBeVisible()
    await page.getByRole('option', { name: 'French' }).click()
    await expect(page.getByRole('combobox', { name: /Language/ })).toContainText('French')
    await expect(page.getByRole('dialog', { name: 'Edit profile' })).toBeVisible()
  })
})

test.describe('select on a phone', () => {
  test('the panel is a full-screen sheet with a Done button', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 780 })
    await open(page, 'select')
    await page.getByRole('combobox', { name: /^City/ }).click()
    const panel = page.locator('sub-select#grouped .panel')
    await expect.poll(async () => (await panel.boundingBox())?.width).toBe(390)
    await expect.poll(async () => (await panel.boundingBox())?.height).toBe(780)
    await page.getByRole('option', { name: 'Lyon' }).click()
    await expect(page.getByRole('combobox', { name: /^City/ })).toContainText('Lyon')
    await page.getByRole('combobox', { name: /^City/ }).click()
    await page.getByRole('button', { name: 'Done' }).click()
    await expect(page.getByRole('combobox', { name: /^City/ })).toHaveAttribute('aria-expanded', 'false')
  })
})

test.describe('table sub-rows', () => {
  test('disclosure buttons expose aria-expanded / aria-controls and hide the rows', async ({ page }) => {
    await open(page, 'table')
    const plan = page.locator('#plan')
    await expect(plan.getByRole('row')).toHaveCount(11) // header + 10, every parent starts open
    const toggle = plan.getByRole('button', { name: 'Sub-rows of Phase 2: Design' })
    await expect(toggle).toHaveAttribute('aria-expanded', 'true')
    await expect(toggle).toHaveAttribute('aria-controls', /r-p2a/)
    await toggle.focus()
    await page.keyboard.press('Enter')
    await expect(toggle).toHaveAttribute('aria-expanded', 'false')
    await expect(plan.getByRole('row')).toHaveCount(6) // 4 descendants of Phase 2 are hidden (and the third-level pair with them)
    await expect(status(page)).toContainText('p2 closed')
    await page.keyboard.press('Enter')
    await expect(plan.getByRole('row')).toHaveCount(11)
  })

  test('ticking a parent ticks its descendants; a partly ticked parent is "mixed"', async ({ page }) => {
    await open(page, 'table')
    const plan = page.locator('#plan')
    await plan.getByRole('checkbox', { name: 'Select Phase 1: Discovery' }).check()
    await expect(plan.getByRole('checkbox', { name: 'Select User interviews' })).toBeChecked()
    await plan.getByRole('checkbox', { name: 'Select User interviews' }).uncheck()
    const parent = plan.getByRole('checkbox', { name: 'Select Phase 1: Discovery' })
    await expect(parent).not.toBeChecked()
    expect(await parent.evaluate((el: HTMLInputElement) => el.indeterminate)).toBe(true)
  })

  test('sorting applies inside each level and rows say whose sub-row they are', async ({ page }) => {
    await open(page, 'table')
    const plan = page.locator('#plan')
    await plan.getByRole('button', { name: 'Hours' }).click()
    await expect(plan.locator('tbody tr:not([hidden])').first()).toContainText('Phase 3: Launch') // 24 < 60 < 120
    await expect(plan.getByRole('rowheader', { name: /User interviews\s*,\s*sub-row of Phase 1: Discovery/ })).toBeAttached()
  })
})

test('motion: data-sub-motion="off" turns every duration to zero (and the default animates)', async ({ page }) => {
  await open(page, 'dialog')
  const duration = () => page.locator('sub-dialog').evaluate((el) => getComputedStyle(el.shadowRoot!.querySelector('dialog')!).transitionDuration.split(',')[0])
  expect(await duration()).toBe('0.2s')
  await page.evaluate(() => document.documentElement.setAttribute('data-sub-motion', 'off'))
  expect(await duration()).toBe('0s')
})
