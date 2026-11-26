import { defineButton } from '@sub/core/button'
import { defineTooltip } from '@sub/core/tooltip'
import type { Demo } from '../demo'

export default {
  id: "tooltip",
  title: "Tooltip",
  group: "Disclosure",
  description: "Supplementary text on hover (300ms) and focus (immediate), dismissible with Esc, hoverable. Never the only way to learn something.",
  define() {
    defineButton()
    defineTooltip()
  },
  html: `
<sub-button id="export" variant="secondary">Export report</sub-button>
<sub-tooltip for="export">CSV with every row from the last 30 days</sub-tooltip>
`,
  keyboard: [
    ["Tab", "Focus the target: the tooltip shows immediately"],
    ["Esc", "Dismiss the tooltip"],
  ],
} satisfies Demo
