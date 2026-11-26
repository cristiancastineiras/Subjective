import { defineMentions } from '@sub/core/mentions'
import type { Demo } from '../demo'

export default {
  id: "mentions",
  title: "Mentions",
  group: "Forms",
  description: "A textarea that suggests people while you type @. The caret stays in the text; the list is a top-layer panel next to the caret.",
  define: defineMentions,
  html: `
<div class="stack">
  <sub-mentions name="comment" label="Comment" hint="Type @ and a name. Down moves in the list, Enter inserts." rows="4" max-results="6">
    <sub-option value="ana" description="Design">Ana Ruiz</sub-option>
    <sub-option value="luis" description="Engineering">Luis Gil</sub-option>
    <sub-option value="mei" description="Research">Mei Chen</sub-option>
    <sub-option value="omar" description="Engineering">Omar Said</sub-option>
    <sub-option value="zoe" description="Support" disabled>Zoe Park (away)</sub-option>
  </sub-mentions>
  <sub-mentions name="note" label="Note with tags" hint="Two triggers: @ for people, # for topics" prefix="@#" rows="3">
    <sub-option value="ana">Ana Ruiz</sub-option>
    <sub-option value="a11y">Accessibility</sub-option>
    <sub-option value="release">Release</sub-option>
  </sub-mentions>
</div>
`,
  tokens: ["mentions", "listbox", "field"],
  props: { selector: 'sub-mentions', controls: [{ name: 'rows', type: 'number', min: 2, max: 10 }, { name: 'max-results', type: 'number', min: 1, max: 12 }, { name: 'required', type: 'boolean' }] },
  keyboard: [
    ["@ (then letters)", "Open the suggestions; keep typing to filter"],
    ["Down / Up", "Move in the list (nothing is highlighted until you do)"],
    ["Enter", "Insert the highlighted mention (otherwise a new line)"],
    ["Esc", "Close the list and keep the text"],
    ["Tab", "Close the list and move on"],
  ],
  setup(preview, log) {
    preview.addEventListener('sub-select', (event) => {
      const d = (event as CustomEvent<{ value: string; prefix: string }>).detail
      log(`Mentioned ${d.prefix}${d.value}.`)
    })
  },
} satisfies Demo
