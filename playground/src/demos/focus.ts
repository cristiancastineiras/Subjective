import { defineButton } from '@sub/core/button'
import { defineInput } from '@sub/core/input'
import { announce } from '@sub/core/announce'
import { afterNavigation, focusFirstInvalid, moveFocus } from '@sub/core/focus'
import type { Demo } from '../demo'

export default {
  id: "focus",
  title: "Focus and announcements",
  group: "Utilities",
  description: "Helpers for page-level accessibility: announce(), moveFocus(), afterNavigation(), rememberFocus(), focusFirstInvalid().",
  define() {
    defineButton()
    defineInput()
  },
  html: `
<div class="stack">
  <sub-button id="a">Announce "Settings saved"</sub-button>
  <sub-button id="b" variant="secondary">Move focus to the heading below</sub-button>
  <sub-button id="c" variant="secondary">Simulate a route change</sub-button>
  <sub-button id="d" variant="secondary">Focus the first invalid field</sub-button>
  <h3 id="target-heading" style="margin: 0">Target heading</h3>
  <sub-input id="bad" label="Required field" required error="Enter a value"></sub-input>
</div>
`,
  tokens: [],
  setup(preview, log) {
    preview.addEventListener('click', (event) => {
      const id = (event.target as Element).closest('sub-button')?.id
      if (id === 'a') {
        announce('Settings saved')
        log('announce("Settings saved") sent to the polite live region.')
      } else if (id === 'b') {
        log(moveFocus('#target-heading', { announce: 'Moved to the target heading' }) ? 'Focus moved to the heading (temporary tabindex).' : 'Could not move focus.')
      } else if (id === 'c') {
        afterNavigation({ title: 'Pricing | SUB Playground', focus: '#target-heading' })
        log('afterNavigation: title updated, focus moved, page announced.')
        setTimeout(() => (document.title = 'Focus and announcements | SUB Playground'), 1500)
      } else if (id === 'd') {
        log(focusFirstInvalid(preview) ? 'Focused the first invalid control.' : 'Nothing invalid.')
      }
    })
  },
} satisfies Demo
