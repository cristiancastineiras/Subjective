import { defineSlider } from '@sub/core/slider'
import type { Demo } from '../demo'

export default {
  id: "slider",
  title: "Slider",
  group: "Forms",
  description: "Native range input: arrows adjust, Home/End jump, the value is always shown as text.",
  define: defineSlider,
  html: `
<div class="stack">
  <sub-slider name="volume" label="Volume" value="40" unit="%" hint="Use the arrow keys for fine control"></sub-slider>
  <sub-slider name="temp" label="Temperature" min="10" max="30" value="21" unit=" C" valuetext="21 degrees"></sub-slider>
</div>
`,
  tokens: ["slider", "field"],
  props: { selector: 'sub-slider', controls: [{ name: 'min', type: 'number' }, { name: 'max', type: 'number' }, { name: 'step', type: 'number' }, { name: 'disabled', type: 'boolean' }] },
  keyboard: [
    ["Left / Down", "Decrease"],
    ["Right / Up", "Increase"],
    ["Home / End", "Min / max"],
    ["PageUp / PageDown", "Larger steps"],
  ],
} satisfies Demo
