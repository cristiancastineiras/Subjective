import { defineButton } from '@sub/core/button'
import { defineForm } from '@sub/core/form'
import { defineInput } from '@sub/core/input'
import { defineCheckbox } from '@sub/core/checkbox'
import { logSubmit } from '../demo-utils'
import type { Demo } from '../demo'

export default {
  id: "form",
  title: "Form",
  group: "Forms",
  description: "Wraps a native form: all errors at once, inline, with an error summary from 3 errors, focus where the user should start, no browser bubbles.",
  define() {
    defineButton()
    defineForm()
    defineInput()
    defineCheckbox()
  },
  html: `
<sub-form class="wide">
  <form class="stack">
    <sub-input name="given" label="First name" autocomplete="given-name" required></sub-input>
    <sub-input name="email" label="Email address" type="email" autocomplete="email" required example="ana@example.com"></sub-input>
    <sub-input name="postal" label="Postal code" inputmode="numeric" pattern="[0-9]{5}" required example="28013"></sub-input>
    <sub-checkbox name="terms" label="I accept the terms" required></sub-checkbox>
    <sub-button type="submit">Create account</sub-button>
  </form>
</sub-form>
`,
  tokens: ["field", "error-summary"],
  props: { selector: 'sub-form', controls: [{ name: 'summary-threshold', type: 'number', min: 1, max: 6 }] },
  keyboard: [
    ["Enter", "Submit; with errors, focus moves to the summary (3+) or the first invalid field"],
    ["Tab", "From the summary, links jump to each field"],
  ],
  setup(preview, log) {
    logSubmit(preview, log)
    preview.addEventListener('sub-invalid', (event) => log(`${(event as CustomEvent<{ errors: unknown[] }>).detail.errors.length} errors; not submitted.`))
  },
} satisfies Demo
