import { defineButton } from '@sub/core/button'
import { definePopover } from '@sub/core/popover'
import type { Demo } from '../demo'

export default {
  id: "popover",
  title: "Popover",
  group: "Disclosure",
  description: "Non-modal panel next to its trigger. Focus moves in; Esc, outside click or Tab out closes it.",
  define() {
    defineButton()
    definePopover()
  },
  html: `
<sub-popover label="Shipping details">
  <sub-button slot="trigger" variant="secondary">Shipping details</sub-button>
  <p style="margin: 0 0 0.5rem">Free over 50. Delivered in 3-5 days.</p>
  <a href="#ship">Delivery policy</a>
</sub-popover>
`,
  tokens: ["popover"],
  keyboard: [
    ["Enter, Space", "Open"],
    ["Tab", "Move through the content; leaving closes it"],
    ["Esc", "Close and return to the trigger"],
  ],
} satisfies Demo
