import '@sub/tokens/fonts.css'
import '@sub/tokens/theme.css'
import '../../shared/styles.css'
import { For, createSignal, onCleanup, onMount, type JSX } from 'solid-js'
import { Dynamic, render } from 'solid-js/web'
import { configure, registerAll } from '@sub/solid'
import { ELEMENTS, demos, describe, formEntries, parseHtml, rendered, toProps, type Demo, type GNode } from '../../shared/gallery'
import { frameworkLinks } from '../../shared/frameworks'

registerAll()

/** One node of a demo, rendered by Solid: SUB elements get properties and `on:<event>` listeners */
function Node(props: { node: GNode; log: (line: string) => void }): JSX.Element {
  const node = props.node
  if (typeof node === 'string') return node
  const meta = ELEMENTS[node.tag]
  const attrs: Record<string, unknown> = meta ? toProps(node.tag, node.attrs) : { ...node.attrs }
  if (meta) for (const event of meta.events) attrs[`on:${event}`] = (e: Event) => props.log(describe(e))
  return (
    <Dynamic component={node.tag} {...attrs}>
      <For each={node.children}>{(child) => <Node node={child} log={props.log} />}</For>
    </Dynamic>
  )
}

function Card(props: { demo: Demo }) {
  const [log, setLog] = createSignal('No event yet')
  let preview!: HTMLDivElement
  const tree = parseHtml(props.demo.html)
  onMount(() => props.demo.setup?.(preview, setLog))
  return (
    <article class="card" data-card={props.demo.id}>
      <h2>
        {props.demo.title} <span class="group">{props.demo.group}</span>
      </h2>
      <div class="preview" data-preview={props.demo.id} ref={preview}>
        <For each={tree}>{(node) => <Node node={node} log={setLog} />}</For>
      </div>
      <output class="log" data-log={props.demo.id}>
        {log()}
      </output>
    </article>
  )
}

function Checks() {
  const [name, setName] = createSignal('Ada')
  const [alerts, setAlerts] = createSignal(true)
  const [plan, setPlan] = createSignal('pro')
  const [sent, setSent] = createSignal('(not sent)')
  const [route, setRoute] = createSignal('/')
  configure({ navigate: (href) => void setRoute(href) })
  onCleanup(() => configure({ navigate: undefined }))
  const value = (e: Event) => (e.currentTarget as HTMLElement & { value: string }).value

  return (
    <section class="checks" aria-label="Framework checks">
      <article class="card" data-check="binding">
        <h2>Two-way binding</h2>
        <div class="preview">
          <div class="stack">
            <sub-input label="Your name" prop:value={name()} on:change={(e) => setName(value(e))} on:input={(e: Event) => setName(value(e))} />
            <sub-switch label="Email alerts" prop:checked={alerts()} on:change={(e) => setAlerts((e.currentTarget as HTMLElement & { checked: boolean }).checked)} />
            <sub-select label="Plan" prop:value={plan()} on:change={(e) => setPlan(value(e))}>
              <sub-option value="free">Free</sub-option>
              <sub-option value="pro">Pro</sub-option>
            </sub-select>
            <sub-button variant="secondary" on:click={() => (setName('Ada'), setAlerts(true), setPlan('pro'))}>
              Reset
            </sub-button>
          </div>
        </div>
        <output class="log" data-test="mirror">
          name={name()} · alerts={String(alerts())} · plan={plan()}
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
          {sent()}
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
          Route: {route()}
        </output>
      </article>
    </section>
  )
}

function App() {
  const [status, setStatus] = createSignal(rendered())
  const timer = setInterval(() => setStatus(rendered()), 300)
  onCleanup(() => clearInterval(timer))
  return (
    <main class="page">
      <header class="top">
        <h1>SUB × SolidJS</h1>
        <p class="status" data-status data-ok={String(status().ok === status().total)}>
          {status().ok} / {status().total} components rendered{status().missing.length ? ` (missing: ${status().missing.join(', ')})` : ''}
        </p>
        <ul class="frameworks">
          <For each={frameworkLinks('solid')}>
            {(f) => (
              <li>
                <a href={f.href} aria-current={f.current ? 'page' : undefined}>
                  {f.name}
                </a>
              </li>
            )}
          </For>
        </ul>
      </header>
      <Checks />
      <h2 class="section-title">Every component ({demos.length})</h2>
      <div class="grid">
        <For each={demos}>{(demo) => <Card demo={demo} />}</For>
      </div>
    </main>
  )
}

render(() => <App />, document.getElementById('app')!)
