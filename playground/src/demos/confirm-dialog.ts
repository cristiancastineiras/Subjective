import { defineButton } from '@sub/core/button'
import { defineConfirmDialog } from '@sub/core/confirm-dialog'
import type { Demo } from '../demo'

export default {
  id: "confirm-dialog",
  title: "Confirm dialog",
  group: "Disclosure",
  description: "Confirmation for destructive actions: specific heading and button, consequences stated, initial focus on Cancel, Esc = Cancel.",
  define() {
    defineButton()
    defineConfirmDialog()
  },
  html: `
<sub-button variant="danger" id="ask">Delete project</sub-button>
<sub-confirm-dialog id="confirm" heading="Delete the project Atlas permanently?"
  message="This will delete Atlas and all its data. This cannot be undone." confirm-label="Delete project"></sub-confirm-dialog>
`,
  tokens: ["dialog"],
  keyboard: [
    ["Esc", "Cancel (never confirms)"],
    ["Tab", "Cycle Cancel -> Delete project"],
    ["Enter, Space", "Activate the focused button"],
  ],
  setup(preview, log) {
    const dialog = preview.querySelector('sub-confirm-dialog')
    preview.querySelector('#ask')?.addEventListener('click', () => dialog?.show())
    dialog?.addEventListener('sub-confirm', () => log('Project deleted.'))
    dialog?.addEventListener('sub-cancel', () => log('Deletion cancelled.'))
  },
} satisfies Demo
