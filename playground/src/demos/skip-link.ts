import { defineButton } from '@sub/core/button'
import { defineSkipLink } from '@sub/core/skip-link'
import type { Demo } from '../demo'

export default {
  id: "skip-link",
  title: "Skip link",
  group: "Navigation",
  description: "First focusable element of a page: hidden until focused, then jumps to the main content and moves focus there.",
  define() {
    defineButton()
    defineSkipLink()
  },
  html: `
<div class="wide stack">
  <p>1. Activate <strong>Start the test</strong> (it puts focus just before the link). 2. Press <kbd>Tab</kbd>: the link appears. 3. Press <kbd>Enter</kbd>: focus lands on the content.</p>
  <sub-button id="start" variant="secondary">Start the test</sub-button>
  <span id="skip-start" tabindex="-1"></span>
  <sub-skip-link href="#skip-target">Skip to the example content</sub-skip-link>
  <div id="skip-target" class="demo-box"><p>Focus lands here.</p></div>
</div>
`,
  setup(preview, log) {
    preview.querySelector('#start')?.addEventListener('click', () => preview.querySelector<HTMLElement>('#skip-start')?.focus())
    preview.querySelector('#skip-target')?.addEventListener('focus', () => log('Focus moved to the example content.'))
  },
  keyboard: [
    ["Tab (first on a real page)", "Reveal the skip link"],
    ["Enter", "Jump to the target and focus it"],
  ],
} satisfies Demo
