import type { Demo } from './demo'
import { mountA11y } from './panels/a11y'
import { mountConfigure } from './panels/configure'

/**
 * A component page: the live example, its keyboard table and code on the left, the accessibility
 * result and the Configure panel on the right. Loaded only when a component page is opened.
 */
export interface Workbench {
  /** Audit the example again (after a theme or density change) */
  rerun(): void
  /** Re-read the computed defaults shown in Configure */
  refresh(): void
  /** Leave the page: stop pending audits; late messages from the demo are ignored */
  dispose(): void
}

const $ = <T extends HTMLElement>(id: string) => {
  const el = document.getElementById(id)
  if (!el) throw new Error(`The playground markup is missing #${id}.`)
  return el as T
}

export function mountWorkbench(demo: Demo, options: { compact: boolean }): Workbench {
  // A brand-new example element: whatever the previous demo attached to it (listeners, inline tokens) goes with the old one
  const preview = document.createElement('div')
  preview.id = 'preview'
  preview.className = 'samples'
  preview.dataset.subDensity = options.compact ? 'compact' : 'comfortable'
  $('preview').replaceWith(preview)

  let alive = true
  const result = $('result')
  result.textContent = 'No action yet.'
  const log = (message: string) => {
    if (alive) result.textContent = message
  }

  demo.define()
  preview.innerHTML = demo.html
  demo.setup?.(preview, log)

  const keysBlock = $('keys-block')
  keysBlock.hidden = !demo.keyboard?.length
  $('keys').replaceChildren(
    ...(demo.keyboard ?? []).map(([keys, does]) => {
      const row = document.createElement('tr')
      row.innerHTML = '<td><kbd></kbd></td><td></td>'
      row.querySelector('kbd')!.textContent = keys
      row.cells[1]!.textContent = does
      return row
    }),
  )

  const a11y = mountA11y($('a11y'), preview)
  const cfg = mountConfigure($('configure'), preview, demo, a11y.run)

  // wait until every custom element in the example is defined and has rendered, then audit
  const pending = [...preview.querySelectorAll('*')].filter((el) => el.localName.includes('-')).map((el) => customElements.whenDefined(el.localName))
  void Promise.race([Promise.allSettled(pending), new Promise((r) => setTimeout(r, 1500))]).then(() =>
    requestAnimationFrame(() => requestAnimationFrame(() => alive && a11y.run())),
  )

  return {
    rerun: () => alive && a11y.run(),
    refresh: () => alive && cfg.refresh(),
    dispose() {
      alive = false
      a11y.dispose()
    },
  }
}
