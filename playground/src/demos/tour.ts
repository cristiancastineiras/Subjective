import { defineButton } from '@sub/core/button'
import { defineInput } from '@sub/core/input'
import { defineTour } from '@sub/core/tour'
import type { Demo } from '../demo'

export default {
  id: "tour",
  title: "Tour",
  group: "Disclosure",
  description: "A guided walk through the page: one non-modal step at a time, the target outlined with the focus ring, focus moved to the step, Esc to leave. Docks to the bottom on phones.",
  define() {
    defineButton()
    defineInput()
    defineTour()
  },
  html: `
<div class="stack">
  <sub-button id="tour-start">Start the tour</sub-button>
  <sub-input id="tour-search" label="Search projects" placeholder="Name or owner"></sub-input>
  <sub-button id="tour-new">New project</sub-button>
  <sub-button id="tour-share" variant="secondary">Share</sub-button>
  <sub-tour id="tour">
    <sub-tour-step target="#tour-search" heading="Find anything">Type a project name or an owner; results appear as you type.</sub-tour-step>
    <sub-tour-step target="#tour-new" heading="Create a project">Start from scratch or from a template.</sub-tour-step>
    <sub-tour-step target="#tour-share" heading="Share with your team">Invite people by email and choose what they can do.</sub-tour-step>
    <sub-tour-step heading="You are ready">This last step has no target, so it is centred. Press Finish to close.</sub-tour-step>
  </sub-tour>
</div>
`,
  tokens: ["tour"],
  props: { selector: 'sub-tour', controls: [{ name: 'no-mask', type: 'boolean' }] },
  keyboard: [
    ["Enter on Start", "Open the first step; focus moves to it"],
    ["Tab", "Previous, Next and the close button"],
    ["Enter on Next", "Go to the next step (the last one says Finish)"],
    ["Esc", "End the tour; focus returns to the button that started it"],
  ],
  setup(preview, log) {
    const tour = preview.querySelector('sub-tour')
    preview.querySelector('#tour-start')?.addEventListener('click', () => tour?.start())
    tour?.addEventListener('sub-tour-change', (e) => log(`Step ${(e as CustomEvent<{ index: number }>).detail.index + 1}.`))
    tour?.addEventListener('sub-tour-close', (e) => log(`Tour closed (${(e as CustomEvent<{ reason: string }>).detail.reason}).`))
  },
} satisfies Demo
