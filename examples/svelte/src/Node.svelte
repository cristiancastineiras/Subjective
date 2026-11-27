<script lang="ts">
  // One node of a demo, rendered by Svelte: SUB elements get their typed properties and `on<event>` listeners
  import { ELEMENTS, describe, toProps, type GNode } from '../../shared/gallery'
  import Node from './Node.svelte'

  let { node, log }: { node: GNode; log: (line: string) => void } = $props()

  const meta = typeof node === 'string' ? undefined : ELEMENTS[node.tag]
  const attrs: Record<string, unknown> =
    typeof node === 'string'
      ? {}
      : meta
        ? { ...toProps(node.tag, node.attrs), ...Object.fromEntries(meta.events.map((event) => [`on${event}`, (e: Event) => log(describe(e))])) }
        : { ...node.attrs }
</script>

{#if typeof node === 'string'}{node}{:else}<svelte:element this={node.tag} {...attrs}>{#each node.children as child}<Node node={child} {log} />{/each}</svelte:element>{/if}
