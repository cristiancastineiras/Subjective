import { defineWatermark } from '@sub/core/watermark'
import type { Demo } from '../demo'

export default {
  id: "watermark",
  title: "Watermark",
  group: "Feedback",
  description: "Repeating text mark over content. Visual only, never blocks interaction, never hides text.",
  define: defineWatermark,
  html: `
<sub-watermark class="wide" content="Confidential"><div class="demo-box"><p>Quarterly figures, internal use only. The text underneath stays readable and selectable.</p></div></sub-watermark>
`,
  tokens: ["watermark"],
  props: { selector: 'sub-watermark', controls: [{ name: 'content', type: 'text' }, { name: 'rotate', type: 'number', min: -90, max: 90 }] },
} satisfies Demo
