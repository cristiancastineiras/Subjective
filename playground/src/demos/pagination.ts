import { definePagination } from '@sub/core/pagination'
import type { Demo } from '../demo'

export default {
  id: "pagination",
  title: "Pagination",
  group: "Navigation",
  description: "For goal-driven, structured content. Always says where you are: \"Page 3 of 24\". Compact on narrow containers.",
  define: definePagination,
  html: `
<sub-pagination class="wide" page="3" pages="24" total-items="247" page-size="12" label="Search results"></sub-pagination>
`,
  props: { selector: 'sub-pagination', controls: [{ name: 'page', type: 'number', min: 1, max: 24 }, { name: 'pages', type: 'number', min: 1, max: 99 }, { name: 'siblings', type: 'number', min: 0, max: 3 }] },
  keyboard: [
    ["Tab", "Move between page buttons"],
    ["Enter, Space", "Go to that page"],
  ],
  setup(preview, log) {
    preview.addEventListener('sub-page-change', (event) => log(`Go to page ${(event as CustomEvent<{ page: number }>).detail.page}.`))
  },
} satisfies Demo
