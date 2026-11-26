import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'
import { open } from './helpers'
import { mockApis } from './mocks'

// The Studio's sample app ("Dev Desk") talks to public APIs; the tests answer them with fixed data (mocks.ts).

/** Go to a section of the app; on a phone its navigation is behind the layout's Menu button first */
const nav = async (page: Page, name: string) => {
  const menu = page.locator('#studio-app').getByRole('button', { name: 'Menu', exact: true })
  if ((await menu.isVisible()) && (await menu.getAttribute('aria-expanded')) !== 'true') await menu.click()
  await page.getByRole('link', { name, exact: true }).click()
}
const title = (page: Page, name: string | RegExp) => page.getByRole('heading', { level: 3, name })
const toast = (page: Page, text: string | RegExp) => page.getByRole('status').filter({ hasText: text })

test.describe('overview: live data from the APIs', () => {
  test('weather, npm downloads, version and GitHub stars arrive and are shown with words, not colour', async ({ page }) => {
    await open(page, 'studio')
    await expect(page.getByRole('heading', { name: 'Weather in Madrid' })).toBeVisible()
    await expect(page.locator('.app-temp')).toHaveText('22°C')
    await expect(page.getByText('Partly cloudy, feels like 20°C')).toBeVisible()
    await expect(page.getByText('8,820')).toBeVisible() // 7 days of downloads
    await expect(page.getByText('5.9% vs the week before')).toBeVisible()
    await expect(page.getByText('v3.3.3').first()).toBeVisible()
    await expect(page.getByText('19,500')).toBeVisible()
    await expect(page.getByText('BSD-3-Clause').first()).toBeVisible()
    // 30 days of 1000 + 10 * day (mocks.ts): 34,350 in total
    await expect(page.getByRole('img', { name: /Downloads of lit, last 30 days: from .* 34,350 downloads in total/ })).toBeVisible()
    await expect(page.getByRole('figure', { name: 'Downloads of lit, last 30 days' })).toBeVisible()
    // the exact numbers are one click away, as a real table
    await page.getByText('Show the numbers').click()
    await expect(page.getByRole('table', { name: 'Downloads of lit, last 30 days' })).toBeVisible()
  })

  test('a failing service shows an error with a way out; Try again recovers', async ({ page }) => {
    const api = await mockApis(page, { fail: ['forecast'] })
    await open(page, 'studio')
    await expect(page.getByRole('heading', { name: 'Weather is unavailable' })).toBeVisible()
    await expect(page.getByText('did not answer').or(page.getByText('returned an error (503)'))).toBeVisible()
    api.fail.delete('forecast')
    await page.getByRole('button', { name: 'Try again' }).click()
    await expect(page.locator('.app-temp')).toHaveText('22°C')
    await expect(page.getByRole('heading', { name: 'Weather is unavailable' })).toHaveCount(0)
  })

  test('refresh asks the APIs again', async ({ page }) => {
    await open(page, 'studio')
    await expect(page.locator('.app-temp')).toBeVisible()
    let calls = 0
    page.on('request', (r) => r.url().includes('api.open-meteo.com') && calls++)
    await page.getByRole('button', { name: 'Refresh the data' }).click()
    await expect(toast(page, 'Refreshing')).toBeVisible()
    await expect.poll(() => calls).toBeGreaterThan(0)
  })

  test('team notes: @ mentions a teammate, the note is saved and listed', async ({ page }) => {
    await open(page, 'studio')
    const note = page.getByRole('textbox', { name: /Leave a note/ })
    await note.click()
    await page.keyboard.type('@lu')
    await page.keyboard.press('ArrowDown')
    await page.keyboard.press('Enter')
    await page.keyboard.type('please review the release')
    await page.getByRole('button', { name: 'Save note' }).click()
    await expect(toast(page, 'Note saved')).toBeVisible()
    await expect(page.getByRole('listitem').filter({ hasText: '@luis please review the release' })).toBeVisible()
  })
})

