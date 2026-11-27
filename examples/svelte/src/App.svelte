<script lang="ts">
  import { onDestroy, onMount } from 'svelte'
  import { configure } from '@sub/svelte'
  import { demos, formEntries, rendered } from '../../shared/gallery'
  import { frameworkLinks } from '../../shared/frameworks'
  import Card from './Card.svelte'

  // two-way binding, a native form, the router
  let name = $state('Ada')
  let alerts = $state(true)
  let plan = $state('pro')
  let sent = $state('(not sent)')
  let route = $state('/')
  configure({ navigate: (href) => void (route = href) })

  let status = $state(rendered())
  let timer = 0
  onMount(() => (timer = window.setInterval(() => (status = rendered()), 300)))
  onDestroy(() => (clearInterval(timer), configure({ navigate: undefined })))

  const reset = () => ((name = 'Ada'), (alerts = true), (plan = 'pro'))
  const submit = (event: SubmitEvent) => (event.preventDefault(), (sent = formEntries(event.currentTarget as HTMLFormElement)))
  const profile = (event: MouseEvent) => (event.preventDefault(), (route = '/profile (link handler)'))
</script>

<main class="page">
  <header class="top">
    <h1>SUB × Svelte</h1>
    <p class="status" data-status data-ok={String(status.ok === status.total)}>
      {status.ok} / {status.total} components rendered{status.missing.length ? ` (missing: ${status.missing.join(', ')})` : ''}
    </p>
    <ul class="frameworks">
      {#each frameworkLinks('svelte') as f (f.id)}
        <li><a href={f.href} aria-current={f.current ? 'page' : undefined}>{f.name}</a></li>
      {/each}
    </ul>
  </header>

  <section class="checks" aria-label="Framework checks">
    <article class="card" data-check="binding">
      <h2>Two-way binding</h2>
      <div class="preview">
        <div class="stack">
          <sub-input label="Your name" value={name} oninput={(e) => (name = e.currentTarget.value)} onchange={(e) => (name = e.currentTarget.value)}></sub-input>
          <sub-switch label="Email alerts" checked={alerts} onchange={(e) => (alerts = e.currentTarget.checked)}></sub-switch>
          <sub-select label="Plan" value={plan} onchange={(e) => (plan = e.currentTarget.value)}>
            <sub-option value="free">Free</sub-option>
            <sub-option value="pro">Pro</sub-option>
          </sub-select>
          <sub-button variant="secondary" onclick={reset}>Reset</sub-button>
        </div>
      </div>
      <output class="log" data-test="mirror">name={name} · alerts={String(alerts)} · plan={plan}</output>
    </article>

    <article class="card" data-check="form">
      <h2>Native form</h2>
      <div class="preview">
        <form class="stack" onsubmit={submit}>
          <sub-input name="email" label="Email" type="email" value="ada@example.com"></sub-input>
          <sub-select name="size" label="Size" value="m">
            <sub-option value="s">Small</sub-option>
            <sub-option value="m">Medium</sub-option>
          </sub-select>
          <sub-switch name="news" label="Newsletter" checked></sub-switch>
          <sub-button type="submit">Send</sub-button>
        </form>
      </div>
      <output class="log" data-test="form-result">{sent}</output>
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
            <a href="/profile" onclick={profile}>Profile</a>
          </sub-nav-menu>
          <sub-button href="/settings">Settings</sub-button>
        </div>
      </div>
      <output class="log" data-test="route">Route: {route}</output>
    </article>
  </section>

  <h2 class="section-title">Every component ({demos.length})</h2>
  <div class="grid">
    {#each demos as demo (demo.id)}<Card {demo} />{/each}
  </div>
</main>
