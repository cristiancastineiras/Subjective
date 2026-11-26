import { expect, test, type Locator } from '@playwright/test'
import { open } from './helpers'

// What the user SEES must follow the state, in every browser. Run in Firefox too: SUB_FIREFOX=1 pnpm test
// (Firefox did not restyle `:host(...) .option:has(input:checked)`, so the segmented strip kept showing the old choice.)

/** A computed style of each option, as painted */
const optionStyles = (host: Locator, prop: string) =>
  host.evaluate((el, prop) => [...el.shadowRoot!.querySelectorAll('.option')].map((o) => getComputedStyle(o).getPropertyValue(prop)), prop)

/** Indexes of the options painted like the `chosen` background */
const paintedAs = async (host: Locator, chosen: string) =>
  (await optionStyles(host, 'background-color')).flatMap((bg, i) => (bg === chosen ? [i] : []))

test('segmented: the highlighted segment follows a click and the arrow keys', async ({ page }) => {
  await open(page, 'segmented')
  const host = page.locator('#preview sub-segmented')
  const [, chosen, other] = await optionStyles(host, 'background-color') // Week is the initial value
  expect(chosen).not.toBe(other)

  await host.getByRole('radio', { name: 'Day' }).click()
  await expect(page.locator('#result')).toHaveText('View: day')
  await expect.poll(() => paintedAs(host, chosen!)).toEqual([0])

  await page.keyboard.press('ArrowRight')
  await expect(page.locator('#result')).toHaveText('View: week')
  await expect.poll(() => paintedAs(host, chosen!)).toEqual([1])
  // keyboard focus is drawn on the segment that has it
  await expect.poll(() => optionStyles(host, 'outline-style')).toEqual(['none', 'solid', 'none'])
})

test('radio cards: the chosen card is the highlighted one', async ({ page }) => {
  await open(page, 'radio-group')
  const host = page.locator('#preview sub-radio-group[variant="card"]')
  const [free, pro] = await optionStyles(host, 'background-color') // Pro is the initial value
  expect(free).not.toBe(pro)

  await host.getByRole('radio', { name: /Free/ }).click()
  await expect(host.getByRole('radio', { name: /Free/ })).toBeChecked()
  await expect.poll(() => paintedAs(host, pro!)).toEqual([0])
})
