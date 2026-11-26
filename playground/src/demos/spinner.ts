import { defineSpinner } from '@sub/core/spinner'
import type { Demo } from '../demo'

export default {
  id: "spinner",
  title: "Spinner",
  group: "Feedback",
  description: "Indeterminate activity. Say what is happening; use progress when the amount is known.",
  define: defineSpinner,
  html: `
<sub-spinner></sub-spinner>
<sub-spinner label="Generating report" show-label></sub-spinner>
`,
  props: { selector: 'sub-spinner', controls: [{ name: 'show-label', type: 'boolean' }, { name: 'label', type: 'text' }] },
} satisfies Demo
