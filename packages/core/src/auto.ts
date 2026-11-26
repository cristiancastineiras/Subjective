/**
 * Zero-config entry: `import '@sub/core/auto'`.
 * Registers every component and applies the theme found in the page (see `autoTheme`).
 * It has side effects on purpose (package.json lists it in `sideEffects`).
 */
import { defineAll } from './index'
import { autoTheme } from './theme'

defineAll()
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => void autoTheme(), { once: true })
else void autoTheme()
