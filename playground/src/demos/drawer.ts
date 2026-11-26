import { defineButton } from '@sub/core/button'
import { defineDrawer } from '@sub/core/drawer'
import { defineInput } from '@sub/core/input'
import type { Demo } from '../demo'

export default {
  id: "drawer",
  title: "Drawer",
  group: "Disclosure",
  description: "A modal panel docked to an edge: same native dialog behaviour as the Dialog.",
  define() {
    defineButton()
    defineDrawer()
    defineInput()
  },
  html: `
<sub-button id="open-drawer">Open filters</sub-button>
<sub-drawer id="drawer" heading="Filters" description="Narrow down the results.">
  <div class="stack"><sub-input label="Keyword" autofocus></sub-input><sub-input label="Maximum price" type="number"></sub-input></div>
  <sub-button slot="actions" variant="secondary" data-act="clear">Clear</sub-button>
  <sub-button slot="actions" data-act="apply">Apply filters</sub-button>
</sub-drawer>
`,
  tokens: ["drawer", "dialog"],
  props: { selector: 'sub-drawer', controls: [{ name: 'placement', type: 'select', options: ['right', 'left', 'bottom', 'top'] }, { name: 'dismiss', type: 'select', options: ['esc', 'any', 'none'] }] },
  keyboard: [
    ["Tab", "Cycles inside the drawer"],
    ["Esc", "Close, focus returns to the opener"],
  ],
  setup(preview, log) {
    const drawer = preview.querySelector('sub-drawer')
    preview.querySelector('#open-drawer')?.addEventListener('click', () => drawer?.show())
    preview.addEventListener('click', (e) => {
      const act = (e.target as Element).closest('[data-act]')?.getAttribute('data-act')
      if (act) drawer?.close(act)
    })
    drawer?.addEventListener('close', (e) => log(`Drawer closed (${(e as CustomEvent<{ returnValue: string }>).detail.returnValue || 'dismissed'}).`))
  },
} satisfies Demo
