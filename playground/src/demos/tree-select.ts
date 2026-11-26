import { defineTreeSelect } from '@sub/core/tree-select'
import type { Demo } from '../demo'

const nodes = [
  { value: 'eu', label: 'Europe', children: [
    { value: 'es', label: 'Spain', children: [{ value: 'mad', label: 'Madrid' }, { value: 'bcn', label: 'Barcelona' }, { value: 'vlc', label: 'Valencia' }] },
    { value: 'fr', label: 'France', children: [{ value: 'par', label: 'Paris' }, { value: 'lyo', label: 'Lyon' }] },
    { value: 'de', label: 'Germany', children: [{ value: 'ber', label: 'Berlin' }, { value: 'mun', label: 'Munich' }] },
  ] },
  { value: 'am', label: 'Americas', children: [
    { value: 'us', label: 'United States', children: [{ value: 'nyc', label: 'New York' }, { value: 'sfo', label: 'San Francisco' }] },
    { value: 'mx', label: 'Mexico', children: [{ value: 'cdmx', label: 'Mexico City' }, { value: 'gdl', label: 'Guadalajara', disabled: true }] },
  ] },
  { value: 'as', label: 'Asia', children: [{ value: 'jp', label: 'Japan', children: [{ value: 'tyo', label: 'Tokyo' }, { value: 'osa', label: 'Osaka' }] }] },
]

export default {
  id: "tree-select",
  title: "Tree select",
  group: "Forms",
  description: "A field that opens a tree (regions > countries > cities). Single or multiple, searchable, leaf-only; a full-screen sheet on phones.",
  define: defineTreeSelect,
  html: `
<div class="stack">
  <sub-tree-select id="single" name="city" label="City" hint="Only cities can be chosen" placeholder="Choose a city" leaf-only searchable clearable></sub-tree-select>
  <sub-tree-select id="multi" name="places" label="Places" hint="Regions and countries can be chosen too" placeholder="Choose places" multiple expand-all></sub-tree-select>
</div>
`,
  tokens: ["tree-select", "listbox", "field"],
  props: { selector: '#single', controls: [{ name: 'searchable', type: 'boolean' }, { name: 'clearable', type: 'boolean' }, { name: 'leaf-only', type: 'boolean' }, { name: 'multiple', type: 'boolean' }, { name: 'required', type: 'boolean' }] },
  keyboard: [
    ["Down / Up", "Open the tree; move to the next / previous item"],
    ["Right", "Open a branch, or go into its first child"],
    ["Left", "Close a branch, or go to its parent"],
    ["Home / End", "First / last visible item"],
    ["Enter or Space", "Choose (leaf-only: a branch just opens or closes)"],
    ["Esc", "Close and keep focus on the field"],
  ],
  setup(preview, log) {
    for (const el of preview.querySelectorAll('sub-tree-select')) el.nodes = nodes
    preview.addEventListener('change', (event) => {
      const el = event.target as HTMLElement & { value: string; label: string }
      if (el.localName === 'sub-tree-select') log(`${el.label}: ${el.value || 'nothing'}`)
    })
  },
} satisfies Demo