test.describe('navigation, search and watchlist', () => {
  test('switching sections moves focus to the new title (and the nav says where you are)', async ({ page }) => {
    await open(page, 'studio')
    await nav(page, 'Packages')
    // (the app is narrow inside the Studio: its navigation folds again behind Menu once a section is chosen)
    await expect(page.locator('#app-nav').getByRole('link', { name: 'Packages', exact: true, includeHidden: true }).first()).toHaveAttribute('aria-current', 'page')
    await expect(title(page, 'Packages')).toBeFocused()
    await nav(page, 'Watchlist')
    await expect(title(page, 'Watchlist')).toBeFocused()
  })

  test('search the registry, compare two packages, open one', async ({ page }) => {
    await open(page, 'studio')
    await nav(page, 'Packages')
    await expect(page.getByRole('heading', { name: 'Search for a package' })).toBeVisible()
    await page.getByRole('searchbox', { name: 'Search the npm registry' }).fill('lit')
    await page.getByRole('button', { name: 'Search', exact: true }).click()
    await expect(page.getByRole('table', { name: '4 packages for "lit"' })).toBeVisible()
    const compare = page.getByRole('button', { name: /Compare/ })
    await expect(compare).toHaveAttribute('aria-disabled', 'true') // soft-disabled: still focusable, says why
    await page.getByRole('checkbox', { name: 'Select lit', exact: true }).check()
    await page.getByRole('checkbox', { name: 'Select lit-html' }).check()
    await expect(page.getByRole('button', { name: 'Compare 2 selected' })).not.toHaveAttribute('aria-disabled', 'true')
    await page.getByRole('button', { name: 'Compare 2 selected' }).click()
    await expect(page.getByRole('heading', { name: 'Weekly downloads compared' })).toBeVisible()
    await expect(page.getByRole('progressbar')).toHaveCount(2)
    await page.getByRole('button', { name: 'Open lit-element' }).click()
    await expect(page.getByRole('heading', { name: 'lit-element', level: 4 })).toBeVisible()
    await expect(title(page, /^(Good|Hi)/)).toBeFocused()
  })

  test('no results is said in words and echoes the query', async ({ page }) => {
    await open(page, 'studio')
    await nav(page, 'Packages')
    await page.getByRole('searchbox', { name: 'Search the npm registry' }).fill('nothing here')
    await page.getByRole('button', { name: 'Search', exact: true }).click()
    await expect(page.getByRole('heading', { name: 'No packages for "nothing here"' })).toBeVisible()
  })

  test('the header search suggests packages as you type and opens the chosen one', async ({ page }) => {
    await open(page, 'studio')
    const box = page.getByRole('combobox', { name: 'Find an npm package' })
    await box.click()
    await page.keyboard.type('lit')
    await expect(page.getByRole('option')).toHaveCount(4)
    await page.getByRole('option', { name: /^lit-html/ }).click()
    await expect(page.getByRole('heading', { name: 'lit-html', level: 4 })).toBeVisible()
  })

  test('watch a package with Undo, then find it in the watchlist; empty states say what to do', async ({ page }) => {
    await open(page, 'studio')
    const watch = page.getByRole('button', { name: 'Watch', exact: true })
    await expect(watch).toHaveAttribute('aria-pressed', 'true') // lit is watched by default
    await watch.click()
    await expect(toast(page, 'Removed lit from your watchlist')).toBeVisible()
    await page.getByRole('button', { name: 'Undo' }).click()
    await expect(page.getByRole('button', { name: 'Watch', exact: true })).toHaveAttribute('aria-pressed', 'true')
    await nav(page, 'Watchlist')
    await expect(page.getByRole('heading', { name: 'vite' })).toBeVisible()
    await expect(page.getByText('8,820').first()).toBeVisible()
    await page.getByRole('tab', { name: /Cities/ }).click()
    await expect(page.getByRole('heading', { name: 'No cities saved' })).toBeVisible()
  })

  test('weather: search a city, switch units, save it to the watchlist', async ({ page }) => {
    await open(page, 'studio')
    await nav(page, 'Weather')
    const city = page.getByRole('combobox', { name: /Search a city/ })
    await city.click()
    await page.keyboard.type('tok')
    await page.getByRole('option', { name: /Tokyo/ }).click()
    await expect(page.getByRole('heading', { name: 'Weather in Tokyo' })).toBeVisible()
    await page.getByRole('radio', { name: '°F, mph' }).check()
    await expect(page.locator('.app-temp')).toHaveText('71°F')
    await expect(page.getByRole('table', { name: '7-day forecast' })).toBeVisible()
    await page.getByRole('button', { name: 'Save city' }).click()
    await expect(toast(page, 'Saved Tokyo')).toBeVisible()
    await nav(page, 'Watchlist')
    await page.getByRole('tab', { name: /Cities \(1\)/ }).click()
    await expect(page.getByRole('heading', { name: 'Tokyo' })).toBeVisible()
  })
})

