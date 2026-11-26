import { defineResult } from '@sub/core/result'
import { defineButton } from '@sub/core/button'
import type { Demo } from '../demo'

export default {
  id: "result",
  title: "Result",
  group: "Feedback",
  description: "What happened, what it means, what to do next. Icon + title + text, never colour alone.",
  define() {
    defineResult()
    defineButton()
  },
  html: `
<sub-result class="wide" status="success" heading="Payment received" subtitle="Order 1042 is confirmed. We emailed you the receipt.">
  <sub-button slot="actions">View order</sub-button><sub-button slot="actions" variant="secondary">Back to shop</sub-button>
</sub-result>
`,
  tokens: ["result"],
  props: { selector: 'sub-result', controls: [{ name: 'status', type: 'select', options: ['success', 'info', 'warning', 'error', '403', '404', '500'] }] },
} satisfies Demo
