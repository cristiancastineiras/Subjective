import { defineMenu } from '@sub/core/menu'
import type { Demo } from '../demo'

export default {
  id: "menu",
  title: "Menu button",
  group: "Actions",
  description: "Overflow actions for low-frequency, tertiary commands. Never put the primary action here.",
  define: defineMenu,
  html: `
<sub-menu label="More actions">
  <sub-option value="duplicate">Duplicate</sub-option>
  <sub-option value="archive">Archive</sub-option>
  <sub-option href="?c=button">Open button docs</sub-option>
  <sub-option value="delete" disabled>Delete (unavailable)</sub-option>
</sub-menu>
<sub-menu label="Row actions" icon-only>
  <sub-option value="rename">Rename</sub-option>
  <sub-option value="move">Move</sub-option>
</sub-menu>
`,
  keyboard: [
    ["Enter, Space, Down", "Open the menu on the first item"],
    ["Up", "Open on the last item"],
    ["Up / Down", "Move between items"],
    ["Home / End", "First / last item"],
    ["A-Z", "Jump to the item starting with that letter"],
    ["Esc", "Close and return to the trigger"],
    ["Tab", "Close"],
  ],
  setup(preview, log) {
    preview.addEventListener('sub-select', (event) => log(`Chose: ${(event as CustomEvent<{ value: string }>).detail.value}.`))
  },
} satisfies Demo
