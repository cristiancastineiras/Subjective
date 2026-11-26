import { defineText } from '@sub/core/text'
import type { Demo } from '../demo'

export default {
  id: "text",
  title: "Text",
  group: "Content",
  description: "Inline text with the right element: code, mark, strike. Tone is never the only signal.",
  define: defineText,
  html: `
<p class="wide">Press <sub-text code>Ctrl+K</sub-text> to search. <sub-text tone="muted">Secondary note.</sub-text>
<sub-text tone="danger" strong>Failed:</sub-text> the file is too large. <sub-text mark>Important</sub-text> and <sub-text strike>removed</sub-text>.
Order id <sub-text code copyable>ORD-1042</sub-text></p>
`,
  tokens: ["text"],
  props: { selector: 'sub-text', controls: [{ name: 'tone', type: 'select', options: ['default', 'muted', 'danger', 'success', 'warning', 'info'] }, { name: 'size', type: 'select', options: ['xs', 'sm', 'md', 'lg', 'xl'] }, { name: 'strong', type: 'boolean' }] },
} satisfies Demo
