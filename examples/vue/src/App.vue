<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import { SubBreadcrumbs, SubButton, SubInput, SubNavMenu, SubOption, SubSelect, SubSwitch, configure } from '@sub/vue'
import { demos, formEntries, rendered } from '../../shared/gallery'
import { frameworkLinks } from '../../shared/frameworks'
import GalleryCard from './Card'

// two-way binding with v-model, a native form, the router
const name = ref('Ada')
const alerts = ref(true)
const plan = ref('pro')
const sent = ref('(not sent)')
const route = ref('/')
configure({ navigate: (href) => void (route.value = href) })

const status = ref(rendered())
let timer = 0
onMounted(() => (timer = window.setInterval(() => (status.value = rendered()), 300)))
onUnmounted(() => (clearInterval(timer), configure({ navigate: undefined })))

const reset = () => ((name.value = 'Ada'), (alerts.value = true), (plan.value = 'pro'))
const submit = (event: Event) => (sent.value = formEntries(event.currentTarget as HTMLFormElement))
const profile = () => (route.value = '/profile (link handler)')
</script>

<template>
  <main class="page">
    <header class="top">
      <h1>SUB × Vue</h1>
      <p class="status" data-status :data-ok="String(status.ok === status.total)">
        {{ status.ok }} / {{ status.total }} components rendered<template v-if="status.missing.length"> (missing: {{ status.missing.join(', ') }})</template>
      </p>
      <ul class="frameworks">
        <li v-for="f in frameworkLinks('vue')" :key="f.id">
          <a :href="f.href" :aria-current="f.current ? 'page' : undefined">{{ f.name }}</a>
        </li>
      </ul>
    </header>

    <section class="checks" aria-label="Framework checks">
      <article class="card" data-check="binding">
        <h2>Two-way binding</h2>
        <div class="preview">
          <div class="stack">
            <SubInput v-model="name" label="Your name" />
            <SubSwitch v-model="alerts" label="Email alerts" />
            <SubSelect v-model="plan" label="Plan">
              <SubOption value="free">Free</SubOption>
              <SubOption value="pro">Pro</SubOption>
            </SubSelect>
            <SubButton variant="secondary" @click="reset">Reset</SubButton>
          </div>
        </div>
        <output class="log" data-test="mirror">name={{ name }} · alerts={{ alerts }} · plan={{ plan }}</output>
      </article>

      <article class="card" data-check="form">
        <h2>Native form</h2>
        <div class="preview">
          <form class="stack" @submit.prevent="submit">
            <SubInput name="email" label="Email" type="email" value="ada@example.com" />
            <SubSelect name="size" label="Size" value="m">
              <SubOption value="s">Small</SubOption>
              <SubOption value="m">Medium</SubOption>
            </SubSelect>
            <SubSwitch name="news" label="Newsletter" checked />
            <SubButton type="submit">Send</SubButton>
          </form>
        </div>
        <output class="log" data-test="form-result">{{ sent }}</output>
      </article>

      <article class="card" data-check="router">
        <h2>Router</h2>
        <div class="preview">
          <div class="stack">
            <SubBreadcrumbs label="Breadcrumb">
              <a href="/">Home</a>
              <a href="/docs">Docs</a>
              <span>Guide</span>
            </SubBreadcrumbs>
            <SubNavMenu label="Sections">
              <a href="/profile" @click.prevent="profile">Profile</a>
            </SubNavMenu>
            <SubButton href="/settings">Settings</SubButton>
          </div>
        </div>
        <output class="log" data-test="route">Route: {{ route }}</output>
      </article>
    </section>

    <h2 class="section-title">Every component ({{ demos.length }})</h2>
    <div class="grid">
      <GalleryCard v-for="demo in demos" :key="demo.id" :demo="demo" />
    </div>
  </main>
</template>
