import { expect, test, type Page } from '@playwright/test'
import { open } from './helpers'

const presets = (page: Page) => page.locator('#ed-presets')

/** Computed style of the real <button> inside the first <sub-button> of the app */
const buttonStyle = (page: Page, prop: string) =>
  page.evaluate((p) => {
    const el = document.querySelector('#studio-app sub-button')!.shadowRoot!.querySelector('button')!
    return getComputedStyle(el).getPropertyValue(p)
  }, prop)

test('a preset re-themes the WHOLE app: colour, shape (derived component tokens) and the exports', async ({ page }) => {
  await open(page, 'studio')
  expect(await buttonStyle(page, 'border-radius')).toBe('0px')
  await presets(page).getByRole('button', { name: 'Violet' }).click()
  await expect(presets(page).getByRole('button', { name: 'Violet' })).toHaveAttribute('aria-pressed', 'true')
  await expect(presets(page).getByRole('button', { name: 'Raw (default)' })).toHaveAttribute('aria-pressed', 'false')
  // 0.75rem radius reaches <sub-button> although --sub-button-radius is declared at :root
  expect(await buttonStyle(page, 'border-radius')).toBe('12px')
  expect(await page.locator('#ed-json').textContent()).toContain('"name": "Violet"')
  expect(await page.locator('#ed-json').textContent()).toContain('"radius": "0.75rem"')
  // the playground around it did not change
  expect(await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--sub-control-radius').trim())).toBe('0px')
})

test('every preset meets WCAG AA and the editor says so; dark mode keeps it', async ({ page }) => {
  await open(page, 'studio')
  for (const name of ['Raw (default)', 'Ocean', 'Forest', 'Violet', 'Sunset', 'Rose', 'Mono']) {
    await presets(page).getByRole('button', { name }).click()
    await expect(page.getByText('Meets WCAG 2.2 AA')).toBeVisible()
  }
  await page.getByRole('radio', { name: 'Dark' }).check()
  await expect(page.locator('#studio-app')).toHaveAttribute('data-sub-theme', 'dark')
})

test('exports JSON, CSS and an install snippet; import round-trips and reports errors', async ({ page }) => {
  await open(page, 'studio')
  await presets(page).getByRole('button', { name: 'Ocean' }).click()
  await page.getByRole('tab', { name: 'CSS' }).click()
  await expect(page.locator('#ed-css')).toContainText('--sub-control-radius: 0.5rem;')
  await expect(page.locator('#ed-css')).toContainText('[data-sub-theme="dark"]')
  await page.getByRole('tab', { name: 'Install' }).click()
  await expect(page.locator('#ed-install')).toContainText("applyTheme(theme)")

  const json = await page.locator('#ed-json').textContent()
  await presets(page).getByRole('button', { name: 'Rose' }).click()
  await page.getByRole('textbox', { name: /Paste a theme/ }).fill(json ?? '')
  await page.getByRole('button', { name: 'Apply theme' }).click()
  await expect(page.getByText('Applied "Ocean".')).toBeVisible()
  expect(await buttonStyle(page, 'border-radius')).toBe('8px')

  await page.getByRole('textbox', { name: /Paste a theme/ }).fill('{ nope')
  await page.getByRole('button', { name: 'Apply theme' }).click()
  await expect(page.getByText('That is not valid JSON.')).toBeVisible()
  await page.getByRole('textbox', { name: /Paste a theme/ }).fill('{"$schema":"sub-theme/1","name":"x","colors":{"light":{"accent":"red"}}}')
  await page.getByRole('button', { name: 'Apply theme' }).click()
  await expect(page.getByText(/accent must be a hex colour/)).toBeVisible()
})

test('an imported theme that fails contrast is reported and can be fixed automatically', async ({ page }) => {
  await open(page, 'studio')
  const bad = '{"$schema":"sub-theme/1","name":"Pale","colors":{"light":{"muted":"#c8c8c8","accent":"#9ec5fe"}}}'
  await page.getByRole('textbox', { name: /Paste a theme/ }).fill(bad)
  await page.getByRole('button', { name: 'Apply theme' }).click()
  await expect(page.getByText(/contrast problem/)).toBeVisible()
  await page.getByRole('button', { name: 'Fix automatically' }).click()
  await expect(page.getByText('Meets WCAG 2.2 AA')).toBeVisible()
})

test('the SDK configures a page with no code: applyTheme scopes, autoTheme finds the theme', async ({ page }) => {
  await open(page, 'studio')
  const result = await page.evaluate(async () => {
    const sdk = (window as unknown as { subTheme: typeof import('@sub/core/theme') }).subTheme
    const theme = sdk.generateTheme({ name: 'Auto', primary: '#be123c', radius: 1 })
    // 1. zero-code: an inline <script type="application/sub-theme+json"> is picked up
    const scope = document.createElement('div')
    scope.innerHTML = '<sub-button>Hello</sub-button>'
    document.body.append(scope)
    const tag = document.createElement('script')
    tag.type = 'application/sub-theme+json'
    tag.textContent = sdk.exportTheme(theme)
    document.head.append(tag)
    const handle = await sdk.autoTheme(scope)
    const style = getComputedStyle(scope)
    const out = {
      found: handle?.theme.name,
      radius: style.getPropertyValue('--sub-button-radius').trim(), // derived in the scope
      accent: style.getPropertyValue('--sub-color-accent').trim(),
      mode: scope.dataset.subTheme,
    }
    handle?.setMode('dark')
    ;(out as Record<string, unknown>).darkAccent = getComputedStyle(scope).getPropertyValue('--sub-color-accent').trim()
    handle?.clear()
    ;(out as Record<string, unknown>).cleared = scope.getAttribute('style')
    scope.remove()
    tag.remove()
    return out
  })
  expect(result.found).toBe('Auto')
  expect(result.radius).toBe('1rem') // derived in the scope: --sub-button-radius resolved against the scoped radius
  expect(result.accent).toMatch(/^#/)
  expect(['light', 'dark']).toContain(result.mode)
  expect((result as { darkAccent: string }).darkAccent).not.toBe(result.accent)
  expect((result as { cleared: string | null }).cleared ?? '').toBe('')
})

test('the audit button measures the whole preview and reports in words', async ({ page }) => {
  await open(page, 'studio')
  await page.getByRole('button', { name: 'Audit the preview' }).click()
  await expect(page.locator('#ed-audit-out')).toContainText(/\d+% across \d+ components/)
  await expect(page.locator('#ed-audit-out')).toContainText('meets WCAG 2.2 AA')
})

test('remembering the theme survives a reload (opt-in)', async ({ page }) => {
  await open(page, 'studio')
  await presets(page).getByRole('button', { name: 'Forest' }).click()
  await page.getByRole('switch', { name: 'Remember this theme in this browser' }).click()
  await page.reload()
  await page.locator('html[data-studio-ready]').waitFor({ state: 'attached' })
  expect(await page.locator('#ed-json').textContent()).toContain('"name": "Forest"')
})

test('only the current page is shown: the Studio on /, the workbench on a component', async ({ page }) => {
  await open(page, 'studio')
  await expect(page.locator('#workbench')).toBeHidden()
  await expect(page.locator('#studio')).toBeVisible()
  await open(page, 'button')
  await expect(page.locator('#studio')).toBeHidden()
  await expect(page.locator('#workbench')).toBeVisible()
})

test('the Studio exports "no animations" and "fully rounded controls" without turning panels into circles', async ({ page }) => {
  await open(page, 'studio')
  await page.getByRole('switch', { name: 'Fully rounded controls' }).click()
  expect(await buttonStyle(page, 'border-radius')).toBe('9999px')
  // the dialog/menu/card tier stays capped
  const card = await page.evaluate(() => getComputedStyle(document.querySelector('#studio-app')!).getPropertyValue('--sub-surface-radius').trim())
  expect(card).toContain('min(')
  await page.getByRole('switch', { name: 'Animations' }).click()
  await expect(page.locator('#ed-json')).toContainText('"motion": "off"')
  await page.getByRole('tab', { name: 'CSS' }).click()
  await expect(page.locator('#ed-css')).toContainText('--sub-duration-base: 0ms')
})
