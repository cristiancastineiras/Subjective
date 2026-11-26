import { defineTextarea } from '@sub/core/textarea'
import type { Demo } from '../demo'

export default {
  id: "textarea",
  title: "Textarea",
  group: "Forms",
  description: "Multi-line text with the same label, hint, error and live character count as the input.",
  define: defineTextarea,
  html: `
<div class="stack">
  <sub-textarea name="message" label="Message" hint="Tell us what happened." maxlength="200" counter required></sub-textarea>
</div>
`,
  tokens: ["field"],
  props: { selector: 'sub-textarea', controls: [{ name: 'required', type: 'boolean' }, { name: 'disabled', type: 'boolean' }, { name: 'rows', type: 'number', min: 2, max: 12 }] },
} satisfies Demo
