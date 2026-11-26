import { defineButton } from '@sub/core/button'
import { defineButtonGroup } from '@sub/core/button-group'
import type { Demo } from '../demo'

export default {
  id: "button-group",
  title: "Button group",
  group: "Actions",
  description: "Related actions with a group name. form-actions: Cancel left and primary right on desktop; stacked with the primary on top on small containers.",
  define() {
    defineButton()
    defineButtonGroup()
  },
  html: `
<sub-button-group class="wide" label="Form actions" layout="form-actions">
  <sub-button variant="secondary">Cancel</sub-button>
  <sub-button>Save changes</sub-button>
</sub-button-group>
`,
  tokens: ["button"],
  props: { selector: 'sub-button-group', controls: [{ name: 'layout', type: 'select', options: ['inline', 'form-actions'] }] },
} satisfies Demo
