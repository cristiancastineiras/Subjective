import { defineTree } from '@sub/core/tree'
import type { Demo } from '../demo'

export default {
  id: "tree",
  title: "Tree",
  group: "Data",
  description: "ARIA tree: one tab stop, arrows move/expand/collapse, type to jump.",
  define: defineTree,
  html: `
<sub-tree label="Project files" style="max-inline-size: 24rem"></sub-tree>
`,
  tokens: ["tree"],
  keyboard: [
    ["Tab", "Enter / leave the tree (one tab stop)"],
    ["Up / Down", "Previous / next visible item"],
    ["Right / Left", "Expand or go in / collapse or go to parent"],
    ["Home / End", "First / last"],
    ["Enter, Space", "Select"],
    ["* ", "Expand all siblings"],
    ["A-Z", "Jump by letter"],
  ],
  setup(preview, log) {
    const tree = preview.querySelector('sub-tree')
    if (!tree) return
    tree.nodes = [
      { id: 'src', label: 'src', children: [{ id: 'comp', label: 'components', children: [{ id: 'btn', label: 'button.ts' }, { id: 'inp', label: 'input.ts' }] }, { id: 'main', label: 'main.ts' }] },
      { id: 'docs', label: 'docs', children: [{ id: 'readme', label: 'README.md' }] },
      { id: 'pkg', label: 'package.json' },
    ]
    tree.expanded = ['src']
    tree.addEventListener('sub-select', (e) => log(`Selected: ${(e as CustomEvent<{ label: string }>).detail.label}`))
  },
} satisfies Demo
