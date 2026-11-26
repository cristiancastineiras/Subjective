import { defineUpload } from '@sub/core/upload'
import type { Demo } from '../demo'

export default {
  id: "upload",
  title: "Upload",
  group: "Forms",
  description: "A real file input behind a labelled button; drag and drop is only an extra. Problems are written and announced.",
  define: defineUpload,
  html: `
<div class="stack">
  <sub-upload name="docs" label="Supporting documents" hint="PDF or images, up to 2 MB each" accept="application/pdf,image/*" multiple max-size-mb="2" max-files="3"></sub-upload>
</div>
`,
  tokens: ["upload", "field"],
  props: { selector: 'sub-upload', controls: [{ name: 'multiple', type: 'boolean' }, { name: 'required', type: 'boolean' }, { name: 'max-files', type: 'number', min: 0, max: 10 }] },
  keyboard: [
    ["Tab", "Focus the file button"],
    ["Enter, Space", "Open the file dialog"],
    ["Tab to a remove button + Enter", "Remove that file"],
  ],
  setup(preview, log) {
    preview.addEventListener('sub-files', (e) => log(`${(e as CustomEvent<{ files: File[] }>).detail.files.length} file(s) selected.`))
  },
} satisfies Demo
