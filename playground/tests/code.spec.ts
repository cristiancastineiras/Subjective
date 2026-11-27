import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'
import { open } from './helpers'

// The Code block of every page: the example in each framework SUB supports (one tab each, WAI-ARIA tabs),
// coloured like an editor, written with each package's real names (the same snippets compile with every
// framework's own compiler: `pnpm test:snippets`).

const FRAMEWORKS = ['HTML', 'React', 'Vue', 'Angular', 'Svelte', 'Solid', 'Preact']

const block = (page: Page) => page.locator('#code-block')
const tabs = (page: Page) => block(page).getByRole('tablist', { name: 'Framework' })
const tab = (page: Page, name: string) => tabs(page).getByRole('tab', { name, exact: true })
const code = (page: Page) => block(page).getByRole('region', { name: /^Example code/ })
const fileName = (page: Page) => block(page).locator('.code-file')

async function openCode(page: Page, id: string, theme: 'light' | 'dark' = 'light') {
  await open(page, id, theme)
  await page.getByText('Code', { exact: true }).click()
  await expect(tabs(page)).toBeVisible()
}

test('every framework has a tab with its logo and name; HTML is first and selected', async ({ page }) => {
  await openCode(page, 'button')
  await expect(tabs(page).getByRole('tab')).toHaveText(FRAMEWORKS)
  await expect(tab(page, 'HTML')).toHaveAttribute('aria-selected', 'true')
  // the logos are decorative: the tab's name is its text
  await expect(tabs(page).locator('svg[aria-hidden="true"]')).toHaveCount(FRAMEWORKS.length)
  await expect(code(page)).toHaveAccessibleName('Example code (HTML)')
  await expect(code(page)).toContainText("import { defineButton } from '@sub/core/button'")
  await expect(code(page)).toContainText('<sub-button variant="danger">Delete project</sub-button>')
  await expect(fileName(page)).toHaveText('button-example.html')
})

test('each tab shows the example written for that framework, with its package', async ({ page }) => {
  await openCode(page, 'button')
  const expected: Record<string, { file: string; has: string[] }> = {
    React: { file: 'ButtonExample.tsx', has: ["import { SubButton } from '@sub/react'", 'export function ButtonExample()', '<SubButton variant="danger">Delete project</SubButton>', 'disabledReason="Available on the Pro plan"'] },
    Vue: { file: 'ButtonExample.vue', has: ['<script setup lang="ts">', "import { SubButton } from '@sub/vue'", '<SubButton variant="danger">Delete project</SubButton>', 'disabled-reason="Available on the Pro plan"'] },
    Angular: { file: 'button-example.component.ts', has: ["import { SubButtonDirective } from '@sub/angular'", 'imports: [SubButtonDirective]', 'schemas: [CUSTOM_ELEMENTS_SCHEMA]', 'export class ButtonExampleComponent {}', 'disabledReason="Available on the Pro plan"'] },
    Svelte: { file: 'ButtonExample.svelte', has: ["import { defineButton } from '@sub/svelte'", 'defineButton()', '<sub-button variant="danger">Delete project</sub-button>'] },
    Solid: { file: 'ButtonExample.tsx', has: ["import { defineButton } from '@sub/solid'", '<sub-button variant="danger">Delete project</sub-button>'] },
    Preact: { file: 'ButtonExample.tsx', has: ["import { defineButton } from '@sub/preact'", '<sub-button variant="danger">Delete project</sub-button>'] },
  }
  for (const [name, { file, has }] of Object.entries(expected)) {
    await tab(page, name).click()
    await expect(tab(page, name)).toHaveAttribute('aria-selected', 'true')
    await expect(code(page)).toHaveAccessibleName(`Example code (${name})`)
    await expect(fileName(page)).toHaveText(file)
    for (const text of has) await expect(code(page), `${name}: ${text}`).toContainText(text)
  }
})

test('values keep their types and attributes become the property each framework sets', async ({ page }) => {
  await openCode(page, 'progress')
  await tab(page, 'React').click()
  await expect(code(page)).toContainText('value={42}') // a number, not "42"
  await expect(code(page)).toContainText('showValue') // show-value: a boolean property, bare
  await tab(page, 'Vue').click()
  await expect(code(page)).toContainText(':value="42"')
  await expect(code(page)).toContainText('show-value')

  // the attribute `static` is the property `inline`: the frameworks that set properties must say `inline`
  await openCode(page, 'float-button')
  for (const name of ['React', 'Solid', 'Preact', 'Svelte', 'Vue']) {
    await tab(page, name).click()
    await expect(code(page), name).toContainText(/\binline\b/)
    await expect(code(page), name).not.toContainText(/\bstatic\b/)
  }
  await tab(page, 'HTML').click()
  await expect(code(page)).toContainText('static')
})

