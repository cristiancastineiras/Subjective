import { accessibleName, checkContrast, lintA11y, tabOrder, targetSize } from '@sub/core/a11y-tools'
import { defineButton } from '@sub/core/button'
import { lockScroll, trapFocus } from '@sub/core/focus'
import { defineInput } from '@sub/core/input'
import { Typeahead, arrowDirection, isActivationKey, isPrintableKey, matchesShortcut } from '@sub/core/keys'
import { getPreferences, watchPreferences } from '@sub/core/prefs'
import type { Demo } from '../demo'

export default {
  id: "a11y-tools",
  title: "Developer tools",
  group: "Utilities",
  description: "Helpers for building accessibly: tabOrder(), accessibleName(), checkContrast(), targetSize(), lintA11y(), getPreferences(), plus trapFocus(), lockScroll(), Typeahead and keyboard helpers.",
  define() {
    defineButton()
    defineInput()
  },
  html: `
<div class="stack">
  <div id="sandbox" class="stack">
    <sub-input label="Email" type="email" autocomplete="email"></sub-input>
    <sub-button variant="secondary">Save draft</sub-button>
    <a href="#sandbox">A plain link</a>
  </div>
  <div class="stack">
    <sub-button id="order" variant="secondary">List the tab order of the box above</sub-button>
    <sub-button id="name" variant="secondary">Name of the Save draft button</sub-button>
    <sub-button id="lint" variant="secondary">Lint a snippet with common mistakes</sub-button>
  </div>
  <div class="stack">
    <sub-input id="fg" label="Text colour" value="#767676"></sub-input>
    <sub-input id="bg" label="Background" value="#ffffff"></sub-input>
    <sub-button id="contrast" variant="secondary">Check the contrast</sub-button>
  </div>
  <sub-button id="prefs" variant="secondary">Show what the user asked for (motion, contrast, pointer...)</sub-button>
  <div role="region" aria-label="Result of the last helper" tabindex="0"><pre id="tools-out" aria-live="polite"></pre></div>
</div>
`,
  tokens: [],
  keyboard: [
    ["Tab", "Reach every button; each one runs a helper and prints the result"],
    ["Enter, Space", "Run it"],
  ],
  setup(preview, log) {
    const out = preview.querySelector<HTMLElement>('#tools-out')!
    const show = (title: string, lines: string[]) => {
      out.textContent = `${title}\n${lines.join('\n') || '(nothing to report)'}`
      log(`${title}: ${lines.length} line(s).`)
    }
    ;(window as unknown as { subA11yTools: unknown }).subA11yTools = { accessibleName, checkContrast, lintA11y, tabOrder, targetSize, getPreferences, trapFocus, lockScroll, Typeahead, arrowDirection, isActivationKey, isPrintableKey, matchesShortcut }

    preview.addEventListener('click', (event) => {
      const id = (event.target as Element).closest('sub-button')?.id
      if (id === 'order') {
        const stops = tabOrder(preview.querySelector('#sandbox')!)
        show('tabOrder()', stops.map((s) => `${s.order}. ${s.role || s.element.localName} "${s.name}"${s.issues.length ? '  !! ' + s.issues.join('; ') : ''}`))
      } else if (id === 'name') {
        const button = preview.querySelector('#sandbox sub-button')!.shadowRoot!.querySelector('button')!
        show('accessibleName()', [`"${accessibleName(button)}"`, `target ${targetSize(button).width} x ${targetSize(button).height}px (AA ${targetSize(button).aa}, AAA ${targetSize(button).aaa})`])
      } else if (id === 'lint') {
        const snippet = document.createElement('div')
        snippet.innerHTML = '<img src="x.png"><button></button><a href="/a" target="_blank">Docs</a><label for="q">Search</label><input id="q"><input id="q"><div aria-labelledby="nope" tabindex="3">Panel</div>'
        show('lintA11y()', lintA11y(snippet).map((i) => `${i.rule}: ${i.message}`))
      } else if (id === 'contrast') {
        const value = (name: string) => (preview.querySelector<HTMLElement & { value: string }>(`#${name}`)?.value ?? '').trim()
        try {
          const text = checkContrast(value('fg'), value('bg'))
          const ui = checkContrast(value('fg'), value('bg'), { kind: 'ui' })
          show('checkContrast()', [`${text.ratio}:1`, `text: ${text.passes ? 'passes' : 'fails'} AA (needs ${text.required}:1), reaches ${text.level}`, `UI part: ${ui.passes ? 'passes' : 'fails'} (needs ${ui.required}:1)`])
        } catch (error) {
          show('checkContrast()', [(error as Error).message])
        }
      } else if (id === 'prefs') {
        show('getPreferences()', Object.entries(getPreferences()).map(([k, v]) => `${k}: ${String(v)}`))
      }
    })
    watchPreferences(() => preview.querySelector('#prefs')?.dispatchEvent(new Event('click', { bubbles: true })))
  },
} satisfies Demo
