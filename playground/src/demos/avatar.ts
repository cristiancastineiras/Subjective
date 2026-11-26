import { defineAvatar } from '@sub/core/avatar'
import type { Demo } from '../demo'

export default {
  id: "avatar",
  title: "Avatar",
  group: "Data",
  description: "Person or entity. Always named; falls back to initials when the image fails.",
  define: defineAvatar,
  html: `
<sub-avatar name="Ana Ruiz" size="xs"></sub-avatar>
<sub-avatar name="Ana Ruiz" size="sm"></sub-avatar>
<sub-avatar name="Luis Gil" size="md"></sub-avatar>
<sub-avatar name="Mei Chen" size="lg"></sub-avatar>
<sub-avatar name="Omar Said" size="xl" src="/missing.png"></sub-avatar>
`,
  tokens: ["avatar"],
  props: { selector: 'sub-avatar', controls: [{ name: 'size', type: 'select', options: ['xs', 'sm', 'md', 'lg', 'xl'] }, { name: 'name', type: 'text' }] },
} satisfies Demo
