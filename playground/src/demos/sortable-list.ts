import { defineSortableList } from '@sub/core/sortable-list'
import type { Demo } from '../demo'

export default {
  id: "sortable-list",
  title: "Sortable list",
  group: "Patterns",
  description: "Reorder with the pointer OR the keyboard OR visible Move up/down buttons. Every step is announced and focus follows the item.",
  define: defineSortableList,
  html: `
<sub-sortable-list class="wide" label="Priorities">
  <sub-sortable-item label="Write the spec">Write the spec</sub-sortable-item>
  <sub-sortable-item label="Review the design">Review the design</sub-sortable-item>
  <sub-sortable-item label="Build the prototype">Build the prototype</sub-sortable-item>
  <sub-sortable-item label="Test with users">Test with users</sub-sortable-item>
</sub-sortable-list>
`,
  keyboard: [
    ["Space, Enter (on the handle)", "Pick up / drop"],
    ["Up / Down", "Move the picked-up item"],
    ["Esc", "Cancel and return to the original position"],
    ["Tab", "Reach the Move up / Move down buttons"],
  ],
  setup(preview, log) {
    preview.addEventListener('sub-reorder', (event) => log(`Order: ${(event as CustomEvent<{ labels: string[] }>).detail.labels.join(' > ')}`))
  },
} satisfies Demo
