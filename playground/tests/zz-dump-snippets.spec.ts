import { writeFileSync } from 'node:fs'
import { test } from '@playwright/test'
import { demoIds, open } from './helpers'

const OUT = process.env.SNIPPETS_OUT!

test('dump every snippet', async ({ page }) => {
  test.setTimeout(600_000)
  const all: Record<string, Record<string, { file: string; code: string }>> = {}
  for (const id of demoIds) {
    await open(page, id)
    await page.getByText('Code', { exact: true }).click()
    await page.locator('#code-tabs').getByRole('tab', { name: 'HTML', exact: true }).waitFor()
    all[id] = {}
    for (const fw of ['HTML', 'React', 'Vue', 'Angular', 'Svelte', 'Solid', 'Preact']) {
      await page.locator('#code-tabs').getByRole('tab', { name: fw, exact: true }).click()
      await page.locator(`pre[aria-label="Example code (${fw})"]`).waitFor()
      all[id][fw] = await page.evaluate(() => ({ file: document.querySelector('.code-file')!.textContent!, code: document.querySelector('.code-view')!.textContent! }))
    }
  }
  writeFileSync(OUT, JSON.stringify(all, null, 1))
})

