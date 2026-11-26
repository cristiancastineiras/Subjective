import { defineNavMenu } from '@sub/core/nav-menu'
import type { Demo } from '../demo'

export default {
  id: "nav-menu",
  title: "Nav menu",
  group: "Navigation",
  description: "Site navigation with groups (disclosure pattern, not the ARIA menu role).",
  define: defineNavMenu,
  html: `
<sub-nav-menu label="Main navigation" style="inline-size: 16rem">
  <a href="#nm-dashboard" aria-current="page">Dashboard</a>
  <sub-nav-group label="Reports"><a href="#nm-sales">Sales</a><a href="#nm-traffic">Traffic</a></sub-nav-group>
  <a href="#nm-settings">Settings</a>
</sub-nav-menu>
`,
  tokens: ["nav-menu"],
  props: { selector: 'sub-nav-menu', controls: [{ name: 'orientation', type: 'select', options: ['vertical', 'horizontal'] }] },
  keyboard: [
    ["Tab", "Walk links and group buttons"],
    ["Enter, Space", "Open / close a group"],
  ],
} satisfies Demo
