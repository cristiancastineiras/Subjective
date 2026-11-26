import { defineButton } from '@sub/core/button'
import { defineDialog } from '@sub/core/dialog'
import { defineInput } from '@sub/core/input'
import type { Demo } from '../demo'

export default {
  id: "dialog",
  title: "Dialog",
  group: "Disclosure",
  description: "Modal dialog on the native <dialog>: inert page, focus containment, Esc and focus return handled by the browser. On phones it covers the whole screen (or becomes a bottom sheet).",
  define() {
    defineButton()
    defineDialog()
    defineInput()
  },
  html: `
<sub-button id="open">Edit profile</sub-button>
<sub-dialog id="dlg" heading="Edit profile" description="Changes are saved to your public profile.">
  <sub-input label="Display name" value="Ana" autocomplete="nickname" autofocus></sub-input>
  <sub-button slot="actions" variant="secondary" data-act="cancel">Cancel</sub-button>
  <sub-button slot="actions" data-act="save">Save changes</sub-button>
</sub-dialog>
`,
  props: { selector: 'sub-dialog', controls: [{ name: 'dismiss', type: 'select', options: ['esc', 'any', 'none'] }, { name: 'variant', type: 'select', options: ['default', 'alert'] }, { name: 'mobile', type: 'select', options: ['fullscreen', 'sheet', 'dialog'] }] },
  keyboard: [
    ["Tab / Shift+Tab", "Cycle inside the dialog only"],
    ["Esc", "Close (when dismiss is not none)"],
    ["Enter, Space", "Activate the focused button"],
  ],
  setup(preview, log) {
    const dialog = preview.querySelector('sub-dialog')
    preview.querySelector('#open')?.addEventListener('click', () => dialog?.show())
    preview.addEventListener('click', (event) => {
      const act = (event.target as Element).closest('[data-act]')?.getAttribute('data-act')
      if (act) dialog?.close(act)
    })
    dialog?.addEventListener('close', (event) => log(`Dialog closed (${(event as CustomEvent<{ returnValue: string }>).detail.returnValue || 'dismissed'}).`))
  },
} satisfies Demo
