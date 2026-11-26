import { defineCalendar } from '@sub/core/calendar'
import type { Demo } from '../demo'

export default {
  id: "calendar",
  title: "Calendar",
  group: "Data",
  description: "ARIA date grid: one tab stop, arrows by day/week, PageUp/PageDown by month.",
  define: defineCalendar,
  html: `
<sub-calendar value="2026-11-26" locale="en-GB"></sub-calendar>
`,
  tokens: ["calendar"],
  props: { selector: 'sub-calendar', controls: [{ name: 'locale', type: 'select', options: ['en-GB', 'en-US', 'es-ES', 'de-DE', 'ja-JP'] }, { name: 'first-day', type: 'number', min: 0, max: 6 }] },
  keyboard: [
    ["Arrows", "Day / week"],
    ["Home / End", "Start / end of the week"],
    ["PageUp / PageDown", "Month (Shift: year)"],
    ["Enter, Space", "Pick the day"],
  ],
  setup(preview, log) {
    preview.addEventListener('sub-select', (e) => log(`Picked ${(e as CustomEvent<{ value: string }>).detail.value}.`))
  },
} satisfies Demo
