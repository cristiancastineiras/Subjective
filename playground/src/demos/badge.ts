import { defineBadge } from '@sub/core/badge'
import type { Demo } from '../demo'

export default {
  id: "badge",
  title: "Badge",
  group: "Feedback",
  description: "Status label: colour + icon + text, never colour alone.",
  define: defineBadge,
  html: `
<sub-badge>Draft</sub-badge>
<sub-badge variant="info">In review</sub-badge>
<sub-badge variant="success">Published</sub-badge>
<sub-badge variant="warning">Expires soon</sub-badge>
<sub-badge variant="danger">Overdue</sub-badge>
`,
  props: { selector: 'sub-badge', controls: [{ name: 'variant', type: 'select', options: ['neutral', 'info', 'success', 'warning', 'danger'] }] },
} satisfies Demo
