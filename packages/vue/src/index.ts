import { configure } from '@sub/core'

export * from '../generated/index'
export { configure }

/**
 * `app.use(subRouter(router))`: the links SUB components draw in their shadow root go through Vue Router
 * instead of reloading the page.
 */
export const subRouter = (router: { push(to: string): unknown }) => ({
  install(): void {
    configure({ navigate: (href) => void router.push(href) })
  },
})
