import { defineAutocomplete } from '@sub/core/autocomplete'
import type { Demo } from '../demo'

export default {
  id: "autocomplete",
  title: "Autocomplete",
  group: "Forms",
  description: "ARIA combobox. The caret stays in the input, nothing is auto-selected, a choice is committed only with Enter or a click, free text is allowed.",
  define: defineAutocomplete,
  html: `
<div class="stack">
  <sub-autocomplete name="city" label="City" hint="Start typing; suggestions appear from the first letter" autocomplete="address-level2">
    <sub-option value="madrid">Madrid</sub-option>
    <sub-option value="malaga">Malaga</sub-option>
    <sub-option value="manchester">Manchester</sub-option>
    <sub-option value="marseille">Marseille</sub-option>
    <sub-option value="milan" description="Italy">Milan</sub-option>
    <sub-option value="munich" description="Germany">Munich</sub-option>
    <sub-option value="paris">Paris</sub-option>
  </sub-autocomplete>
  <sub-autocomplete id="remote" name="package" label="npm package (remote results)" remote></sub-autocomplete>
</div>
`,
  tokens: ["field"],
  props: { selector: 'sub-autocomplete', controls: [{ name: 'min-chars', type: 'number', min: 0, max: 5 }, { name: 'max-results', type: 'number', min: 1, max: 12 }, { name: 'required', type: 'boolean' }] },
  keyboard: [
    ["Down", "Open the list / next suggestion"],
    ["Up", "Previous suggestion; back to the input"],
    ["Enter", "Choose the highlighted suggestion (never auto-selected)"],
    ["Esc", "Close the list, keep the typed text"],
    ["Tab", "Close the list and move on"],
  ],
  setup(preview, log) {
    const remote = preview.querySelector<HTMLElement & { options: Array<{ value: string }> }>('#remote')
    remote?.addEventListener('sub-search', (event) => {
      const q = (event as CustomEvent<{ query: string }>).detail.query
      setTimeout(() => (remote.options = ['lit', 'litho', 'little-state', 'lite-server'].filter((n) => n.includes(q)).map((value) => ({ value }))), 250)
    })
    preview.addEventListener('sub-select', (event) => log(`Selected: ${(event as CustomEvent<{ label: string }>).detail.label}.`))
  },
} satisfies Demo
