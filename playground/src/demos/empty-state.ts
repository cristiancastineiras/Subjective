import { defineEmptyState } from '@sub/core/empty-state'
import { defineButton } from '@sub/core/button'
import { defineChip } from '@sub/core/chip'
import type { Demo } from '../demo'

export default {
  id: "empty-state",
  title: "Empty state",
  group: "Feedback",
  description: "Why it is empty and what to do next: one specific primary action. Distinct copy for first use, no results, filtered and load error.",
  define() {
    defineEmptyState()
    defineButton()
    defineChip()
  },
  html: `
<div class="stack wide" style="max-inline-size: none">
  <sub-empty-state heading="You do not have any projects yet">
    Projects you create will appear here.
    <sub-button slot="actions">Create your first project</sub-button>
  </sub-empty-state>
  <sub-empty-state variant="no-results" heading="No results for 'blue running shoes'">
    Check the spelling or try a broader search.
    <sub-button slot="actions" variant="secondary">Clear search</sub-button>
  </sub-empty-state>
  <sub-empty-state variant="filtered" heading="No items match your current filters">
    <sub-chip removable>In stock</sub-chip> <sub-chip removable>Under 50</sub-chip>
    <sub-button slot="actions" variant="secondary">Clear all filters</sub-button>
  </sub-empty-state>
  <sub-empty-state variant="error" heading="We could not load your projects">
    Check your connection and try again.
    <sub-button slot="actions">Try again</sub-button>
  </sub-empty-state>
</div>
`,
  props: { selector: 'sub-empty-state', controls: [{ name: 'variant', type: 'select', options: ['first-use', 'no-results', 'filtered', 'error'] }] },
} satisfies Demo
