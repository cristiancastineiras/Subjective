import { defineCascader } from '@sub/core/cascader'
import type { Demo } from '../demo'

export default {
  id: "cascader",
  title: "Cascader",
  group: "Forms",
  description: "Hierarchical choice as chained selects (country > region > city).",
  define: defineCascader,
  html: `
<div class="stack">
  <sub-cascader name="place" label="Location" hint="Choose a country, then a region" required></sub-cascader>
</div>
`,
  tokens: ["cascader", "field"],
  keyboard: [
    ["Tab", "Move between levels"],
    ["Up / Down / type", "Choose in the focused select"],
  ],
  setup(preview, log) {
    const el = preview.querySelector('sub-cascader')
    if (el) {
      el.levels = ['Country', 'Region', 'City']
      el.options = [
        { value: 'es', label: 'Spain', children: [{ value: 'md', label: 'Madrid', children: [{ value: 'mad', label: 'Madrid' }, { value: 'alc', label: 'Alcala' }] }, { value: 'ct', label: 'Catalonia', children: [{ value: 'bcn', label: 'Barcelona' }] }] },
        { value: 'fr', label: 'France', children: [{ value: 'idf', label: 'Ile-de-France', children: [{ value: 'par', label: 'Paris' }] }] },
      ]
      el.addEventListener('change', () => log(`Path: ${el.value || '(none)'}`))
    }
  },
} satisfies Demo
