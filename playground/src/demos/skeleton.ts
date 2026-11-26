import { defineSkeleton } from '@sub/core/skeleton'
import type { Demo } from '../demo'

export default {
  id: "skeleton",
  title: "Skeleton",
  group: "Feedback",
  description: "Placeholder that matches the real layout. A named skeleton is one busy status; an unnamed one is decorative.",
  define: defineSkeleton,
  html: `
<div class="stack wide">
  <sub-skeleton label="Loading projects" lines="3"></sub-skeleton>
  <div class="row"><sub-skeleton variant="avatar"></sub-skeleton></div>
  <sub-skeleton variant="block"></sub-skeleton>
</div>
`,
  props: { selector: 'sub-skeleton', controls: [{ name: 'lines', type: 'number', min: 1, max: 8 }, { name: 'variant', type: 'select', options: ['text', 'avatar', 'block'] }] },
} satisfies Demo
