import { defineMasonry } from '@sub/core/masonry'
import type { Demo } from '../demo'

export default {
  id: "masonry",
  title: "Masonry",
  group: "Layout",
  description: "Uneven items in columns with CSS only; DOM order is reading order.",
  define: defineMasonry,
  html: `
<sub-masonry class="wide">
  <div class="demo-box" style="min-block-size: 6rem">Short</div><div class="demo-box" style="min-block-size: 10rem">Tall</div>
  <div class="demo-box" style="min-block-size: 8rem">Medium</div><div class="demo-box" style="min-block-size: 5rem">Short</div>
  <div class="demo-box" style="min-block-size: 9rem">Medium</div>
</sub-masonry>
`,
  tokens: ["masonry"],
} satisfies Demo
