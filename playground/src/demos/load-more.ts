import { defineLoadMore } from '@sub/core/load-more'
import type { Demo } from '../demo'

export default {
  id: "load-more",
  title: "Load more",
  group: "Navigation",
  description: "For galleries and filtered lists: shows how much is loaded and left, keeps focus on the button, and says when everything is loaded.",
  define: defineLoadMore,
  html: `
<sub-load-more loaded="20" total="64" batch="20" item-label="products"></sub-load-more>
`,
  props: { selector: 'sub-load-more', controls: [{ name: 'batch', type: 'number', min: 5, max: 50 }, { name: 'item-label', type: 'text' }] },
  keyboard: [
    ["Enter, Space", "Load the next batch; focus stays on the button"],
  ],
  setup(preview, log) {
    const el = preview.querySelector('sub-load-more')
    el?.addEventListener('sub-load', (event) => {
      const { count } = (event as CustomEvent<{ count: number }>).detail
      el.loading = true
      setTimeout(() => {
        el.loaded += count
        el.loading = false
        log(`${el.loaded} of ${el.total} loaded.`)
      }, 500)
    })
  },
} satisfies Demo
