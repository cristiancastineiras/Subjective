/**
 * The Code block of a page: one tab per framework (WAI-ARIA tabs: arrows, Home / End, roving tab stop,
 * selection follows focus), the example coloured like an editor, and Copy for the tab you are reading.
 * The framework you pick is remembered across pages and visits. Nothing is in the page while the block is
 * closed (one copy of the demo's text, not two).
 */
import { FRAMEWORKS, componentName, type Framework, type FrameworkId, type SnippetSource } from './frameworks'
import { highlight } from './highlight'

const KEY = 'sub-playground-framework'
const saved = (): FrameworkId | null => {
  try {
    const id = localStorage.getItem(KEY)
    return FRAMEWORKS.some((f) => f.id === id) ? (id as FrameworkId) : null
  } catch {
    return null
  }
}
const remember = (id: FrameworkId) => {
  try {
    localStorage.setItem(KEY, id)
  } catch {
    // private mode / storage blocked: the choice lasts for this page only
  }
}

export interface CodePanel {
  /** Draw the example of `demo` in the chosen framework */
  show(demo: SnippetSource): void
  /** Empty the block (it was closed, or the page changed) */
  clear(): void
}

export function createCodePanel(host: HTMLElement, announce: (message: string) => void): CodePanel {
  let active: FrameworkId = saved() ?? 'html'
  let demo: SnippetSource | undefined
  let copyTimer: ReturnType<typeof setTimeout> | undefined
  const cache = new Map<string, { code: string; html: string }>()

  const snippet = (f: Framework, d: SnippetSource) => {
    const key = `${d.id}:${f.id}`
    let hit = cache.get(key)
    if (!hit) {
      const code = f.code(d)
      cache.set(key, (hit = { code, html: highlight(code, f.language) }))
    }
    return hit
  }

  const render = () => {
    if (!demo) return
    const f = FRAMEWORKS.find((x) => x.id === active)!
    const { html } = snippet(f, demo)
    host.innerHTML = `
      <div class="code-tabs" role="tablist" aria-label="Framework">
        ${FRAMEWORKS.map(
          (x) => `<button type="button" role="tab" id="code-tab-${x.id}" data-framework="${x.id}" aria-controls="code-panel" aria-selected="${x.id === active}" tabindex="${x.id === active ? 0 : -1}">${x.logo}<span>${x.label}</span></button>`,
        ).join('')}
      </div>
      <div class="code-panel" id="code-panel" role="tabpanel" aria-labelledby="code-tab-${f.id}">
        <div class="code-head">
          <span class="code-file">${f.file(componentName(demo.id), demo.id)}</span>
          <button type="button" class="code-copy" id="code-copy">Copy code</button>
        </div>
        <pre class="code-view" tabindex="0" role="region" aria-label="Example code (${f.label})"><code>${html}</code></pre>
      </div>`
  }

  const select = (id: FrameworkId, focus: boolean) => {
    if (id === active) return
    active = id
    remember(id)
    render()
    const tab = host.querySelector<HTMLElement>(`#code-tab-${id}`)
    tab?.scrollIntoView({ block: 'nearest', inline: 'nearest' })
    if (focus) tab?.focus()
  }

  host.addEventListener('click', async (event) => {
    const target = event.target as Element
    const tab = target.closest<HTMLElement>('[role=tab]')
    if (tab) return select(tab.dataset.framework as FrameworkId, true)
    const copy = target.closest<HTMLButtonElement>('#code-copy')
    if (!copy || !demo) return
    const f = FRAMEWORKS.find((x) => x.id === active)!
    try {
      await navigator.clipboard.writeText(snippet(f, demo).code)
      copy.textContent = 'Copied'
      announce(`${f.label} code copied`)
    } catch {
      // no clipboard permission: select the code so Ctrl+C copies it
      const code = host.querySelector('pre code')
      if (code) getSelection()?.selectAllChildren(code)
      copy.textContent = 'Selected: press Ctrl+C'
    }
    clearTimeout(copyTimer)
    copyTimer = setTimeout(() => {
      const button = host.querySelector('#code-copy')
      if (button) button.textContent = 'Copy code'
    }, 1800)
  })

  host.addEventListener('keydown', (event) => {
    const tab = (event.target as Element).closest<HTMLElement>('[role=tab]')
    if (!tab) return
    const at = FRAMEWORKS.findIndex((f) => f.id === tab.dataset.framework)
    const last = FRAMEWORKS.length - 1
    const to = { ArrowRight: at === last ? 0 : at + 1, ArrowLeft: at === 0 ? last : at - 1, Home: 0, End: last }[event.key]
    if (to === undefined) return
    event.preventDefault()
    select(FRAMEWORKS[to]!.id, true)
  })

  return {
    show(next) {
      demo = next
      render()
    },
    clear() {
      demo = undefined
      clearTimeout(copyTimer)
      host.replaceChildren()
    },
  }
}
