import { defineIcon } from '@sub/core/icon'
import type { Demo } from '../demo'

export default {
  id: "icon",
  title: "Icon",
  group: "Content",
  description: "Material Symbols as inline SVG. Decorative by default; a label turns it into an image with a name.",
  define: defineIcon,
  html: `
<div class="row">
  <sub-icon name="search"></sub-icon>
  <sub-icon name="check_circle" filled></sub-icon>
  <sub-icon name="warning" filled label="Warning"></sub-icon>
  <sub-icon name="chevron_right"></sub-icon>
</div>
`,
  props: { selector: 'sub-icon', controls: [{ name: 'name', type: 'text', placeholder: 'e.g. star' }, { name: 'filled', type: 'boolean' }, { name: 'label', type: 'text', placeholder: 'Only if it stands alone' }] },
} satisfies Demo
