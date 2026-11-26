import { defineInputNumber } from '@sub/core/input-number'
import type { Demo } from '../demo'

export default {
  id: "input-number",
  title: "Input number",
  group: "Forms",
  description: "Spinbutton for real quantities: native number input plus labelled +/- buttons.",
  define: defineInputNumber,
  html: `
<div class="stack">
  <sub-input-number name="qty" label="Quantity" min="1" max="10" value="2" hint="Between 1 and 10" required></sub-input-number>
  <sub-input-number name="price" label="Price" step="0.5" value="9.5"></sub-input-number>
</div>
`,
  tokens: ["input-number", "field"],
  props: { selector: 'sub-input-number', controls: [{ name: 'controls', type: 'boolean' }, { name: 'disabled', type: 'boolean' }, { name: 'required', type: 'boolean' }] },
  keyboard: [
    ["Up / Down", "Increase / decrease by step"],
    ["Tab", "Reach the - and + buttons"],
    ["Enter, Space", "Press a button"],
  ],
} satisfies Demo
