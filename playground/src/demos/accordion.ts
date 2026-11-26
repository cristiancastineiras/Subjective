import { defineAccordion } from '@sub/core/accordion'
import type { Demo } from '../demo'

export default {
  id: "accordion",
  title: "Accordion",
  group: "Disclosure",
  description: "Secondary content. Header is a button inside a heading; the panel is a region that find-in-page can open. Never collapse critical information.",
  define: defineAccordion,
  html: `
<sub-accordion class="wide" expand-all>
  <sub-accordion-item heading="How do I reset my password?" level="3"><p>Use the "Forgot password" link on the sign-in page.</p></sub-accordion-item>
  <sub-accordion-item heading="Can I change my plan later?" level="3" open><p>Yes, at any time from Billing.</p></sub-accordion-item>
  <sub-accordion-item heading="Notification settings" level="3" invalid><p>One of your notification emails is invalid.</p></sub-accordion-item>
</sub-accordion>
`,
  props: { selector: 'sub-accordion', controls: [{ name: 'exclusive', type: 'boolean' }, { name: 'expand-all', type: 'boolean' }] },
  keyboard: [
    ["Tab", "Move between headers (arrows keep scrolling the page)"],
    ["Enter, Space", "Open / close the section"],
  ],
  setup(preview, log) {
    preview.addEventListener('sub-toggle', (event) => {
      const item = event.target as HTMLElement & { heading: string; open: boolean }
      log(`${item.heading}: ${item.open ? 'opened' : 'closed'}.`)
    })
  },
} satisfies Demo
