import { defineTable } from '@sub/core/table'
import { defineBadge } from '@sub/core/badge'
import { html } from 'lit'
import type { Demo } from '../demo'

export default {
  id: "table",
  title: "Table",
  group: "Data",
  description: "Accessible data table: caption, scoped headers, sortable columns (aria-sort), selectable rows, expandable sub-rows, keyboard-scrollable.",
  define() {
    defineTable()
    defineBadge()
  },
  html: `
<div class="stack">
  <sub-table class="wide" caption="Projects" selectable striped></sub-table>
  <sub-table class="wide" id="plan" caption="Project plan (with sub-rows)" selectable expand-all></sub-table>
</div>
`,
  tokens: ["table"],
  props: { selector: '#plan', controls: [{ name: 'selectable', type: 'boolean' }, { name: 'striped', type: 'boolean' }, { name: 'caption', type: 'text' }] },
  keyboard: [
    ["Tab", "Reach the scroll region, sort buttons and row checkboxes"],
    ["Enter, Space", "Sort / tick / open or close the sub-rows"],
    ["Arrow keys", "Scroll the focused region sideways"],
  ],
  setup(preview, log) {
    const table = preview.querySelector<HTMLElementTagNameMap['sub-table']>('sub-table:not(#plan)')
    const plan = preview.querySelector<HTMLElementTagNameMap['sub-table']>('#plan')
    if (!table || !plan) return
    table.columns = [
      { key: 'name', label: 'Project', sortable: true },
      { key: 'owner', label: 'Owner', sortable: true },
      { key: 'status', label: 'Status', sortable: true, render: (r) => html`<sub-badge variant=${String(r.tone)}>${String(r.status)}</sub-badge>` },
      { key: 'budget', label: 'Budget (EUR)', sortable: true, align: 'end' },
    ]
    table.rows = [
      { id: 1, name: 'Atlas', owner: 'Ana Ruiz', status: 'On track', tone: 'success', budget: 12000 },
      { id: 2, name: 'Borealis', owner: 'Luis Gil', status: 'At risk', tone: 'warning', budget: 8400 },
      { id: 3, name: 'Cobalt', owner: 'Mei Chen', status: 'Late', tone: 'danger', budget: 22500 },
      { id: 4, name: 'Delta', owner: 'Omar Said', status: 'Planned', tone: 'neutral', budget: 5000 },
    ]
    plan.columns = [
      { key: 'task', label: 'Task', sortable: true },
      { key: 'owner', label: 'Owner', sortable: true },
      { key: 'hours', label: 'Hours', sortable: true, align: 'end' },
    ]
    plan.rows = [
      { id: 'p1', task: 'Phase 1: Discovery', owner: 'Ana Ruiz', hours: 60, children: [
        { id: 'p1a', task: 'User interviews', owner: 'Ana Ruiz', hours: 24 },
        { id: 'p1b', task: 'Audit of the current product', owner: 'Mei Chen', hours: 36 },
      ] },
      { id: 'p2', task: 'Phase 2: Design', owner: 'Luis Gil', hours: 120, children: [
        { id: 'p2a', task: 'Wireframes', owner: 'Luis Gil', hours: 40 },
        { id: 'p2b', task: 'Visual design', owner: 'Luis Gil', hours: 50, children: [
          { id: 'p2b1', task: 'Colour and type', owner: 'Omar Said', hours: 20 },
          { id: 'p2b2', task: 'Components', owner: 'Omar Said', hours: 30 },
        ] },
        { id: 'p2c', task: 'Accessibility review', owner: 'Mei Chen', hours: 30 },
      ] },
      { id: 'p3', task: 'Phase 3: Launch', owner: 'Omar Said', hours: 24 },
    ]
    plan.addEventListener('sub-expand', (e) => log(`${(e as CustomEvent<{ key: string; expanded: boolean }>).detail.key} ${(e as CustomEvent<{ expanded: boolean }>).detail.expanded ? 'opened' : 'closed'}.`))
    table.addEventListener('sub-sort', (e) => log(`Sorted by ${(e as CustomEvent<{ key: string; direction: string }>).detail.key} (${(e as CustomEvent<{ direction: string }>).detail.direction}).`))
    table.addEventListener('sub-select', (e) => log(`${(e as CustomEvent<{ selected: string[] }>).detail.selected.length} row(s) selected.`))
  },
} satisfies Demo
