import { defineTimeline } from '@sub/core/timeline'
import type { Demo } from '../demo'

export default {
  id: "timeline",
  title: "Timeline",
  group: "Data",
  description: "Chronological list on an ordered list. Status is icon + a hidden word.",
  define: defineTimeline,
  html: `
<sub-timeline class="wide" label="Order history">
  <sub-timeline-item time="2026-11-20" status="done" heading="Order placed">We received your order.</sub-timeline-item>
  <sub-timeline-item time="2026-11-22" status="done" heading="Packed">Ready to leave the warehouse.</sub-timeline-item>
  <sub-timeline-item time="2026-11-26" status="current" heading="In transit">With the carrier.</sub-timeline-item>
  <sub-timeline-item time="2026-11-28" status="todo" heading="Delivery">Estimated.</sub-timeline-item>
</sub-timeline>
`,
  tokens: ["timeline"],
} satisfies Demo
