import { defineIconButton } from '@sub/core/icon-button'
import type { Demo } from '../demo'

export default {
  id: "icon-button",
  title: "Icon button",
  group: "Actions",
  description: "Icon-only action. The label is mandatory: it is the accessible name and the tooltip (hover 300ms, focus immediately). Only for universal icons.",
  define: defineIconButton,
  html: `
<sub-icon-button label="Search" icon="search"></sub-icon-button>
<sub-icon-button label="Close" icon="close" variant="secondary"></sub-icon-button>
<sub-icon-button label="Copy link" icon="content_copy" shortcut="Ctrl+C"></sub-icon-button>
<sub-icon-button label="Favourite" icon="star" toggle></sub-icon-button>
<sub-icon-button label="Delete item" icon="delete" variant="danger"></sub-icon-button>
<sub-icon-button label="Print" icon="download" disabled></sub-icon-button>
`,
  props: { selector: 'sub-icon-button', controls: [
    { name: 'variant', type: 'select', options: ['primary', 'secondary', 'tertiary', 'danger'] },
    { name: 'disabled', type: 'boolean' },
  ] },
  keyboard: [
    ["Tab", "Focus the button; the tooltip shows immediately"],
    ["Enter, Space", "Activate (toggles when it is a toggle)"],
    ["Esc", "Dismiss the tooltip"],
  ],
  setup(preview, log) {
    preview.addEventListener('click', (event) => {
      const button = (event.target as Element).closest('sub-icon-button')
      if (button && !button.disabled) log(`${button.label} activated${button.toggle ? ` (pressed: ${button.pressed})` : ''}.`)
    })
  },
} satisfies Demo
