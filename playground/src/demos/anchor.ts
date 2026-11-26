import { defineAnchor } from '@sub/core/anchor'
import type { Demo } from '../demo'

export default {
  id: "anchor",
  title: "Anchor",
  group: "Navigation",
  description: "\"On this page\": the current section is marked; a jump also moves focus to the heading.",
  define: defineAnchor,
  html: `
<div class="row wide" style="align-items: flex-start; gap: 2rem">
  <sub-anchor label="On this page" style="min-inline-size: 12rem">
    <a href="#an-intro">Introduction</a><a href="#an-usage">Usage</a><a href="#an-api">API</a>
  </sub-anchor>
  <div style="flex: 1; min-inline-size: 14rem">
    <h3 id="an-intro">Introduction</h3><p>Short section of text that explains what this is about.</p>
    <h3 id="an-usage">Usage</h3><p>How to use it in a page, with a real example.</p>
    <h3 id="an-api">API</h3><p>Attributes, events and tokens.</p>
  </div>
</div>
`,
  tokens: ["anchor"],
  keyboard: [
    ["Tab", "Walk the links"],
    ["Enter", "Jump to the section AND move focus to its heading"],
  ],
} satisfies Demo
