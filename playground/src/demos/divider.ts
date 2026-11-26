import { defineDivider } from '@sub/core/divider'
import type { Demo } from '../demo'

export default {
  id: "divider",
  title: "Divider",
  group: "Layout",
  description: "Separator between groups: semantic by default, decorative on request, optional label.",
  define: defineDivider,
  html: `
<div class="wide">
  <p>Above</p>
  <sub-divider></sub-divider>
  <p>Between</p>
  <sub-divider label="or"></sub-divider>
  <p>Below</p>
  <div class="row" style="align-items: stretch">Left <sub-divider orientation="vertical" decorative></sub-divider> Right</div>
</div>
`,
  tokens: ["divider"],
  props: { selector: 'sub-divider', controls: [{ name: 'orientation', type: 'select', options: ['horizontal', 'vertical'] }, { name: 'decorative', type: 'boolean' }, { name: 'label', type: 'text' }] },
} satisfies Demo
