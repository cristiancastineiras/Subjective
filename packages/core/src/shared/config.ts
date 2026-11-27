/** How a form marks which fields are required. Pick ONE per product (SubUX). */
export type RequiredIndicator = 'required' | 'optional' | 'both'

export interface SubConfig {
  /** `optional` (default): "(optional)" on optional fields. `required`: "*" on required. `both`: mixed forms. */
  requiredIndicator: RequiredIndicator
  /** `auto` (default): animate unless the OS asks for reduced motion. `off`: never animate (sets `data-sub-motion="off"` on <html>). */
  motion: 'auto' | 'off'
  /** `comfortable` (default, 44px targets) or `compact` (32px targets, tighter spacing). Sets `data-sub-density` on <html>. */
  density: 'comfortable' | 'compact'
  /**
   * Route the links that components draw inside their shadow root (button `href`, link, pagination, menu,
   * breadcrumbs, nav menu) through your router: `configure({ navigate: (href) => router.push(href) })`.
   * Return `false` to let the browser navigate. Unset: links navigate natively. See also `sub-navigate`.
   */
  navigate?: (href: string, url: URL) => boolean | void
}

export const config: SubConfig = { requiredIndicator: 'optional', motion: 'auto', density: 'comfortable' }

/** Call once, before the first component renders. */
export function configure(next: Partial<SubConfig>): void {
  Object.assign(config, next)
  if (typeof document !== 'undefined' && next.motion) {
    if (next.motion === 'off') document.documentElement.setAttribute('data-sub-motion', 'off')
    else document.documentElement.removeAttribute('data-sub-motion')
  }
  if (typeof document !== 'undefined' && next.density) document.documentElement.setAttribute('data-sub-density', next.density)
}
