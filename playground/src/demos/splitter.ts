import { defineSplitter } from '@sub/core/splitter'
import type { Demo } from '../demo'

export default {
  id: "splitter",
  title: "Splitter",
  group: "Layout",
  description: "Two resizable panes. The handle is a focusable separator with a full keyboard alternative.",
  define: defineSplitter,
  html: `
<sub-splitter class="wide" label="Resize the list and the detail" value="40" style="min-block-size: 10rem; border: 2px solid currentColor">
  <div slot="start" class="demo-box" style="border: 0"><strong>List</strong></div>
  <div slot="end" class="demo-box" style="border: 0"><strong>Detail</strong></div>
</sub-splitter>
`,
  tokens: ["splitter"],
  props: { selector: 'sub-splitter', controls: [{ name: 'orientation', type: 'select', options: ['horizontal', 'vertical'] }, { name: 'value', type: 'number', min: 10, max: 90 }] },
  keyboard: [
    ["Tab", "Focus the handle"],
    ["Left / Right (Up / Down)", "Resize by 1%; Shift by 10%"],
    ["Home / End", "Min / max"],
    ["Enter", "Collapse / restore the first pane"],
  ],
  setup(preview, log) {
    preview.addEventListener('sub-resize', (e) => log(`First pane: ${(e as CustomEvent<{ value: number }>).detail.value}%`))
  },
} satisfies Demo
