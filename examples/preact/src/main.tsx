import '@sub/tokens/fonts.css'
import '@sub/tokens/theme.css'
import '../../shared/styles.css'
import { h, render as mount, type ComponentChildren } from 'preact'
import { useEffect, useMemo, useRef, useState } from 'preact/hooks'
import { configure, registerAll } from '@sub/preact'
import { ELEMENTS, demos, describe, formEntries, parseHtml, rendered, toProps, type Demo, type GNode } from '../../shared/gallery'
import { frameworkLinks } from '../../shared/frameworks'

registerAll()

/** One node of a demo, rendered by Preact: SUB elements as typed custom elements (properties + `on<event>`) */
function render(node: GNode, key: number, log: (line: string) => void): ComponentChildren {
  if (typeof node === 'string') return node
  const children = node.children.map((child, i) => render(child, i, log))
  const meta = ELEMENTS[node.tag]
  if (!meta) return h(node.tag, { key, ...node.attrs }, children)
  const props: Record<string, unknown> = { key, ...toProps(node.tag, node.attrs) }
  for (const event of meta.events) props[`on${event}`] = (e: Event) => log(describe(e))
  return h(node.tag, props, children)
}

function Card({ demo }: { demo: Demo }) {
  const [log, setLog] = useState('No event yet')
  const preview = useRef<HTMLDivElement>(null)
  // rendered once: a new log line must not re-apply the demo's attributes over what the user changed
  const nodes = useMemo(() => parseHtml(demo.html).map((node, i) => render(node, i, setLog)), [demo])
  useEffect(() => {
    if (preview.current) demo.setup?.(preview.current, setLog)
  }, [demo])
  return (
    <article class="card" data-card={demo.id}>
      <h2>
        {demo.title} <span class="group">{demo.group}</span>
      </h2>
      <div class="preview" data-preview={demo.id} ref={preview}>
        {nodes}
      </div>
      <output class="log" data-log={demo.id}>
        {log}
      </output>
    </article>
  )
}

function Checks() {
  const [name, setName] = useState('Ada')
  const [alerts, setAlerts] = useState(true)
  const [plan, setPlan] = useState('pro')
  const [sent, setSent] = useState('(not sent)')
  const [route, setRoute] = useState('/')
  useEffect(() => {
    configure({ navigate: (href) => void setRoute(href) })
    return () => configure({ navigate: undefined })
  }, [])

  return (
    <section class="checks" aria-label="Framework checks">
      <article class="card" data-check="binding">
        <h2>Two-way binding</h2>
        <div class="preview">
          <div class="stack">
            <sub-input label="Your name" value={name} onInput={(e) => setName(e.currentTarget.value)} />
            <sub-switch label="Email alerts" checked={alerts} onchange={(e) => setAlerts((e.currentTarget as HTMLElement & { checked: boolean }).checked)} />
            <sub-select label="Plan" value={plan} onchange={(e) => setPlan((e.currentTarget as HTMLElement & { value: string }).value)}>
              <sub-option value="free">Free</sub-option>
              <sub-option value="pro">Pro</sub-option>
            </sub-select>
            <sub-button variant="secondary" onClick={() => (setName('Ada'), setAlerts(true), setPlan('pro'))}>
              Reset
            </sub-button>
          </div>
        </div>
        <output class="log" data-test="mirror">
          name={name} · alerts={String(alerts)} · plan={plan}
        </output>
      </article>

      <article class="card" data-check="form">
        <h2>Native form</h2>
        <div class="preview">
          <form class="stack" onSubmit={(e) => (e.preventDefault(), setSent(formEntries(e.currentTarget)))}>
            <sub-input name="email" label="Email" type="email" value="ada@example.com" />
            <sub-select name="size" label="Size" value="m">
              <sub-option value="s">Small</sub-option>
              <sub-option value="m">Medium</sub-option>
            </sub-select>
            <sub-switch name="news" label="Newsletter" checked />
            <sub-button type="submit">Send</sub-button>
          </form>
        </div>
        <output class="log" data-test="form-result">
          {sent}
        </output>
      </article>

      <article class="card" data-check="router">
        <h2>Router</h2>
        <div class="preview">
          <div class="stack">
            <sub-breadcrumbs label="Breadcrumb">
              <a href="/">Home</a>
              <a href="/docs">Docs</a>
              <span>Guide</span>
            </sub-breadcrumbs>
            <sub-nav-menu label="Sections">
              <a href="/profile" onClick={(e) => (e.preventDefault(), setRoute('/profile (link handler)'))}>
                Profile
              </a>
            </sub-nav-menu>
            <sub-button href="/settings">Settings</sub-button>
          </div>
        </div>
        <output class="log" data-test="route">
          Route: {route}
        </output>
      </article>
    </section>
  )
}

function App() {
  const [status, setStatus] = useState(() => rendered())
  useEffect(() => {
    const timer = setInterval(() => setStatus(rendered()), 300)
    return () => clearInterval(timer)
  }, [])
  return (
    <main class="page">
      <header class="top">
        <h1>SUB × Preact</h1>
        <p class="status" data-status data-ok={String(status.ok === status.total)}>
          {status.ok} / {status.total} components rendered{status.missing.length ? ` (missing: ${status.missing.join(', ')})` : ''}
        </p>
        <ul class="frameworks">
          {frameworkLinks('preact').map((f) => (
            <li key={f.id}>
              <a href={f.href} aria-current={f.current ? 'page' : undefined}>
                {f.name}
              </a>
            </li>
          ))}
        </ul>
      </header>
      <Checks />
      <h2 class="section-title">Every component ({demos.length})</h2>
      <div class="grid">
        {demos.map((demo) => (
          <Card key={demo.id} demo={demo} />
        ))}
      </div>
    </main>
  )
}

mount(<App />, document.getElementById('app')!)
