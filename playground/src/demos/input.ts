import { defineButton } from '@sub/core/button'
import { defineInput } from '@sub/core/input'
import { logSubmit } from '../demo-utils'
import type { Demo } from '../demo'

export default {
  id: "input",
  title: "Input",
  group: "Forms",
  description: "Text field with a visible label, helper text and friendly errors shown on blur. Use the most specific type; autocomplete tokens help autofill.",
  define() {
    defineButton()
    defineInput()
  },
  html: `
<form class="stack">
  <sub-input name="name" label="Full name" autocomplete="name" required></sub-input>
  <sub-input name="email" label="Email address" type="email" autocomplete="email" required
    hint="We will send the receipt here." example="ana@example.com"></sub-input>
  <sub-input name="phone" label="Phone number" type="tel" autocomplete="tel" inputmode="tel"
    hint="Format: +34 600 000 000" placeholder="+34 600 000 000"></sub-input>
  <sub-input name="password" label="Password" type="password" autocomplete="new-password" required
    minlength="8" hint="At least 8 characters"></sub-input>
  <sub-input name="postal" label="Postal code" inputmode="numeric" pattern="[0-9]{5}" autocomplete="postal-code"
    example="28013"></sub-input>
  <sub-input name="nick" label="Display name" maxlength="20" counter></sub-input>
  <sub-input label="Locked field" value="Not editable" disabled></sub-input>
  <sub-button type="submit">Create account</sub-button>
</form>
`,
  tokens: ["field"],
  props: { selector: 'sub-input', controls: [
    { name: 'type', type: 'select', options: ['text', 'email', 'tel', 'url', 'password', 'search', 'number'] },
    { name: 'required', type: 'boolean' },
    { name: 'disabled', type: 'boolean' },
    { name: 'readonly', type: 'boolean' },
    { name: 'error', type: 'text', placeholder: 'Server error message' },
  ] },
  keyboard: [
    ["Tab", "Move between fields"],
    ["Enter", "Submit the form"],
    ["Space / Enter on the eye", "Show or hide the password"],
  ],
  setup(preview, log) {
    logSubmit(preview, log)
  },
} satisfies Demo
