import { defineTimePicker } from '@sub/core/time-picker'
import type { Demo } from '../demo'

export default {
  id: "time-picker",
  title: "Time picker",
  group: "Forms",
  description: "Native time field with the same label, hint and error behaviour as the input.",
  define: defineTimePicker,
  html: `
<div class="stack">
  <sub-time-picker name="at" label="Meeting time" value="09:30" hint="Local time"></sub-time-picker>
</div>
`,
  tokens: ["field"],
} satisfies Demo
