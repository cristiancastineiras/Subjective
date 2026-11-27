<script lang="ts">
  // A card of the gallery: the demo rendered by Svelte, then the playground demo's own wiring
  import { onMount } from 'svelte'
  import { parseHtml, type Demo } from '../../shared/gallery'
  import Node from './Node.svelte'

  let { demo }: { demo: Demo } = $props()
  let log = $state('No event yet')
  let preview: HTMLDivElement | undefined = $state()
  const tree = parseHtml(demo.html)
  const write = (line: string) => (log = line)
  onMount(() => preview && demo.setup?.(preview, write))
</script>

<article class="card" data-card={demo.id}>
  <h2>{demo.title} <span class="group">{demo.group}</span></h2>
  <div class="preview" data-preview={demo.id} bind:this={preview}>
    {#each tree as node}<Node {node} log={write} />{/each}
  </div>
  <output class="log" data-log={demo.id}>{log}</output>
</article>
