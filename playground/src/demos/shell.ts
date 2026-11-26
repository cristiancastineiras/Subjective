import { defineShell } from '@sub/core/shell'
import { defineNavMenu } from '@sub/core/nav-menu'
import type { Demo } from '../demo'

export default {
  id: "shell",
  title: "Layout shell",
  group: "Layout",
  description: "App shell: header, sider, content, footer. Real landmarks (or none when embedded).",
  define() {
    defineShell()
    defineNavMenu()
  },
  html: `
<sub-layout embedded class="wide" style="border: 2px solid currentColor; min-block-size: 18rem">
  <strong slot="header">My app</strong>
  <sub-nav-menu slot="sider" label="Sections"><a href="#s1" aria-current="page">Overview</a><a href="#s2">Reports</a></sub-nav-menu>
  <p style="margin: 0">Main content goes here.</p>
  <span slot="footer">2026</span>
</sub-layout>
`,
  tokens: ["shell"],
  props: { selector: 'sub-layout', controls: [{ name: 'sider-open', type: 'boolean' }, { name: 'embedded', type: 'boolean' }] },
} satisfies Demo
