import { defineButton } from '@sub/core/button'
import { definePopconfirm } from '@sub/core/popconfirm'
import type { Demo } from '../demo'

export default {
  id: "popconfirm",
  title: "Popconfirm",
  group: "Disclosure",
  description: "Inline confirmation next to the control; focus starts on the safe action.",
  define() {
    defineButton()
    definePopconfirm()
  },
  html: `
<sub-popconfirm message="This deletes the row and its history. It cannot be undone." confirm-label="Delete row" label="Confirm deletion">
  <sub-button slot="trigger" variant="danger">Delete row</sub-button>
</sub-popconfirm>
`,
  tokens: ["popover"],
  keyboard: [
    ["Enter on the trigger", "Open (focus lands on Cancel)"],
    ["Esc", "Cancel"],
    ["Tab", "Cancel / Delete row"],
  ],
  setup(preview, log) {
    preview.addEventListener('sub-confirm', () => log('Row deleted.'))
    preview.addEventListener('sub-cancel', () => log('Deletion cancelled.'))
  },
} satisfies Demo
