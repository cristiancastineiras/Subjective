import { defineColorPicker } from '@sub/core/color-picker'
import type { Demo } from '../demo'

export default {
  id: "color-picker",
  title: "Color picker",
  group: "Forms",
  description: "Native colour picker plus an editable hex value and named presets.",
  define: defineColorPicker,
  html: `
<div class="stack">
  <sub-color-picker name="brand" label="Brand colour" value="#1d70b8" presets="#1d70b8:Blue,#00703c:Green,#d4351c:Red,#594d00:Brown" hint="Type a hex value or pick one"></sub-color-picker>
</div>
`,
  tokens: ["color-picker", "field"],
  props: { selector: 'sub-color-picker', controls: [{ name: 'disabled', type: 'boolean' }, { name: 'required', type: 'boolean' }] },
  keyboard: [
    ["Tab", "Swatch, hex field, presets"],
    ["Enter, Space", "Open the system picker / choose a preset"],
  ],
} satisfies Demo
