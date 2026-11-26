import { defineButton } from '@sub/core/button'
import { defineButtonGroup } from '@sub/core/button-group'
import { defineStepper } from '@sub/core/stepper'
import type { Demo } from '../demo'

export default {
  id: "stepper",
  title: "Stepper",
  group: "Forms",
  description: "Progress through a multi-step form: \"Step 2 of 3: Profile\". The total is never hidden; progress is text + tick + position.",
  define() {
    defineButton()
    defineButtonGroup()
    defineStepper()
  },
  html: `
<div class="stack">
  <sub-stepper current="2" label="Sign-up progress"><li>Account</li><li>Profile</li><li>Preferences</li></sub-stepper>
  <sub-button-group label="Step navigation" layout="inline">
    <sub-button variant="secondary" id="back">Back</sub-button>
    <sub-button id="next">Continue</sub-button>
  </sub-button-group>
</div>
`,
  props: { selector: 'sub-stepper', controls: [{ name: 'current', type: 'number', min: 1, max: 3 }] },
  setup(preview, log) {
    const stepper = preview.querySelector('sub-stepper')
    preview.addEventListener('click', (event) => {
      const id = (event.target as Element).closest('sub-button')?.id
      if (!stepper || !id) return
      stepper.current = Math.min(3, Math.max(1, stepper.current + (id === 'next' ? 1 : -1)))
      log(`Now on step ${stepper.current} of 3.`)
    })
  },
} satisfies Demo
