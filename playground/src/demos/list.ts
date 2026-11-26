import { defineList } from '@sub/core/list'
import { defineAvatar } from '@sub/core/avatar'
import { defineButton } from '@sub/core/button'
import type { Demo } from '../demo'

export default {
  id: "list",
  title: "List",
  group: "Data",
  description: "List of items with start/end slots. Actions inside are real, named controls.",
  define() {
    defineList()
    defineAvatar()
    defineButton()
  },
  html: `
<sub-list class="wide" label="Team" bordered>
  <sub-list-item><sub-avatar slot="start" name="Ana Ruiz" decorative></sub-avatar><strong>Ana Ruiz</strong><br>Design lead<sub-button slot="end" variant="secondary">Message</sub-button></sub-list-item>
  <sub-list-item><sub-avatar slot="start" name="Luis Gil" decorative></sub-avatar><strong>Luis Gil</strong><br>Engineer<sub-button slot="end" variant="secondary">Message</sub-button></sub-list-item>
  <sub-list-item><sub-avatar slot="start" name="Mei Chen" decorative></sub-avatar><strong>Mei Chen</strong><br>Researcher<sub-button slot="end" variant="secondary">Message</sub-button></sub-list-item>
</sub-list>
`,
  tokens: ["list"],
  props: { selector: 'sub-list', controls: [{ name: 'bordered', type: 'boolean' }] },
} satisfies Demo
