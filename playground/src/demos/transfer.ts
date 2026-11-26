import { defineTransfer } from '@sub/core/transfer'
import type { Demo } from '../demo'

export default {
  id: "transfer",
  title: "Transfer",
  group: "Forms",
  description: "Move items between two lists with native checkboxes and real buttons; moves are announced.",
  define: defineTransfer,
  html: `
<sub-transfer name="members" label="Project members" hint="Tick people and move them"></sub-transfer>
`,
  tokens: ["transfer", "field"],
  keyboard: [
    ["Tab / Space", "Tick items and Select all"],
    ["Enter on a Move button", "Move the ticked items"],
  ],
  setup(preview, log) {
    const el = preview.querySelector('sub-transfer')
    if (el) {
      el.items = [{ key: 'ana', label: 'Ana Ruiz' }, { key: 'luis', label: 'Luis Gil' }, { key: 'mei', label: 'Mei Chen' }, { key: 'omar', label: 'Omar Said' }, { key: 'zoe', label: 'Zoe Park', disabled: true }]
      el.value = ['mei']
      el.titles = ['Available', 'On the project']
      el.addEventListener('change', () => log(`On the project: ${el.value.join(', ') || '(nobody)'}`))
    }
  },
} satisfies Demo
