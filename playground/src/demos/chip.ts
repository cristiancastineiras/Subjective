import { defineChip } from '@sub/core/chip'
import type { Demo } from '../demo'

export default {
  id: "chip",
  title: "Chip",
  group: "Feedback",
  description: "Tag or active filter. The remove button names what it removes.",
  define: defineChip,
  html: `
<sub-chip>Read only</sub-chip>
<sub-chip removable>In stock</sub-chip>
<sub-chip removable>Under 50</sub-chip>
<sub-chip removable>Free shipping</sub-chip>
`,
  keyboard: [
    ["Tab", "Reach each remove button"],
    ["Enter, Space", "Remove the filter"],
  ],
  setup(preview, log) {
    preview.addEventListener('sub-remove', (event) => {
      const chip = event.target as HTMLElement
      log(`Removed filter: ${chip.textContent?.trim()}.`)
      chip.remove()
    })
  },
} satisfies Demo
