import { expect, test } from '@playwright/test'
import { open } from './helpers'

test('activates with keyboard and pointer, and skips the disabled button', async ({ page }) => {
  await open(page, 'button')

  const primary = page.getByRole('button', { name: 'Save changes' })
  const secondary = page.getByRole('button', { name: 'Cancel' })
  const disabled = page.getByRole('button', { name: 'Unavailable' })
  const status = page.getByRole('status')

  await expect(disabled).toBeDisabled()
  await primary.focus()
  await expect(primary).toBeFocused()
  await expect(primary).toHaveCSS('outline-style', 'solid')
  await page.keyboard.press('Space')
  await expect(status).toHaveText('Save changes activated (1).')
  await page.keyboard.press('Enter')
  await expect(status).toHaveText('Save changes activated (2).')
  await page.keyboard.press('Tab')
  await expect(secondary).toBeFocused()
  await disabled.click({ force: true })
  await expect(status).toHaveText('Save changes activated (2).')
  await secondary.click()
  await expect(status).toHaveText('Cancel activated (3).')
})

test('soft-disabled keeps focus, explains why, and does not activate', async ({ page }) => {
  await open(page, 'button')
  const soft = page.getByRole('button', { name: 'Export data' })
  await expect(soft).toHaveAttribute('aria-disabled', 'true')
  await expect(soft).toHaveAccessibleDescription('Available on the Pro plan')
  await soft.focus()
  await expect(soft).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(page.getByRole('status')).toHaveText('No action yet.')
})

test('loading blocks repeat clicks and is announced as busy', async ({ page }) => {
  await open(page, 'button')
  const loading = page.getByRole('button', { name: 'Saving...' })
  await expect(loading).toHaveAttribute('aria-busy', 'true')
  await loading.click()
  await expect(page.getByRole('status')).toHaveText('No action yet.')
})

test('inherits theme tokens across the shadow root at a narrow viewport', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 800 })
  await open(page, 'button')
  const primary = page.getByRole('button', { name: 'Save changes' })

  await page.mouse.move(319, 799)
  await expect(primary).toHaveCSS('background-color', 'rgb(29, 112, 184)')
  await expect(primary).toHaveCSS('min-height', '44px')
  await page.getByRole('checkbox', { name: 'Dark theme' }).check()
  await expect(primary).toHaveCSS('background-color', 'rgb(138, 180, 220)')
  await expect(page.locator('html')).toHaveJSProperty('scrollWidth', 320)
})
