import { defineInput } from '@sub/core/input'
import { defineModal } from '@sub/core/modal'
import { defineSelect } from '@sub/core/select'
import type { Demo } from '../demo'

export default {
  id: "modal",
  title: "Modal",
  group: "Disclosure",
  description: "A modal with its own opening button, in one element. On a phone it covers the whole screen (or becomes a bottom sheet), on a desktop it is a centred box.",
  define() {
    defineModal()
    defineInput()
    defineSelect()
  },
  html: `
<div class="stack">
  <sub-modal id="profile" trigger="Edit profile" heading="Edit profile" description="Changes are saved to your public profile.">
    <div class="stack">
      <sub-input label="Display name" value="Ana" autocomplete="nickname" autofocus></sub-input>
      <sub-select name="lang" label="Language" value="es">
        <sub-option value="es">Spanish</sub-option>
        <sub-option value="en">English</sub-option>
        <sub-option value="fr">French</sub-option>
      </sub-select>
    </div>
    <sub-button slot="actions" variant="secondary" data-act="cancel">Cancel</sub-button>
    <sub-button slot="actions" data-act="save">Save changes</sub-button>
  </sub-modal>
  <sub-modal id="sheet" trigger="Open as a sheet" trigger-variant="tertiary" heading="Share this page" mobile="sheet">
    <p>On a phone this slides up from the bottom and keeps the page visible above it.</p>
    <sub-button slot="actions" data-act="close">Done</sub-button>
  </sub-modal>
</div>
`,
  props: {
    selector: '#profile',
    controls: [
      { name: 'trigger', type: 'text' },
      { name: 'heading', type: 'text' },
      { name: 'mobile', type: 'select', options: ['fullscreen', 'sheet', 'dialog'] },
      { name: 'dismiss', type: 'select', options: ['esc', 'any', 'none'] },
    ],
  },
  keyboard: [
    ["Enter, Space", "Open from the button; the first autofocus control receives focus"],
    ["Tab / Shift+Tab", "Cycle inside the modal only"],
    ["Esc", "Close; focus returns to the button that opened it"],
  ],
  setup(preview, log) {
    preview.addEventListener('click', (event) => {
      const target = event.target as Element
      const act = target.closest('[data-act]')?.getAttribute('data-act')
      const modal = target.closest<HTMLElementTagNameMap['sub-modal']>('sub-modal')
      if (act && modal) {
        modal.close(act)
        log(`Modal closed (${act}).`)
      }
    })
  },
} satisfies Demo
