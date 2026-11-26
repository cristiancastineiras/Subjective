import { defineLayout } from '@sub/core/layout'
import type { Demo } from '../demo'

export default {
  id: "layout",
  title: "Layout",
  group: "Layout",
  description: "Container, stack and prose: bounded page width, spacing from the 4/8px scale, and a 45-75 character reading column.",
  define: defineLayout,
  html: `
<sub-container size="prose" class="wide">
  <sub-stack gap="6">
    <div class="demo-box">Container (prose width, responsive gutter)</div>
    <sub-prose>
      <p>Long-form text stays inside a reading column of about 65 characters, with a line height of 1.6 and paragraph spacing of at least one and a half lines.</p>
      <p>That keeps lines short enough to track, and survives users who override text spacing.</p>
    </sub-prose>
  </sub-stack>
</sub-container>
`,
  tokens: [],
  props: { selector: 'sub-container', controls: [{ name: 'size', type: 'select', options: ['prose', 'wide', 'max', 'full'] }] },
} satisfies Demo
