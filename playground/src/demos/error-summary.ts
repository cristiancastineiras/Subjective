import { defineErrorSummary } from '@sub/core/error-summary'
import { defineInput } from '@sub/core/input'
import type { Demo } from '../demo'

export default {
  id: "error-summary",
  title: "Error summary",
  group: "Forms",
  description: "Lists every error with a link that focuses its field. Use it directly for server-side validation.",
  define() {
    defineErrorSummary()
    defineInput()
  },
  html: `
<div class="stack">
  <sub-error-summary id="summary"></sub-error-summary>
  <sub-input id="f-name" label="Full name" error="Enter your full name" required></sub-input>
  <sub-input id="f-mail" label="Email address" error="Enter a valid email address - for example, ana@example.com" required></sub-input>
  <sub-input id="f-code" label="Postal code" error="Postal code must have 5 digits" required></sub-input>
</div>
`,
  tokens: ["error-summary"],
  setup(preview, log) {
    const summary = preview.querySelector('sub-error-summary')
    const fields = [...preview.querySelectorAll<HTMLElement & { label: string; error: string }>('sub-input')]
    if (summary) summary.errors = fields.map((f) => ({ label: f.label, message: f.error, target: f }))
  },
} satisfies Demo
