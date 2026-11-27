import { execFileSync } from 'node:child_process'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { expect, test } from '@playwright/test'
import { demoIds, open } from './helpers'

// `pnpm test:snippets` (not part of the default suite: it needs every example app's compiler).
// Reads each page's example in every framework from the Code block, as a reader would, and compiles them all
// with the real compilers (scripts/check-snippets.mjs).
const FRAMEWORKS = ['HTML', 'React', 'Vue', 'Angular', 'Svelte', 'Solid', 'Preact']
const script = fileURLToPath(new URL('../../scripts/check-snippets.mjs', import.meta.url))

test("every page's example compiles with its framework's own compiler", async ({ page }) => {
  test.setTimeout(15 * 60_000)
  const all: Record<string, Record<string, { file: string; code: string }>> = {}
  for (const id of demoIds) {
    await open(page, id)
    await page.getByText('Code', { exact: true }).click()
    const tabs = page.locator('#code-block').getByRole('tablist', { name: 'Framework' })
    all[id] = {}
    for (const name of FRAMEWORKS) {
      await tabs.getByRole('tab', { name, exact: true }).click()
      await page.locator('#code-block').getByRole('region', { name: `Example code (${name})` }).waitFor()
      all[id][name] = await page.evaluate(() => ({ file: document.querySelector('#code-block .code-file')!.textContent!, code: document.querySelector('#code-block .code-view')!.textContent! }))
    }
  }
  const dir = mkdtempSync(join(tmpdir(), 'sub-snippets-'))
  const file = join(dir, 'snippets.json')
  writeFileSync(file, JSON.stringify(all))
  let output: string
  try {
    output = execFileSync(process.execPath, [script, file], { encoding: 'utf8', stdio: 'pipe' })
  } catch (error) {
    const e = error as { stdout?: string; stderr?: string }
    output = `${e.stdout ?? ''}${e.stderr ?? ''}`
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
  console.log(output)
  expect(output, output).toContain('ALL EXAMPLES COMPILE')
})
