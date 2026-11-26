import { defineDatePicker } from '@sub/core/date-picker'
import type { Demo } from '../demo'

export default {
  id: "date-picker",
  title: "Date picker",
  group: "Forms",
  description: "A typeable yyyy-mm-dd field plus a calendar popover; Esc returns to the field.",
  define: defineDatePicker,
  html: `
<div class="stack">
  <sub-date-picker name="start" label="Start date" value="2026-11-26" hint="Type a date or press Alt+Down" locale="en-GB" required></sub-date-picker>
  <sub-date-picker name="end" label="End date" min="2026-11-01" max="2026-12-31" locale="en-GB"></sub-date-picker>
</div>
`,
  tokens: ["field", "calendar"],
  props: { selector: 'sub-date-picker', controls: [{ name: 'locale', type: 'select', options: ['en-GB', 'en-US', 'es-ES', 'de-DE', 'ja-JP'] }, { name: 'required', type: 'boolean' }, { name: 'disabled', type: 'boolean' }] },
  keyboard: [
    ["Type", "yyyy-mm-dd"],
    ["Alt+Down or the button", "Open the calendar"],
    ["Arrows / PageUp / PageDown / Home / End", "Move in the calendar"],
    ["Enter, Space", "Pick the date"],
    ["Esc", "Close and return to the field"],
  ],
} satisfies Demo
