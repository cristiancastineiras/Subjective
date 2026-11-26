/**
 * Same-document navigation for the playground. Links to another page of the playground swap the
 * content in place: no reload, no white flash, the header and the component list stay where they are
 * (with their scroll position), Back/Forward work and every page remembers how far down you were.
 *
 * - The code a page needs loads BEFORE the swap (`load`), so the swap itself (`render`) is synchronous
 *   and runs inside a view transition when the browser has them and the user allows motion.
 * - Pointing at or focusing a link starts loading its page, so most navigations find the code ready.
 * - Anything that is not ours goes to the browser untouched: other paths and sites, `target`, `download`,
 *   modifier keys (open in a new tab), links that only change the #hash, clicks a component already handled.
 */

export interface RouterOptions<R> {
  /** The route for a URL of this app, or null for URLs the browser must handle */
  resolve(url: URL): R | null
  /** Identity of a route: two URLs with the same key are the same page (only the #hash differs) */
  key(route: R): string
  /** Load what the route needs (code, data). May be slow; nothing on screen changes meanwhile. */
  load(route: R, url: URL): Promise<void> | void
  /** Swap the content. Synchronous: it runs inside the view transition. */
  render(route: R, url: URL): void
  /** The new page is on screen: move focus, announce. Not called for the first render. */
  after?(route: R, url: URL, how: { restored: boolean }): void
}

export interface Router {
  /** Go to a URL of the app (a full navigation when it is not ours) */
  navigate(url: string | URL, options?: { replace?: boolean }): Promise<void>
  /** Load a page's code ahead of time */
  prefetch(url: string | URL): void
  /** Render the current URL and take over link clicks and Back/Forward */
  start(): Promise<void>
}

type Mode = 'push' | 'replace' | 'pop' | 'initial'

interface Entry {
  scroll?: number
}

/** Show the progress bar only when a page takes longer than this to load */
const SLOW_MS = 150

const anchorIn = (event: Event): HTMLAnchorElement | undefined =>
  event.composedPath().find((n): n is HTMLAnchorElement => n instanceof HTMLAnchorElement && n.hasAttribute('href'))

export function createRouter<R>(o: RouterOptions<R>): Router {
  const root = document.documentElement
  let seq = 0
  let currentKey: string | undefined
  const prefetched = new Set<string>()

  const allowsMotion = () =>
    typeof document.startViewTransition === 'function' &&
    document.visibilityState === 'visible' &&
    !matchMedia('(prefers-reduced-motion: reduce)').matches &&
    root.dataset.subMotion !== 'off'

  const entry = (): Entry => (history.state && typeof history.state === 'object' ? (history.state as Entry) : {})
  const saveScroll = () => {
    try {
      history.replaceState({ ...entry(), scroll: Math.round(scrollY) }, '')
    } catch {
      /* too many history updates (Safari throttles them): the position is just not remembered */
    }
  }

  /** A link the router should take: ours, and not only a jump to a #hash of the page on screen */
  const takes = (url: URL): boolean => {
    if (url.origin !== location.origin || o.resolve(url) === null) return false
    const samePage = url.pathname === location.pathname && url.search === location.search
    return !(samePage && url.hash)
  }

  async function go(url: URL, mode: Mode, scroll = 0): Promise<void> {
    const route = o.resolve(url)
    if (route === null) {
      if (mode === 'initial') throw new Error(`The router has no route for ${url.href}.`)
      location.assign(url.href)
      return
    }
    const ticket = ++seq
    const slow = setTimeout(() => (root.dataset.navigating = ''), SLOW_MS)
    try {
      await o.load(route, url)
    } catch (error) {
      if (ticket === seq) {
        clearTimeout(slow)
        delete root.dataset.navigating
        // the page's code did not arrive (offline, a new deploy renamed the files): a real load is the honest fallback
        if (mode === 'pop') location.reload()
        else if (mode !== 'initial') location.assign(url.href)
      }
      throw error
    }
    if (ticket !== seq) return // a newer navigation started while this one was loading: it wins
    clearTimeout(slow)
    delete root.dataset.navigating

    if (mode === 'push') {
      saveScroll()
      history.pushState({ scroll: 0 } satisfies Entry, '', url)
    } else if (mode === 'replace') {
      history.replaceState({ scroll: 0 } satisfies Entry, '', url)
    }
    currentKey = o.key(route)

    const swap = () => {
      o.render(route, url)
      const target = url.hash ? document.getElementById(decodeURIComponent(url.hash.slice(1))) : null
      if (target) target.scrollIntoView()
      else window.scrollTo({ top: scroll, left: 0, behavior: 'instant' })
    }
    if (mode !== 'initial' && allowsMotion()) {
      const transition = document.startViewTransition(swap)
      transition.ready.catch(() => undefined) // skipped (another navigation, hidden tab): the swap still happened
      await transition.updateCallbackDone
    } else {
      swap()
    }
    if (mode !== 'initial') o.after?.(route, url, { restored: mode === 'pop' })
  }

  const navigate: Router['navigate'] = (to, options = {}) => {
    const url = new URL(to, location.href)
    const same = url.href === location.href
    return go(url, options.replace || same ? 'replace' : 'push')
  }

  const prefetch: Router['prefetch'] = (to) => {
    const url = new URL(to, location.href)
    const route = o.resolve(url)
    if (route === null) return
    const key = o.key(route)
    if (prefetched.has(key)) return
    prefetched.add(key)
    void Promise.resolve()
      .then(() => o.load(route, url))
      .catch(() => prefetched.delete(key)) // try again next time
  }

  const onClick = (event: MouseEvent) => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
    const a = anchorIn(event)
    if (!a || (a.target && a.target !== '_self') || a.hasAttribute('download')) return
    const url = new URL(a.href)
    if (!takes(url)) return
    event.preventDefault()
    void navigate(url)
  }

  const onIntent = (event: Event) => {
    const a = anchorIn(event)
    if (!a) return
    const url = new URL(a.href)
    if (takes(url)) prefetch(url)
  }

  const onPop = (event: PopStateEvent) => {
    const url = new URL(location.href)
    const route = o.resolve(url)
    if (route === null) return location.reload()
    if (o.key(route) === currentKey) return // a #hash link inside the page: the browser handles it
    void go(url, 'pop', (event.state as Entry | null)?.scroll ?? 0)
  }

  let scrollTimer: ReturnType<typeof setTimeout> | undefined
  const onScroll = () => {
    clearTimeout(scrollTimer)
    scrollTimer = setTimeout(saveScroll, 150)
  }

  return {
    navigate,
    prefetch,
    async start() {
      if ('scrollRestoration' in history) history.scrollRestoration = 'manual'
      document.addEventListener('click', onClick)
      document.addEventListener('pointerover', onIntent, { passive: true })
      document.addEventListener('focusin', onIntent)
      addEventListener('popstate', onPop)
      addEventListener('scroll', onScroll, { passive: true })
      await go(new URL(location.href), 'initial', entry().scroll ?? 0)
    },
  }
}