test.describe('settings and saved data', () => {
  test('required fields are enforced, saved choices survive a reload', async ({ page }) => {
    await open(page, 'studio')
    await nav(page, 'Settings')
    const name = page.getByRole('textbox', { name: /Your name/ })
    await name.fill('')
    await page.getByRole('button', { name: 'Save changes' }).click()
    await expect(name).toHaveAttribute('aria-invalid', 'true')
    await expect(name).toBeFocused()
    await name.fill('Mei Chen')
    await page.getByRole('button', { name: 'Save changes' }).click()
    await expect(toast(page, 'Settings saved')).toBeVisible()
    await nav(page, 'Overview')
    await expect(title(page, /, Mei$/)).toBeVisible()
    await page.reload()
    await page.locator('html[data-studio-ready]').waitFor({ state: 'attached' })
    await expect(title(page, /, Mei$/)).toBeVisible()
  })

  test('an unknown package gives a clear error, not a blank card', async ({ page }) => {
    await open(page, 'studio')
    await nav(page, 'Settings')
    await page.getByRole('textbox', { name: /Default npm package/ }).fill('missing-package')
    await page.getByRole('button', { name: 'Save changes' }).click()
    await nav(page, 'Overview')
    await expect(page.getByRole('heading', { name: 'Could not load missing-package' })).toBeVisible()
    await expect(page.getByText('has nothing under that name').first()).toBeVisible()
  })

  test('clearing saved data asks first (focus on Cancel), Esc keeps everything, confirming resets', async ({ page }) => {
    await open(page, 'studio')
    await nav(page, 'Settings')
    await page.getByRole('textbox', { name: /Your name/ }).fill('Zoe Park')
    await page.getByRole('button', { name: 'Save changes' }).click()
    await page.getByRole('button', { name: 'Clear saved data' }).click()
    const dialog = page.getByRole('alertdialog', { name: /Delete everything saved/ })
    await expect(dialog).toBeVisible()
    await expect(page.getByRole('button', { name: 'Cancel' })).toBeFocused()
    await page.keyboard.press('Escape')
    await expect(dialog).toBeHidden()
    await page.getByRole('button', { name: 'Clear saved data' }).click()
    await page.getByRole('button', { name: 'Delete saved data' }).click()
    await expect(toast(page, 'Saved data deleted')).toBeVisible()
    await expect(title(page, /, Ana$/)).toBeVisible()
  })
})

test('the tour walks through the real app and Esc ends it', async ({ page }) => {
  await open(page, 'studio')
  await page.getByRole('button', { name: 'Take the tour' }).click()
  await expect(page.getByRole('dialog', { name: 'Search the npm registry' })).toBeVisible()
  await page.getByRole('button', { name: 'Next' }).click()
  await expect(page.getByRole('dialog', { name: 'Move around' })).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog', { name: 'Move around' })).toBeHidden()
  await expect(page.getByRole('button', { name: 'Take the tour' })).toBeFocused()
})

for (const theme of ['light', 'dark'] as const) {
  test(`every section of the app has no axe violations once its data is loaded (${theme})`, async ({ page }) => {
    await open(page, 'studio', theme)
    const check = async (label: string) => {
      await expect(page.locator('sub-skeleton')).toHaveCount(0)
      const { violations } = await new AxeBuilder({ page }).include('#studio-app').withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice']).analyze()
      expect(violations.map((v) => `${label} ${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(' | ')}`)).toEqual([])
    }
    await check('overview')
    await nav(page, 'Packages')
    await page.getByRole('searchbox', { name: 'Search the npm registry' }).fill('lit')
    await page.getByRole('button', { name: 'Search', exact: true }).click()
    await page.getByRole('checkbox', { name: 'Select lit', exact: true }).check()
    await page.getByRole('checkbox', { name: 'Select lit-html' }).check()
    await page.getByRole('button', { name: 'Compare 2 selected' }).click()
    await expect(page.getByRole('progressbar')).toHaveCount(2)
    await check('packages')
    await nav(page, 'Weather')
    await check('weather')
    await nav(page, 'Watchlist')
    await check('watchlist')
    await nav(page, 'Settings')
    await check('settings')
  })
}

test('every section reflows at 320px without page-level scrolling and keeps its content inside the preview', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 740 })
  await open(page, 'studio')
  for (const section of ['Overview', 'Packages', 'Weather', 'Watchlist', 'Settings']) {
    await nav(page, section)
    await expect(page.locator('sub-skeleton')).toHaveCount(0)
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth), section).toBeLessThanOrEqual(0)
    // nothing of the app is clipped on the right by the preview frame
    const clipped = await page.evaluate(() => {
      const frame = document.querySelector('#studio-preview')!.getBoundingClientRect()
      const cards = [...document.querySelectorAll('#studio-app sub-card, #studio-app sub-table, #studio-app form')]
      return cards.filter((c) => c.getBoundingClientRect().right > frame.right + 1).map((c) => c.localName)
    })
    expect(clipped, section).toEqual([])
  }
})
