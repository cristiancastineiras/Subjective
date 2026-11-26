import { expect, test, type Page } from '@playwright/test'
import { open } from './helpers'

const status = (page: Page) => page.locator('#result')
const isFocused = (loc: ReturnType<Page['locator']>) =>
  loc.evaluate((el) => {
    let a: Element | null = document.activeElement
    while (a?.shadowRoot?.activeElement) a = a.shadowRoot.activeElement
    return a === el
  })

test.describe('mentions', () => {
  test('@ opens the list, Down + Enter insert the mention and keep typing', async ({ page }) => {
    await open(page, 'mentions')
    const box = page.getByRole('textbox', { name: /^Comment/ })
    await box.click()
    await page.keyboard.type('Thanks @lu')
    await expect(page.getByRole('option')).toHaveCount(1) // Luis Gil
    await expect(box).not.toHaveAttribute('aria-activedescendant', /./) // nothing is auto-selected
    await page.keyboard.press('Enter') // nothing highlighted: a normal new line, the list stays out of the way
    await page.keyboard.type('x')
    await box.fill('Thanks @lu')
    await page.keyboard.press('ArrowDown')
    await expect(page.getByRole('option', { name: /Luis Gil/ })).toHaveAttribute('aria-selected', 'true')
    await page.keyboard.press('Enter')
    await expect(box).toHaveValue('Thanks @luis ')
    await expect(status(page)).toHaveText('Mentioned @luis.')
    await page.keyboard.type('and @')
    await expect(page.getByRole('option')).toHaveCount(5) // everyone again
  })

  test('Esc closes the list and keeps the text; an e-mail address is not a mention', async ({ page }) => {
    await open(page, 'mentions')
    const box = page.getByRole('textbox', { name: /^Comment/ })
    await box.click()
    await page.keyboard.type('ping @an')
    await expect(page.getByRole('option')).toHaveCount(1)
    await page.keyboard.press('Escape')
    await expect(page.getByRole('option')).toHaveCount(0)
    await expect(box).toHaveValue('ping @an')
    await box.fill('')
    await page.keyboard.type('write to me@an')
    await expect(page.getByRole('option')).toHaveCount(0)
  })

  test('two triggers: # offers topics, a mouse click inserts, the list is a top-layer panel next to the caret', async ({ page }) => {
    await open(page, 'mentions')
    const note = page.getByRole('textbox', { name: /^Note with tags/ })
    await note.click()
    await page.keyboard.type('see #rel')
    const option = page.getByRole('option', { name: /Release/ })
    await expect(option).toBeVisible()
    expect(await option.evaluate((el) => el.closest('.panel')!.matches(':popover-open'))).toBe(true)
    await option.click()
    await expect(note).toHaveValue('see #release ')
    expect(await isFocused(note)).toBe(true)
  })
})

