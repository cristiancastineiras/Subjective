import { defineTruncate } from '@sub/core/truncate'
import type { Demo } from '../demo'

export default {
  id: "truncate",
  title: "Truncate",
  group: "Content",
  description: "Overflowing text with a way to read all of it. The full text stays in the DOM; only the look is clipped.",
  define: defineTruncate,
  html: `
<div class="stack">
  <div style="inline-size: 14rem; border: 2px dashed currentColor; padding: 0.5rem">
    <sub-truncate>quarterly-report-final-v2-reviewed-by-legal.pdf</sub-truncate>
  </div>
  <sub-truncate lines="2">Accessible components are not a feature you add at the end. They are the baseline: native elements first, ARIA only to fill the gaps, and every state designed on purpose so nobody is left guessing what happened.</sub-truncate>
</div>
`,
  tokens: ["truncate"],
  props: { selector: 'sub-truncate', controls: [{ name: 'lines', type: 'number', min: 1, max: 6 }] },
  keyboard: [
    ["Tab", "Reach truncated text; the tooltip shows the full text"],
    ["Enter, Space", "Show more / Show less (multi-line)"],
  ],
} satisfies Demo
