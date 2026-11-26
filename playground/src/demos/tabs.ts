import { defineTabs } from '@sub/core/tabs'
import type { Demo } from '../demo'

export default {
  id: "tabs",
  title: "Tabs",
  group: "Navigation",
  description: "Parallel content at the same level (2-7 tabs). Roving tabindex; arrows move, Tab goes into the panel. The selected tab is bolder AND has a bar.",
  define: defineTabs,
  html: `
<sub-tabs class="wide" label="Account settings">
  <sub-tab-panel label="Profile"><p>Your name, photo and public details.</p></sub-tab-panel>
  <sub-tab-panel label="Security"><p>Password and two-step verification.</p></sub-tab-panel>
  <sub-tab-panel label="Notifications"><p>Choose what we email you about.</p></sub-tab-panel>
</sub-tabs>
`,
  props: { selector: 'sub-tabs', controls: [{ name: 'activation', type: 'select', options: ['automatic', 'manual'] }, { name: 'selected', type: 'number', min: 0, max: 2 }] },
  keyboard: [
    ["Tab", "Into the tab list (selected tab), then into the panel"],
    ["Left / Right", "Previous / next tab (RTL-aware)"],
    ["Home / End", "First / last tab"],
    ["Enter, Space", "Activate the focused tab (manual activation)"],
  ],
  setup(preview, log) {
    preview.addEventListener('sub-tab-change', (event) => log(`Tab: ${(event as CustomEvent<{ label: string }>).detail.label}.`))
  },
} satisfies Demo
