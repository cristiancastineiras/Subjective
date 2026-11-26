import { expect, test } from '@playwright/test'
import { demoIds, open } from './helpers'

// WCAG 1.4.10 Reflow: at 320 CSS px wide nothing may need sideways scrolling of the page.
// (Wide content such as tables scrolls inside its own keyboard-focusable region.)
test.use({ viewport: { width: 320, height: 740 } })

for (const id of ['studio', 'components', ...demoIds]) {
  test(`${id} reflows at 320px without page-level horizontal scrolling`, async ({ page }) => {
    await open(page, id)
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
    expect(overflow).toBeLessThanOrEqual(0)
  })
}
