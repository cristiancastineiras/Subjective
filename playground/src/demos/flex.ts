import { defineFlex } from '@sub/core/flex'
import { defineButton } from '@sub/core/button'
import type { Demo } from '../demo'

export default {
  id: "flex",
  title: "Flex and space",
  group: "Layout",
  description: "Flexbox container and an inline group with consistent gaps (>= 8px between targets).",
  define() {
    defineFlex()
    defineButton()
  },
  html: `
<sub-flex class="wide" gap="4" align="center" justify="between" wrap>
  <strong>Toolbar</strong>
  <sub-space><sub-button variant="secondary">Cancel</sub-button><sub-button>Save</sub-button></sub-space>
</sub-flex>
`,
  tokens: ["flex", "space"],
  props: { selector: 'sub-flex', controls: [{ name: 'direction', type: 'select', options: ['row', 'column'] }, { name: 'gap', type: 'select', options: ['0', '1', '2', '3', '4', '6', '8', '12'] }, { name: 'justify', type: 'select', options: ['start', 'center', 'end', 'between', 'around'] }, { name: 'wrap', type: 'boolean' }] },
} satisfies Demo
