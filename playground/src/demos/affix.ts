import { defineAffix } from '@sub/core/affix'
import type { Demo } from '../demo'

export default {
  id: "affix",
  title: "Affix",
  group: "Layout",
  description: "Keeps content visible while scrolling (position: sticky) and reports when it is stuck.",
  define: defineAffix,
  html: `
<sub-affix offset-top="0" class="wide"><div class="demo-box" style="background: var(--sub-color-surface)">Sticky bar (scroll the page)</div></sub-affix>
<p class="wide">The bar above sticks to the top of the viewport once you scroll past it.</p>
`,
  tokens: [],
  setup(preview, log) {
    preview.addEventListener('sub-affix-change', (e) => log(`Stuck: ${(e as CustomEvent<{ stuck: boolean }>).detail.stuck}`))
  },
} satisfies Demo
