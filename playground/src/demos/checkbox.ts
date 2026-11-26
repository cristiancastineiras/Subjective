import { defineCheckbox, defineCheckboxGroup } from '@sub/core/checkbox'
import type { Demo } from '../demo'

export default {
  id: "checkbox",
  title: "Checkbox",
  group: "Forms",
  description: "Non-exclusive choice. Visible label on the right, whole row is the target. Groups use fieldset + legend and can add a select-all with an indeterminate state.",
  define() {
    defineCheckbox()
    defineCheckboxGroup()
  },
  html: `
<div class="stack">
  <sub-checkbox name="terms" label="I accept the terms of service" required></sub-checkbox>
  <sub-checkbox-group label="Notify me about" hint="Choose any that apply." select-all="Select all">
    <sub-checkbox name="topics" value="news" label="Product news" checked></sub-checkbox>
    <sub-checkbox name="topics" value="tips" label="Tips and tutorials"></sub-checkbox>
    <sub-checkbox name="topics" value="events" label="Events"></sub-checkbox>
  </sub-checkbox-group>
</div>
`,
  props: { selector: 'sub-checkbox', controls: [{ name: 'required', type: 'boolean' }, { name: 'disabled', type: 'boolean' }, { name: 'indeterminate', type: 'boolean' }] },
  keyboard: [
    ["Tab", "Move between checkboxes"],
    ["Space", "Toggle the focused checkbox"],
  ],
} satisfies Demo
