import { expect, test } from '@playwright/test'
import { demoIds, open } from './helpers'

interface Report {
  tag: string
  score: number
  compliant: boolean
  strict: boolean
  checks: Array<{ id: string; level: string; status: string; detail?: string }>
}

// Raw defaults must meet WCAG 2.2 AA in both themes according to the library's own auditor
// (computed styles, real target sizes, real focus ring). AAA / best-practice misses are reported
// in the second test so they are visible without blocking.
for (const theme of ['light', 'dark'] as const) {
  for (const id of demoIds) {
    test(`${id}: defaults meet WCAG AA (${theme})`, async ({ page }) => {
      await open(page, id, theme)
      await page.locator('#a11y[data-score]').waitFor()
      const reports = await page.evaluate(() => (window as unknown as { subAudit: () => Report[] }).subAudit())
      const failing = reports.flatMap((r) =>
        r.checks.filter((c) => c.status === 'fail' && (c.level === 'A' || c.level === 'AA')).map((c) => `${r.tag} ${c.id} [${c.level}]: ${c.detail}`),
      )
      expect(failing).toEqual([])
    })
  }
}

test('every audited component also passes the AAA and best-practice checks by default', async ({ page }) => {
  const misses: string[] = []
  for (const id of demoIds) {
    await open(page, id)
    await page.locator('#a11y[data-score]').waitFor()
    const reports = await page.evaluate(() => (window as unknown as { subAudit: () => Report[] }).subAudit())
    for (const r of reports) for (const c of r.checks) if (c.status === 'fail') misses.push(`${id} > ${r.tag} ${c.id} [${c.level}]: ${c.detail}`)
  }
  expect(misses).toEqual([])
})

test('lowering a token lowers the score (the auditor measures what is rendered)', async ({ page }) => {
  await open(page, 'button')
  await page.locator('#a11y[data-score]').waitFor()
  const before = Number(await page.locator('#a11y').getAttribute('data-score'))
  // Borders to 0 and a 16px target: the secondary button loses its boundary and sizes fail
  await page.evaluate(() => {
    const p = document.getElementById('preview')!
    p.style.setProperty('--sub-button-min-size', '1rem')
    p.style.setProperty('--sub-button-padding-block', '0')
    p.style.setProperty('--sub-button-font-size', '0.75rem')
  })
  const reports = await page.evaluate(() => (window as unknown as { subAudit: () => Report[] }).subAudit())
  const failing = reports.flatMap((r) => r.checks.filter((c) => c.status === 'fail').map((c) => c.id))
  expect(before).toBeGreaterThanOrEqual(90)
  expect(failing).toContain('target-aa')
  expect(reports.some((r) => !r.compliant)).toBe(true)
})

test('auditing never changes what the user sees: a pristine form shows no errors and keeps focus', async ({ page }) => {
  await open(page, 'input')
  await page.locator('#a11y[data-score]').waitFor()
  await page.evaluate(() => (window as unknown as { subAudit: () => Promise<unknown> }).subAudit())
  await expect(page.getByText(/Please enter your/)).toHaveCount(0)
  await expect(page.locator('sub-input[aria-invalid], [aria-invalid="true"]')).toHaveCount(0)
  const email = page.getByRole('textbox', { name: 'Email address' })
  await email.focus()
  await page.evaluate(() => (window as unknown as { subAudit: () => Promise<unknown> }).subAudit())
  await expect(email).toBeFocused() // restored to the exact inner control
  await expect(page.getByText(/Please enter your/)).toHaveCount(0)
})
