import { defineRadioGroup } from '@sub/core/radio'
import type { Demo } from '../demo'

export default {
  id: "radio-group",
  title: "Radio group",
  group: "Forms",
  description: "Exactly one choice from 2-6 options. Native radios in a fieldset: Tab enters the group, arrows move. A disabled option explains why.",
  define: defineRadioGroup,
  html: `
<div class="stack">
  <sub-radio-group name="delivery" label="Delivery speed" required>
    <sub-option value="standard" description="3-5 days, free">Standard</sub-option>
    <sub-option value="express" description="1-2 days, 6.90">Express</sub-option>
    <sub-option value="overnight" description="Not available for your location" disabled>Overnight</sub-option>
  </sub-radio-group>
  <sub-radio-group name="plan" label="Plan" variant="card" value="pro">
    <sub-option value="free" description="For personal projects">Free</sub-option>
    <sub-option value="pro" description="For small teams">Pro</sub-option>
  </sub-radio-group>
  <sub-radio-group name="newsletter" label="Subscribe to the newsletter" orientation="horizontal">
    <sub-option value="yes">Yes</sub-option>
    <sub-option value="no">No</sub-option>
  </sub-radio-group>
</div>
`,
  tokens: ["radio"],
  props: { selector: 'sub-radio-group', controls: [{ name: 'variant', type: 'select', options: ['default', 'card'] }, { name: 'orientation', type: 'select', options: ['vertical', 'horizontal'] }, { name: 'required', type: 'boolean' }] },
  keyboard: [
    ["Tab", "Enter / leave the group (one tab stop)"],
    ["Up / Down / Left / Right", "Move and select the previous / next option"],
    ["Space", "Select the focused option"],
  ],
} satisfies Demo
