import { defineCard } from '@sub/core/card'
import { defineButton } from '@sub/core/button'
import { defineBadge } from '@sub/core/badge'
import type { Demo } from '../demo'

export default {
  id: "card",
  title: "Card",
  group: "Data",
  description: "A self-contained chunk of content (an article) with a heading, extra actions and a footer.",
  define() {
    defineCard()
    defineButton()
    defineBadge()
  },
  html: `
<sub-card heading="Atlas redesign" level="3" style="max-inline-size: 26rem">
  <sub-badge slot="extra" variant="success">On track</sub-badge>
  <p style="margin: 0">Migrating the dashboard to the new design system. Next review on Friday.</p>
  <sub-button slot="footer" variant="secondary">Open project</sub-button>
</sub-card>
`,
  tokens: ["card"],
  props: { selector: 'sub-card', controls: [{ name: 'heading', type: 'text' }, { name: 'level', type: 'number', min: 2, max: 6 }] },
} satisfies Demo
