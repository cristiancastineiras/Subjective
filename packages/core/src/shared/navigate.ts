import { config } from './config'
import { emit } from './utils'

/**
 * Links drawn inside a shadow root are invisible to framework routers (React Router / Next <Link>, Vue
 * RouterLink, Angular routerLink): a click on them would reload the page. Every such link goes through here.
 *
 * - `sub-navigate` (bubbles, composed, cancelable, `detail: { href, url }`) is dispatched on the component:
 *   cancel it to route the click yourself.
 * - Or, once for the whole app: `configure({ navigate: (href) => router.push(href) })`. Return `false` from it
 *   to let the browser navigate after all.
 * - Neither: the native link navigates, as it always did.
 * Only plain same-tab clicks on same-origin links are taken: Ctrl/Cmd/Shift/Alt-click, `target`, `download` and
 * other sites keep their native behaviour.
 */

/** A plain left click that the browser would turn into a same-tab navigation */
const isPlainClick = (event: MouseEvent, a: HTMLAnchorElement): boolean =>
  event.button === 0 &&
  !event.metaKey &&
  !event.ctrlKey &&
  !event.shiftKey &&
  !event.altKey &&
  (!a.target || a.target === '_self') &&
  !a.hasAttribute('download')

/** Offer the navigation to the app; cancels `event` when the app took it */
function handOver(host: HTMLElement, event: Event, href: string | null): void {
  if (!href) return
  let url: URL
  try {
    url = new URL(href, location.href)
  } catch {
    return
  }
  if (url.origin !== location.origin) return
  const proceed = emit(host, 'sub-navigate', { href, url: url.href }, { cancelable: true })
  if (!proceed || (config.navigate && config.navigate(href, url) !== false)) event.preventDefault()
}

/** `@click` of a link the component builds from an attribute (`<sub-button href>`, `<sub-link>`, pagination) */
export function routeLink(host: HTMLElement, event: MouseEvent): void {
  const a = event.currentTarget as HTMLAnchorElement
  if (event.defaultPrevented || !isPlainClick(event, a)) return
  handOver(host, event, a.getAttribute('href'))
}

/**
 * `@click` of a COPY of an author's link (breadcrumbs, nav menu): the click goes to the author's own element
 * first, so a framework link component runs its handler; if nothing took it, the app's router is offered it
 * (`sub-navigate`, `configure({ navigate })`), and if nobody wants it, the author's link navigates natively.
 */
export function forwardClick(host: HTMLElement, event: MouseEvent, original: Element | undefined): void {
  const a = event.currentTarget as HTMLAnchorElement
  if (!original || event.defaultPrevented || !isPlainClick(event, a)) return
  event.preventDefault() // the copy never navigates on its own
  // runs after every handler of the page (window is the last stop of a bubbling click)
  const last = (e: Event) => {
    if (!e.defaultPrevented) handOver(host, e, original.getAttribute('href'))
  }
  window.addEventListener('click', last, { once: true })
  original.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, composed: true, button: 0, view: window }))
  window.removeEventListener('click', last)
}
