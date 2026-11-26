import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import { demoIds, open } from './helpers'

// Automated WCAG 2.2 AA checks on every component demo, in both themes (incl. colour contrast
// inside shadow roots). Automation finds ~half of the issues: keyboard/screen-reader behaviour
// is covered by the per-component specs.
for (const theme of ['light', 'dark'] as const) {
  for (const id of ['components', 'studio', ...demoIds]) {
    test(`${id} has no axe violations (${theme})`, async ({ page }) => {
      await open(page, id, theme)
      const { violations } = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'])
        .analyze()
      expect(violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(' | ')}`)).toEqual([])
    })
  }
}
