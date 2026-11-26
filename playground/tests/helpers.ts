import { readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import type { Page } from '@playwright/test'
import { mockApis } from './mocks'

/** Every demo id, discovered from `src/demos/*.ts` (so new components are covered automatically) */
export const demoIds = readdirSync(fileURLToPath(new URL('../src/demos/', import.meta.url)))
  .filter((f) => f.endsWith('.ts'))
  .map((f) => f.replace(/\.ts$/, ''))

export async function open(page: Page, id: string, theme: 'light' | 'dark' = 'light') {
  // the Studio's sample app calls public APIs: tests get deterministic answers (call mockApis first to customise)
  if (id === 'studio' || id === '') await mockApis(page)
  await page.goto(`/?c=${id}`)
  await page.locator('html[data-ready]').waitFor({ state: 'attached' })
  if (id === 'studio' || id === '') await page.locator('html[data-studio-ready]').waitFor({ state: 'attached' })
  if (theme === 'dark') await page.getByRole('checkbox', { name: 'Dark theme' }).check()
}
