import { defineHeading } from '@sub/core/heading'
import type { Demo } from '../demo'

export default {
  id: "heading",
  title: "Heading",
  group: "Content",
  description: "Semantic level and visual size are independent: the outline stays correct while the look changes.",
  define: defineHeading,
  html: `
<div class="wide">
  <sub-heading level="1">Page title (h1, size 1)</sub-heading>
  <sub-heading level="2" size="4">Section (h2 drawn like a size 4)</sub-heading>
  <sub-heading level="3">Subsection (h3, size 3)</sub-heading>
</div>
`,
  props: { selector: 'sub-heading', controls: [{ name: 'size', type: 'number', min: 1, max: 6 }] },
} satisfies Demo