test('React gets its own names for HTML attributes and a typed style object', async ({ page }) => {
  await openCode(page, 'statistic')
  await tab(page, 'React').click()
  await expect(code(page)).toContainText('className=')
  await expect(code(page)).not.toContainText(' class=')
  // a custom property in `style`: React's style type needs the cast, and the file imports it
  await expect(code(page)).toContainText("import type { CSSProperties } from 'react'")
  await expect(code(page)).toContainText('as CSSProperties}')
})

test('the code is coloured like an editor, and the text stays the plain code', async ({ page }) => {
  await openCode(page, 'button')
  await tab(page, 'React').click()
  const kinds = await code(page).locator('[class^="tok-"]').evaluateAll((spans) => [...new Set(spans.map((s) => s.className))].sort())
  expect(kinds).toEqual(expect.arrayContaining(['tok-attr', 'tok-component', 'tok-function', 'tok-keyword', 'tok-punct', 'tok-string']))
  // a keyword and a component do not look the same
  const color = (selector: string) => code(page).locator(selector).first().evaluate((el) => getComputedStyle(el).color)
  expect(await color('.tok-keyword')).not.toBe(await color('.tok-component'))
  await expect(code(page)).toContainText('export function ButtonExample() {')
})

test('arrow keys, Home and End move between the tabs; one tab stop', async ({ page }) => {
  await openCode(page, 'button')
  await tab(page, 'HTML').focus()
  await expect(tabs(page).locator('[tabindex="0"]')).toHaveCount(1)
  await page.keyboard.press('ArrowRight')
  await expect(tab(page, 'React')).toBeFocused()
  await expect(tab(page, 'React')).toHaveAttribute('aria-selected', 'true')
  await expect(code(page)).toContainText('<SubButton')
  await page.keyboard.press('End')
  await expect(tab(page, 'Preact')).toBeFocused()
  await page.keyboard.press('ArrowRight') // wraps
  await expect(tab(page, 'HTML')).toBeFocused()
  await page.keyboard.press('ArrowLeft') // wraps back
  await expect(tab(page, 'Preact')).toBeFocused()
  await page.keyboard.press('Home')
  await expect(tab(page, 'HTML')).toBeFocused()
  await expect(tab(page, 'HTML')).toHaveAttribute('aria-selected', 'true')
  // Tab leaves the tab row for the code itself (it scrolls: it is focusable)
  await page.keyboard.press('Tab')
  await expect(block(page).getByRole('button', { name: 'Copy code' })).toBeFocused()
  await page.keyboard.press('Tab')
  await expect(code(page)).toBeFocused()
})

test('the framework you pick follows you to other pages and visits', async ({ page }) => {
  await openCode(page, 'button')
  await tab(page, 'Vue').click()
  await page.getByRole('navigation', { name: 'Components' }).getByRole('link', { name: 'Tabs', exact: true }).click()
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Tabs')
  await page.getByText('Code', { exact: true }).click()
  await expect(tab(page, 'Vue')).toHaveAttribute('aria-selected', 'true')
  await expect(code(page)).toContainText('<SubTabs')
  await page.reload()
  await page.locator('html[data-ready]').waitFor({ state: 'attached' })
  await page.getByText('Code', { exact: true }).click()
  await expect(tab(page, 'Vue')).toHaveAttribute('aria-selected', 'true')
})

test('Copy copies the example of the tab you are reading', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  await openCode(page, 'button')
  await tab(page, 'React').click()
  await block(page).getByRole('button', { name: 'Copy code' }).click()
  await expect(block(page).getByRole('button', { name: 'Copied' })).toBeVisible()
  const copied = await page.evaluate(() => navigator.clipboard.readText())
  expect(copied).toContain("import { SubButton } from '@sub/react'")
  expect(copied).toContain('<SubButton variant="danger">Delete project</SubButton>')
  expect(copied).not.toContain('tok-') // the code, not its colouring
})

test('closed, the block leaves nothing in the page; on a phone all tabs fit without scrolling sideways', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 800 })
  await openCode(page, 'button')
  const row = await tabs(page).evaluate((el) => ({ scroll: el.scrollWidth, client: el.clientWidth }))
  expect(row.scroll).toBeLessThanOrEqual(row.client)
  for (const name of FRAMEWORKS) {
    const box = (await tab(page, name).boundingBox())!
    expect(box.height, name).toBeGreaterThanOrEqual(44) // a comfortable target
  }
  await page.getByText('Code', { exact: true }).click()
  await expect(block(page).locator('#code-tabs')).toBeEmpty()
})

for (const theme of ['light', 'dark'] as const) {
  test(`every tab of the code block has no axe violations, contrast included (${theme})`, async ({ page }) => {
    await openCode(page, 'select', theme)
    for (const name of FRAMEWORKS) {
      await tab(page, name).click()
      await expect(code(page)).toHaveAccessibleName(`Example code (${name})`)
      const { violations } = await new AxeBuilder({ page })
        .include('#code-block')
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'])
        .analyze()
      expect(violations.map((v) => `${name}: ${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(' | ')}`)).toEqual([])
    }
  })
}
