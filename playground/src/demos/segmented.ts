import { defineSegmented } from '@sub/core/segmented'
import type { Demo } from '../demo'

export default {
  id: "segmented",
  title: "Segmented",
  group: "Forms",
  description: "A choice drawn as one strip (Day / Week / Month). Native radios: arrows move and select.",
  define: defineSegmented,
  html: `
<div class="stack">
  <sub-segmented name="view" label="Calendar view" value="week">
    <sub-option value="day">Day</sub-option>
    <sub-option value="week">Week</sub-option>
    <sub-option value="month">Month</sub-option>
  </sub-segmented>
</div>
`,
  tokens: ["segmented"],
  keyboard: [
    ["Tab", "Enter the group"],
    ["Left / Right", "Choose the previous / next segment"],
  ],
  setup(preview, log) {
    preview.addEventListener('change', (e) => log(`View: ${(e.target as HTMLElement & { value: string }).value}`))
  },
} satisfies Demo
