import { defineBreadcrumbs } from '@sub/core/breadcrumbs'
import type { Demo } from '../demo'

export default {
  id: "breadcrumbs",
  title: "Breadcrumbs",
  group: "Navigation",
  description: "Path for hierarchies of 3+ levels. The last item is the current page. On narrow containers only the parent shows.",
  define: defineBreadcrumbs,
  html: `
<sub-breadcrumbs class="wide" label="Product breadcrumb">
  <a href="?c=button">Home</a><a href="?c=tabs">Footwear</a><a href="?c=menu">Running shoes</a><span>Trail shoes</span>
</sub-breadcrumbs>
`,
  keyboard: [
    ["Tab", "Move through the links"],
    ["Enter", "Follow a link"],
  ],
} satisfies Demo
