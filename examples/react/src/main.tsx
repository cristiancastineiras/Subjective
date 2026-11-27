import '@sub/tokens/fonts.css'
import '@sub/tokens/theme.css'
import '../../shared/styles.css'
import { createElement, useEffect, useMemo, useRef, useState, type ElementType, type ReactNode } from 'react'
import { createRoot } from 'react-dom/client'
import * as Sub from '@sub/react'
import { SubBreadcrumbs, SubButton, SubInput, SubNavMenu, SubOption, SubSelect, SubSwitch, useSubNavigate } from '@sub/react'
import { ELEMENTS, demos, describe, formEntries, handlerName, parseHtml, rendered, toProps, type Demo, type GNode } from '../../shared/gallery'
import { frameworkLinks } from '../../shared/frameworks'

const components = Sub as unknown as Record<string, ElementType>
const BOOLEAN_HTML = new Set(['disabled', 'required', 'checked', 'hidden', 'open', 'multiple', 'selected', 'autofocus'])
const REACT_NAMES: Record<string, string> = { class: 'className', for: 'htmlFor', tabindex: 'tabIndex', readonly: 'readOnly', maxlength: 'maxLength', colspan: 'colSpan', novalidate: 'noValidate' }

/** `style="a: b; --c: d"` -> { a: 'b', '--c': 'd' } */
const styleObject = (css: string) =>
  Object.fromEntries(
    css
      .split(';')
      .map((rule) => rule.split(/:(.*)/s).map((s) => s.trim()))
      .filter(([k, v]) => k && v)
      .map(([k, v]) => [k!.startsWith('--') ? k : k!.replace(/-(\w)/g, (_, c: string) => c.toUpperCase()), v]),
  )

/** React's spelling of HTML attributes */
function reactProps(attrs: Record<string, unknown>, native: boolean): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const [name, value] of Object.entries(attrs)) {
    if (name === 'style' && typeof value === 'string') out.style = styleObject(value)
    else if (native && BOOLEAN_HTML.has(name)) out[name] = true
    else out[REACT_NAMES[name] ?? name] = value
  }
  return out
}

/** One node of a demo, rendered by React: SUB elements through their @sub/react component, the rest as DOM */
function render(node: GNode, key: number, log: (line: string) => void): ReactNode {
  if (typeof node === 'string') return node
  const children = node.children.map((child, i) => render(child, i, log))
  const meta = ELEMENTS[node.tag]
  if (!meta) return createElement(node.tag, { key, ...reactProps(node.attrs, true) }, ...children)
  const props: Record<string, unknown> = { key, ...reactProps(toProps(node.tag, node.attrs), false) }
  for (const event of meta.events) props[handlerName(event)] = (e: Event) => log(describe(e))
  return createElement(components[meta.component] ?? node.tag, props, ...children)
}

function Card({ demo }: { demo: Demo }) {
  const [log, setLog] = useState('No event yet')
  const preview = useRef<HTMLDivElement>(null)
  const wired = useRef(false)
  // rendered once: a new log line must not re-apply the demo's attributes over what the user changed
  const nodes = useMemo(() => parseHtml(demo.html).map((node, i) => render(node, i, setLog)), [demo])
  useEffect(() => {
    // the playground demo's own wiring (rows of a table, options of a cascader...), once React rendered the card
    if (!preview.current || wired.current) return
    wired.current = true
    demo.setup?.(preview.current, setLog)
  }, [demo])
  return (
    <article className="card" data-card={demo.id}>
      <h2>
        {demo.title} <span className="group">{demo.group}</span>
      </h2>
      <div className="preview" data-preview={demo.id} ref={preview}>
        {nodes}
      </div>
      <output className="log" data-log={demo.id}>
        {log}
      </output>
    </article>
  )
}

/** Two-way binding, a native form and the router: the three things a framework must get right */
function Checks() {
  const [name, setName] = useState('Ada')
  const [alerts, setAlerts] = useState(true)
  const [plan, setPlan] = useState('pro')
  const [sent, setSent] = useState('(not sent)')
  const [route, setRoute] = useState('/')
  useSubNavigate(setRoute)
  const value = (e: Event) => (e.currentTarget as HTMLElement & { value: string }).value

  return (
    <section className="checks" aria-label="Framework checks">
      <article className="card" data-check="binding">
        <h2>Two-way binding</h2>
        <div className="preview">
          <div className="stack">
            <SubInput label="Your name" value={name} onInput={(e) => setName((e.currentTarget as HTMLElement & { value: string }).value)} onChange={(e) => setName(value(e))} />
            <SubSwitch label="Email alerts" checked={alerts} onChange={(e) => setAlerts((e.currentTarget as HTMLElement & { checked: boolean }).checked)} />
            <SubSelect label="Plan" value={plan} onChange={(e) => setPlan(value(e))}>
              <SubOption value="free">Free</SubOption>
              <SubOption value="pro">Pro</SubOption>
            </SubSelect>
            <SubButton variant="secondary" onClick={() => (setName('Ada'), setAlerts(true), setPlan('pro'))}>
              Reset
            </SubButton>
          </div>
        </div>
        <output className="log" data-test="mirror">
          name={name} · alerts={String(alerts)} · plan={plan}
        </output>
      </article>

      <article className="card" data-check="form">
        <h2>Native form</h2>
        <div className="preview">
          <form className="stack" onSubmit={(e) => (e.preventDefault(), setSent(formEntries(e.currentTarget)))}>
            <SubInput name="email" label="Email" type="email" value="ada@example.com" />
            <SubSelect name="size" label="Size" value="m">
              <SubOption value="s">Small</SubOption>
              <SubOption value="m">Medium</SubOption>
            </SubSelect>
            <SubSwitch name="news" label="Newsletter" checked />
            <SubButton type="submit">Send</SubButton>
          </form>
        </div>
        <output className="log" data-test="form-result">
          {sent}
        </output>
      </article>

      <article className="card" data-check="router">
        <h2>Router</h2>
        <div className="preview">
          <div className="stack">
            <SubBreadcrumbs label="Breadcrumb">
              <a href="/">Home</a>
              <a href="/docs">Docs</a>
              <span>Guide</span>
            </SubBreadcrumbs>
            <SubNavMenu label="Sections">
              <a href="/profile" onClick={(e) => (e.preventDefault(), setRoute('/profile (link handler)'))}>
                Profile
              </a>
            </SubNavMenu>
            <SubButton href="/settings">Settings</SubButton>
          </div>
        </div>
        <output className="log" data-test="route">
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
    <main className="page">
      <header className="top">
        <h1>SUB × React</h1>
        <p className="status" data-status data-ok={String(status.ok === status.total)}>
          {status.ok} / {status.total} components rendered{status.missing.length ? ` (missing: ${status.missing.join(', ')})` : ''}
        </p>
        <ul className="frameworks">
          {frameworkLinks('react').map((f) => (
            <li key={f.id}>
              <a href={f.href} aria-current={f.current ? 'page' : undefined}>
                {f.name}
              </a>
            </li>
          ))}
        </ul>
      </header>
      <Checks />
      <h2 className="section-title">Every component ({demos.length})</h2>
      <div className="grid">
        {demos.map((demo) => (
          <Card key={demo.id} demo={demo} />
        ))}
      </div>
    </main>
  )
}

createRoot(document.getElementById('app')!).render(<App />)