test.describe('tree select', () => {
  test('keyboard: Down opens, Right opens a branch, Down enters, Enter chooses a leaf', async ({ page }) => {
    await open(page, 'tree-select')
    const city = page.getByRole('combobox', { name: /^City/ })
    await city.click()
    const search = page.getByRole('combobox', { name: 'Search City' })
    await expect.poll(() => isFocused(search)).toBe(true)
    await page.keyboard.type('lyon')
    await expect(page.getByRole('treeitem')).toHaveCount(3) // Europe > France > Lyon (the parents of a match stay)
    await page.keyboard.press('Enter')
    await expect(city).toContainText('Lyon')
    await expect(city).toHaveAttribute('aria-expanded', 'false')
    expect(await isFocused(city)).toBe(true)
    await expect(status(page)).toHaveText('City: lyo')
  })

  test('without a search box the arrows walk the tree and leaf-only parents just open', async ({ page }) => {
    await open(page, 'tree-select')
    await page.evaluate(() => {
      const el = document.querySelector('#single') as HTMLElement & { searchable: boolean }
      el.searchable = false
    })
    const city = page.getByRole('combobox', { name: /^City/ })
    await city.focus()
    await page.keyboard.press('ArrowDown')
    await expect(page.getByRole('tree')).toBeVisible()
    await expect(page.getByRole('treeitem', { name: /Europe/ })).toHaveAttribute('aria-expanded', 'false')
    await page.keyboard.press('Enter') // leaf-only: Europe only opens
    await expect(page.getByRole('treeitem', { name: /Europe/ })).toHaveAttribute('aria-expanded', 'true')
    await expect(city).toHaveAttribute('aria-expanded', 'true')
    await page.keyboard.press('ArrowRight') // into the first child
    await expect(page.getByRole('treeitem', { name: /Spain/ })).toHaveAttribute('aria-level', '2')
    await page.keyboard.press('ArrowRight')
    await page.keyboard.press('ArrowRight') // Spain is open: enter Madrid
    await page.keyboard.press('Enter')
    await expect(city).toContainText('Madrid')
    // the tree opens on the chosen city next time
    await page.keyboard.press('ArrowDown')
    await expect(page.getByRole('treeitem', { name: /Madrid/ })).toHaveAttribute('aria-selected', 'true')
    await page.keyboard.press('ArrowLeft') // to the parent
    await page.keyboard.press('ArrowLeft') // closes Spain
    await expect(page.getByRole('treeitem', { name: /Spain/ })).toHaveAttribute('aria-expanded', 'false')
    await page.keyboard.press('Escape')
    await expect(city).toHaveAttribute('aria-expanded', 'false')
  })

  test('multiple: any node can be chosen, tags show them, FormData has one entry each', async ({ page }) => {
    await open(page, 'tree-select')
    const places = page.getByRole('combobox', { name: /^Places/ })
    await places.click()
    await expect(page.getByRole('treeitem', { name: /Spain/ })).toBeVisible() // expand-all
    await page.getByRole('treeitem', { name: /^Spain/ }).click()
    await page.getByRole('treeitem', { name: /Tokyo/ }).click()
    await expect(page.getByRole('treeitem', { name: /Tokyo/ })).toHaveAttribute('aria-selected', 'true')
    await page.keyboard.press('Escape')
    await expect(page.locator('sub-tree-select#multi .tag')).toHaveCount(2)
    const entries = await page.evaluate(() => {
      const el = document.querySelector('#multi')!
      const form = document.createElement('form')
      el.replaceWith(form)
      form.append(el)
      return new FormData(form).getAll('places')
    })
    expect(entries).toEqual(['es', 'tyo'])
    await page.getByRole('button', { name: 'Remove Spain' }).click()
    await expect(page.locator('sub-tree-select#multi .tag')).toHaveCount(1)
  })

  test('on a phone the tree opens as a full-screen sheet', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 780 })
    await open(page, 'tree-select')
    await page.getByRole('combobox', { name: /^Places/ }).click()
    const panel = page.locator('sub-tree-select#multi .panel')
    await expect.poll(async () => (await panel.boundingBox())?.width).toBe(390)
    await expect.poll(async () => (await panel.boundingBox())?.height).toBe(780)
    await page.getByRole('button', { name: 'Done' }).click()
    await expect(page.getByRole('combobox', { name: /^Places/ })).toHaveAttribute('aria-expanded', 'false')
  })
})

