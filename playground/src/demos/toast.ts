import { defineButton } from '@sub/core/button'
import { defineToaster } from '@sub/core/toast'
import type { Demo } from '../demo'

export default {
  id: "toast",
  title: "Toast",
  group: "Feedback",
  description: "Short confirmations and Undo windows in a polite live region. Timers pause on hover and focus; errors never auto-dismiss.",
  define() {
    defineButton()
    defineToaster()
  },
  html: `
<sub-button id="t1">Turn off notifications</sub-button>
<sub-button id="t2" variant="secondary">Show an error</sub-button>
<sub-toaster></sub-toaster>
`,
  keyboard: [
    ["Tab", "Reach the toast actions (timers pause while focused)"],
    ["Enter, Space", "Undo / dismiss"],
  ],
  setup(preview, log) {
    const toaster = preview.querySelector('sub-toaster')
    preview.addEventListener('click', (event) => {
      const id = (event.target as Element).closest('sub-button')?.id
      if (id === 't1') toaster?.show({ message: 'Notifications turned off', actionLabel: 'Undo' })
      if (id === 't2') toaster?.show({ message: 'Could not reach the server', variant: 'error' })
    })
    toaster?.addEventListener('sub-toast-action', () => log('Undo pressed.'))
  },
} satisfies Demo
