import { defineLink } from '@sub/core/link'
import type { Demo } from '../demo'

export default {
  id: "link",
  title: "Link",
  group: "Actions",
  description: "Navigation. Always underlined, visited state distinct, meaningful text out of context. External links say they open a new tab.",
  define: defineLink,
  html: `
<p class="wide">Read our <sub-link href="?c=button">button guidelines</sub-link> before adding a new action, or
download the <sub-link href="#checklist" download="checklist.pdf">accessibility checklist (PDF, 2 MB)</sub-link>.
See also the <sub-link href="https://www.w3.org/WAI/ARIA/apg/" external>ARIA Authoring Practices</sub-link>.</p>
`,
  keyboard: [
    ["Tab", "Move focus to the link"],
    ["Enter", "Follow the link (Space does not activate links)"],
  ],
} satisfies Demo
