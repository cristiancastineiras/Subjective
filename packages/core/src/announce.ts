/**
 * Programmatic screen-reader announcements for changes that have no visible element to focus
 * (route change, "3 items deleted", "Copied", autosave...). One shared visually-hidden pair of live
 * regions is created on first use and reused. Prefer `polite`; use `assertive` only for errors.
 *
 *   announce('Settings saved')
 *   announce('Connection lost. Retrying.', 'assertive')
 */
const regions: Partial<Record<'polite' | 'assertive', HTMLElement>> = {}

function region(politeness: 'polite' | 'assertive'): HTMLElement {
  let el = regions[politeness]
  if (el && el.isConnected) return el
  el = document.createElement('div')
  el.setAttribute('data-sub-announcer', politeness)
  el.setAttribute('aria-live', politeness)
  el.setAttribute('aria-atomic', 'true')
  if (politeness === 'assertive') el.setAttribute('role', 'alert')
  else el.setAttribute('role', 'status')
  // Visually hidden but present in the accessibility tree
  el.style.cssText = 'position:fixed;inline-size:1px;block-size:1px;margin:-1px;overflow:hidden;clip-path:inset(50%);white-space:nowrap'
  document.body.append(el)
  regions[politeness] = el
  return el
}

export function announce(message: string, politeness: 'polite' | 'assertive' = 'polite'): void {
  const el = region(politeness)
  el.textContent = '' // clear first so repeating the same text is announced again
  requestAnimationFrame(() => {
    el.textContent = message
  })
}

/** Remove the announcer elements (tests / teardown) */
export function resetAnnouncer(): void {
  for (const el of Object.values(regions)) el?.remove()
  regions.polite = undefined
  regions.assertive = undefined
}
