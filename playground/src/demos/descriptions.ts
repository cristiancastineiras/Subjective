import { defineDescriptions } from '@sub/core/descriptions'
import type { Demo } from '../demo'

export default {
  id: "descriptions",
  title: "Descriptions",
  group: "Data",
  description: "Read-only label/value pairs on a real definition list.",
  define: defineDescriptions,
  html: `
<sub-descriptions class="wide" heading="Order 1042" level="3">
  <sub-desc label="Customer">Ana Ruiz</sub-desc>
  <sub-desc label="Status">Shipped</sub-desc>
  <sub-desc label="Delivery">3-5 days, <a href="#track">track parcel</a></sub-desc>
  <sub-desc label="Total">48.20 EUR</sub-desc>
</sub-descriptions>
`,
  tokens: ["descriptions"],
} satisfies Demo
