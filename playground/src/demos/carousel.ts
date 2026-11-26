import { defineCarousel } from '@sub/core/carousel'
import type { Demo } from '../demo'

export default {
  id: "carousel",
  title: "Carousel",
  group: "Data",
  description: "ARIA carousel: labelled slides, real controls, autoplay off by default and always pausable.",
  define: defineCarousel,
  html: `
<sub-carousel class="wide" label="Featured guides" autoplay>
  <div class="demo-box"><h3 style="margin: 0 0 0.5rem">Accessible forms</h3><p style="margin: 0">Labels, hints and errors that work for everyone.</p></div>
  <div class="demo-box"><h3 style="margin: 0 0 0.5rem">Keyboard first</h3><p style="margin: 0">Every control reachable and operable.</p></div>
  <div class="demo-box"><h3 style="margin: 0 0 0.5rem">Readable type</h3><p style="margin: 0">Sizes, line length and spacing that last.</p></div>
</sub-carousel>
`,
  tokens: ["carousel"],
  props: { selector: 'sub-carousel', controls: [{ name: 'autoplay', type: 'boolean' }, { name: 'interval', type: 'number', min: 2000, max: 10000, step: 500 }] },
  keyboard: [
    ["Tab", "Previous, Pause, slide buttons, Next"],
    ["Enter, Space", "Activate"],
  ],
} satisfies Demo
