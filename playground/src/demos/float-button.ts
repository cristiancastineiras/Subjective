import { defineFloatButton } from '@sub/core/float-button'
import type { Demo } from '../demo'

export default {
  id: "float-button",
  title: "Float button",
  group: "Actions",
  description: "Icon-only floating action. The label is mandatory; \"back to top\" moves focus to the page heading.",
  define: defineFloatButton,
  html: `
<sub-float-button static label="Create project" icon="add"></sub-float-button>
<sub-float-button static label="Help" icon="help"></sub-float-button>
`,
  tokens: ["float-button", "icon-button"],
  keyboard: [
    ["Tab", "Focus the button (tooltip shows)"],
    ["Enter, Space", "Activate"],
  ],
} satisfies Demo
