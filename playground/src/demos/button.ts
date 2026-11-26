import { defineButton } from '@sub/core/button'
import type { Demo } from '../demo'

export default {
  id: "button",
  title: "Button",
  group: "Actions",
  description: "Trigger an action with a native button. One primary per view; secondary and tertiary for the rest; danger names its consequence.",
  define: defineButton,
  html: `
<sub-button>Save changes</sub-button>
<sub-button variant="secondary">Cancel</sub-button>
<sub-button variant="tertiary">Skip for now</sub-button>
<sub-button variant="danger">Delete project</sub-button>
<sub-button disabled>Unavailable</sub-button>
<sub-button disabled disabled-reason="Available on the Pro plan">Export data</sub-button>
<sub-button loading loading-label="Saving...">Save</sub-button>
<sub-button href="?c=link">Go to link docs</sub-button>
`,
  props: { selector: 'sub-button', controls: [
    { name: 'variant', type: 'select', options: ['primary', 'secondary', 'tertiary', 'danger'] },
    { name: 'disabled', type: 'boolean' },
    { name: 'loading', type: 'boolean' },
    { name: 'block', type: 'boolean' },
  ] },
  keyboard: [
    ["Tab / Shift+Tab", "Move focus to / from the button"],
    ["Enter, Space", "Activate"],
    ["Enter", "Follow the link when it has an href"],
  ],
  setup(preview, log) {
    let count = 0
    preview.addEventListener('click', (event) => {
      const button = (event.target as Element).closest('sub-button')
      if (button && !button.disabled) {
        count += 1
        log(`${button.textContent?.trim()} activated (${count}).`)
      }
    })
  },
} satisfies Demo
