import { defineBorderBeam } from '@sub/core/border-beam'
import { defineCard } from '@sub/core/card'
import type { Demo } from '../demo'

export default {
  id: "border-beam",
  title: "Border beam",
  group: "Content",
  description: "A light that travels around the border of what it wraps. Decorative only; it stops with reduced motion, with animations off and in forced-colors.",
  define() {
    defineBorderBeam()
    defineCard()
  },
  html: `
<sub-border-beam>
  <sub-card heading="New: dark mode" level="3">Switch themes from the header. The beam only draws the eye; the card says everything.</sub-card>
</sub-border-beam>
`,
  tokens: ["border-beam"],
  keyboard: [["Tab", "The beam is not focusable and adds no tab stop"]],
} satisfies Demo
