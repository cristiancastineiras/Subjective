import { defineGrid } from '@sub/core/grid'
import type { Demo } from '../demo'

export default {
  id: "grid",
  title: "Grid",
  group: "Layout",
  description: "Responsive grid that reflows by itself (auto-fit) or with a fixed column count.",
  define: defineGrid,
  html: `
<sub-grid class="wide">
  <div class="demo-box">One</div><div class="demo-box">Two</div><div class="demo-box">Three</div><div class="demo-box">Four</div>
</sub-grid>
`,
  tokens: ["grid"],
  props: { selector: 'sub-grid', controls: [{ name: 'columns', type: 'number', min: 1, max: 6 }] },
} satisfies Demo
