import { defineAlert } from '@sub/core/alert'
import { defineButton } from '@sub/core/button'
import type { Demo } from '../demo'

export default {
  id: "alert",
  title: "Alert",
  group: "Feedback",
  description: "Inline message. Severity is icon + text + border, never colour alone. Errors are announced assertively; nothing auto-dismisses.",
  define() {
    defineAlert()
    defineButton()
  },
  html: `
<div class="stack wide">
  <sub-alert variant="info" heading="Scheduled maintenance">The service will be read-only on Sunday from 02:00 to 03:00.</sub-alert>
  <sub-alert variant="success" heading="Saved">Your profile was updated.</sub-alert>
  <sub-alert variant="warning" heading="Storage almost full">You have used 92% of your space.</sub-alert>
  <sub-alert variant="error" heading="We could not save your changes" dismissible>The connection dropped before we could save. Your edits are still here.
    <sub-button slot="actions" variant="secondary">Try again</sub-button></sub-alert>
</div>
`,
  props: { selector: 'sub-alert', controls: [{ name: 'variant', type: 'select', options: ['info', 'success', 'warning', 'error'] }, { name: 'dismissible', type: 'boolean' }] },
  keyboard: [
    ["Tab", "Reach actions and the dismiss button"],
    ["Enter, Space", "Activate"],
  ],
} satisfies Demo
