import { defineApp } from '@sub/core/app'
import { defineButton } from '@sub/core/button'
import type { Demo } from '../demo'

export default {
  id: "app",
  title: "App and config",
  group: "Utilities",
  description: "Config provider: theme, mode, language, direction, messages and a shared toast region for its subtree.",
  define() {
    defineApp()
    defineButton()
  },
  html: `
<sub-app mode="auto" required-indicator="optional">
  <sub-button id="notify">Show a notification</sub-button>
</sub-app>
`,
  tokens: [],
  props: { selector: 'sub-app', controls: [{ name: 'mode', type: 'select', options: ['auto', 'light', 'dark'] }, { name: 'required-indicator', type: 'select', options: ['optional', 'required', 'both'] }] },
  setup(preview, log) {
    const app = preview.querySelector('sub-app')
    preview.querySelector('#notify')?.addEventListener('click', () => {
      app?.toast({ message: 'Settings saved', actionLabel: 'Undo' })
      log('app.toast() shown in the shared region.')
    })
  },
} satisfies Demo
