import { defineRate } from '@sub/core/rate'
import type { Demo } from '../demo'

export default {
  id: "rate",
  title: "Rate",
  group: "Forms",
  description: "A radio group of stars, each named \"3 of 5 stars\"; read-only shows one image with text.",
  define: defineRate,
  html: `
<div class="stack">
  <sub-rate name="rating" label="Rate this article" value="3" allow-clear></sub-rate>
  <sub-rate label="Average rating" value="4" readonly></sub-rate>
</div>
`,
  tokens: ["rate"],
  props: { selector: 'sub-rate', controls: [{ name: 'count', type: 'number', min: 3, max: 10 }, { name: 'allow-clear', type: 'boolean' }, { name: 'readonly', type: 'boolean' }] },
  keyboard: [
    ["Tab", "Enter the group"],
    ["Left / Right / Up / Down", "Choose fewer / more stars"],
    ["Tab to Clear rating", "Unset the rating"],
  ],
} satisfies Demo