test.describe('tour', () => {
  test('starts from a button, moves focus to the step, Next/Previous work, Finish returns focus', async ({ page }) => {
    await open(page, 'tour')
    const start = page.getByRole('button', { name: 'Start the tour' })
    await start.focus()
    await page.keyboard.press('Enter')
    const step = page.getByRole('dialog', { name: 'Find anything' })
    await expect(step).toBeVisible()
    await expect(step).toHaveAccessibleDescription(/Step 1 of 4.*Type a project name/)
    await expect.poll(() => isFocused(step)).toBe(true)
    await expect(page.getByRole('button', { name: 'Previous' })).toHaveCount(0) // first step
    await page.getByRole('button', { name: 'Next' }).click()
    await expect(page.getByRole('dialog', { name: 'Create a project' })).toBeVisible()
    await page.getByRole('button', { name: 'Previous' }).click()
    await expect(page.getByRole('dialog', { name: 'Find anything' })).toBeVisible()
    await page.getByRole('button', { name: 'Next' }).click()
    await page.getByRole('button', { name: 'Next' }).click()
    await page.getByRole('button', { name: 'Next' }).click() // the last step has no target: centred
    const last = page.getByRole('dialog', { name: 'You are ready' })
    await expect(last).toBeVisible()
    await page.getByRole('button', { name: 'Finish' }).click()
    await expect(last).toBeHidden()
    await expect(status(page)).toHaveText('Tour closed (finish).')
    await expect(start).toBeFocused()
  })

  test('the target is outlined next to the step; Esc ends the tour and restores focus', async ({ page }) => {
    await open(page, 'tour')
    await page.getByRole('button', { name: 'Start the tour' }).click()
    await page.getByRole('button', { name: 'Next' }).click() // "New project"
    const near = await page.evaluate(() => {
      const tour = document.querySelector('sub-tour')!.shadowRoot!
      const spot = tour.querySelector('.spot')!.getBoundingClientRect()
      const card = tour.querySelector('.card')!.getBoundingClientRect()
      const target = document.querySelector('#tour-new')!.getBoundingClientRect()
      return { aligned: Math.abs(spot.left - target.left) < 14, below: card.top >= spot.bottom - 1 || card.bottom <= spot.top + 1 }
    })
    expect(near).toEqual({ aligned: true, below: true })
    await page.keyboard.press('Escape')
    await expect(page.getByRole('dialog', { name: 'Create a project' })).toBeHidden()
    await expect(status(page)).toHaveText('Tour closed (escape).')
    await expect(page.getByRole('button', { name: 'Start the tour' })).toBeFocused()
  })

  test('on a phone the step docks to the bottom edge', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 780 })
    await open(page, 'tour')
    await page.getByRole('button', { name: 'Start the tour' }).click()
    const step = page.getByRole('dialog', { name: 'Find anything' })
    await expect(step).toBeVisible()
    await expect.poll(async () => {
      const box = await step.boundingBox()
      return box ? Math.round(box.y + box.height) : 0
    }).toBeGreaterThan(740)
  })
})

test.describe('remembered choices (dark theme, compact density)', () => {
  test('both survive a page change and a reload', async ({ page }) => {
    await open(page, 'button')
    await page.getByRole('checkbox', { name: 'Dark theme' }).check()
    await page.getByRole('checkbox', { name: 'Compact density' }).check()
    await open(page, 'input')
    await expect(page.getByRole('checkbox', { name: 'Dark theme' })).toBeChecked()
    await expect(page.getByRole('checkbox', { name: 'Compact density' })).toBeChecked()
    await expect(page.locator('html')).toHaveAttribute('data-sub-theme', 'dark')
    await expect(page.locator('#preview')).toHaveAttribute('data-sub-density', 'compact')
    await page.reload()
    await page.locator('html[data-ready]').waitFor({ state: 'attached' })
    await expect(page.getByRole('checkbox', { name: 'Dark theme' })).toBeChecked()
    await page.getByRole('checkbox', { name: 'Dark theme' }).uncheck()
    await open(page, 'studio')
    await expect(page.getByRole('checkbox', { name: 'Dark theme' })).not.toBeChecked()
    await expect(page.getByRole('checkbox', { name: 'Compact density' })).toBeChecked()
  })

  test('the dark theme is painted before the page script runs (no flash)', async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('sub-playground-prefs', JSON.stringify({ dark: true })))
    await page.goto('/?c=button', { waitUntil: 'commit' })
    await expect.poll(() => page.evaluate(() => document.documentElement.dataset.subTheme)).toBe('dark')
  })

  test('another tab changing the choice is followed', async ({ page, context }) => {
    await open(page, 'button')
    const other = await context.newPage()
    await other.goto('/?c=input')
    await other.locator('html[data-ready]').waitFor({ state: 'attached' })
    await other.getByRole('checkbox', { name: 'Dark theme' }).check()
    await expect(page.getByRole('checkbox', { name: 'Dark theme' })).toBeChecked()
    await expect(page.locator('html')).toHaveAttribute('data-sub-theme', 'dark')
  })

  test('blocked storage does not break the page', async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(window, 'localStorage', { get: () => { throw new Error('blocked') } })
    })
    await open(page, 'button')
    await page.getByRole('checkbox', { name: 'Dark theme' }).check()
    await expect(page.locator('html')).toHaveAttribute('data-sub-theme', 'dark')
  })
})
