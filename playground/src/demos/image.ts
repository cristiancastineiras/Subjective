import { defineImage } from '@sub/core/image'
import type { Demo } from '../demo'

export default {
  id: "image",
  title: "Image",
  group: "Content",
  description: "An image cannot ship without a text decision: describe its purpose, or mark it decorative.",
  define: defineImage,
  html: `
<div class="stack">
  <sub-image width="320" height="120" caption="Figure 1. Monthly signups"
    alt="Line chart: signups grew from 120 in January to 480 in June"
    src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 320 120'%3E%3Crect width='320' height='120' fill='%23e8f1f8'/%3E%3Cpath d='M10 100 L90 80 L170 70 L250 40 L310 20' fill='none' stroke='%23144e81' stroke-width='6'/%3E%3C/svg%3E"></sub-image>
  <sub-image width="80" height="30" decorative
    src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 80 30'%3E%3Crect width='80' height='30' fill='%23e8e8e8'/%3E%3C/svg%3E"></sub-image>
</div>
`,
} satisfies Demo
