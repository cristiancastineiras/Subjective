import { defineDropdown } from '@sub/core/dropdown'
import type { Demo } from '../demo'

export default {
  id: "dropdown",
  title: "Dropdown",
  group: "Actions",
  description: "Menu button for actions (SUB Dropdown). Same accessible menu as the Menu button.",
  define: defineDropdown,
  html: `
<sub-dropdown label="Account">
  <sub-option value="profile">Profile</sub-option>
  <sub-option value="billing">Billing</sub-option>
  <sub-option value="signout">Sign out</sub-option>
</sub-dropdown>
`,
  tokens: ["menu"],
  keyboard: [
    ["Enter, Space, Down", "Open on the first item"],
    ["Up / Down / Home / End", "Move"],
    ["Esc", "Close and return to the trigger"],
  ],
  setup(preview, log) {
    preview.addEventListener('sub-select', (e) => log(`Chose: ${(e as CustomEvent<{ value: string }>).detail.value}.`))
  },
} satisfies Demo
