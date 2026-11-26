import { defineSelect } from '@sub/core/select'
import type { Demo } from '../demo'

export default {
  id: "select",
  title: "Select",
  group: "Forms",
  description: "A select made of our own parts (not the native one): the field and the option panel share the library's look and tokens. Single, multiple, searchable and grouped; a full-screen sheet on phones.",
  define: defineSelect,
  html: `
<div class="stack">
  <sub-select id="single" name="country" label="Country" placeholder="Select a country" required>
    <sub-option value="es" description="Madrid">Spain</sub-option>
    <sub-option value="fr" description="Paris">France</sub-option>
    <sub-option value="de" description="Berlin">Germany</sub-option>
    <sub-option value="it" description="Rome">Italy</sub-option>
    <sub-option value="pt" description="Lisbon">Portugal</sub-option>
    <sub-option value="uk" description="London">United Kingdom</sub-option>
    <sub-option value="us" disabled>United States (unavailable)</sub-option>
  </sub-select>

  <sub-select id="grouped" name="city" label="City" hint="Type to filter. Options are grouped." searchable clearable placeholder="Search a city">
    <sub-option value="mad" group="Spain">Madrid</sub-option>
    <sub-option value="bcn" group="Spain">Barcelona</sub-option>
    <sub-option value="vlc" group="Spain">Valencia</sub-option>
    <sub-option value="par" group="France">Paris</sub-option>
    <sub-option value="lyo" group="France">Lyon</sub-option>
    <sub-option value="ber" group="Germany">Berlin</sub-option>
    <sub-option value="mun" group="Germany">Munich</sub-option>
    <sub-option value="zur" group="Switzerland">Zürich</sub-option>
  </sub-select>

  <sub-select id="multi" name="skills" label="Skills" hint="Pick as many as you like; filter by typing." multiple searchable clearable placeholder="Choose skills" value="a11y,css">
    <sub-option value="a11y" description="WCAG, ARIA, keyboard">Accessibility</sub-option>
    <sub-option value="css">CSS</sub-option>
    <sub-option value="ts">TypeScript</sub-option>
    <sub-option value="lit">Web Components</sub-option>
    <sub-option value="ux">UX writing</sub-option>
    <sub-option value="test">Testing</sub-option>
    <sub-option value="perf">Performance</sub-option>
  </sub-select>

  <sub-select id="multi-simple" name="days" label="Working days" multiple placeholder="Choose days">
    <sub-option value="mon">Monday</sub-option>
    <sub-option value="tue">Tuesday</sub-option>
    <sub-option value="wed">Wednesday</sub-option>
    <sub-option value="thu">Thursday</sub-option>
    <sub-option value="fri">Friday</sub-option>
  </sub-select>

  <sub-select label="Plan (disabled)" disabled value="pro"><sub-option value="pro">Pro</sub-option></sub-select>
</div>
`,
  tokens: ["field", "listbox"],
  props: {
    selector: '#grouped',
    controls: [
      { name: 'searchable', type: 'boolean' },
      { name: 'clearable', type: 'boolean' },
      { name: 'multiple', type: 'boolean' },
      { name: 'required', type: 'boolean' },
      { name: 'disabled', type: 'boolean' },
    ],
  },
  keyboard: [
    ["Down / Up / Alt+Down", "Open the list (focus stays on the field)"],
    ["Down / Up", "Move to the next / previous option"],
    ["Home / End", "First / last option"],
    ["A letter", "Jump to the next option that starts with it"],
    ["Enter or Space", "Choose the option (multiple: tick it and keep the list open)"],
    ["Esc", "Close the list and keep focus on the field"],
    ["Tab", "Close the list and move on"],
    ["Searchable: typing", "Filters the options; Enter chooses the highlighted one"],
  ],
  setup(preview, log) {
    preview.addEventListener('change', (event) => {
      const el = event.target as HTMLElement & { value: string; label: string }
      if (el.localName === 'sub-select') log(`${el.label}: ${el.value || 'nothing'}`)
    })
  },
} satisfies Demo
