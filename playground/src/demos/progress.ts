import { defineProgress } from '@sub/core/progress'
import type { Demo } from '../demo'

export default {
  id: "progress",
  title: "Progress",
  group: "Feedback",
  description: "Determinate with value, now/min/max and text; indeterminate without. Never fake values.",
  define: defineProgress,
  html: `
<div class="stack wide">
  <sub-progress label="Uploading report.pdf" value="42" show-value valuetext="3.4 MB of 8 MB"></sub-progress>
  <sub-progress label="Preparing download"></sub-progress>
</div>
`,
  props: { selector: 'sub-progress', controls: [{ name: 'value', type: 'number', min: 0, max: 100 }, { name: 'show-value', type: 'boolean' }] },
} satisfies Demo
