import { defineSwitch } from '@sub/core/switch'
import type { Demo } from '../demo'

export default {
  id: "switch",
  title: "Switch",
  group: "Forms",
  description: "Persistent setting that applies immediately. The label names the setting, never the state; state is position + text, not colour alone.",
  define: defineSwitch,
  html: `
<div class="stack">
  <sub-switch label="Email notifications" checked></sub-switch>
  <sub-switch label="Dark mode"></sub-switch>
  <sub-switch label="Auto-save" disabled></sub-switch>
</div>
`,
  props: { selector: 'sub-switch', controls: [{ name: 'checked', type: 'boolean' }, { name: 'disabled', type: 'boolean' }] },
  keyboard: [
    ["Tab", "Focus the switch"],
    ["Space, Enter", "Toggle it"],
  ],
  setup(preview, log) {
    preview.addEventListener('change', (event) => {
      const el = event.target as HTMLElement & { label: string; checked: boolean }
      log(`${el.label} turned ${el.checked ? 'on' : 'off'}.`)
    })
  },
} satisfies Demo
