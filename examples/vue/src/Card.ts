import { defineComponent, h, onMounted, ref, type Component, type PropType, type VNode } from 'vue'
import * as Sub from '@sub/vue'
import { ELEMENTS, describe, handlerName, parseHtml, toProps, type Demo, type GNode } from '../../shared/gallery'

const components = Sub as unknown as Record<string, Component>

/** One node of a demo, rendered by Vue: SUB elements through their @sub/vue component (props + emits) */
function render(node: GNode, log: (line: string) => void): VNode | string {
  if (typeof node === 'string') return node
  const children = node.children.map((child) => render(child, log))
  const meta = ELEMENTS[node.tag]
  if (!meta) return h(node.tag, { ...node.attrs }, children)
  const props: Record<string, unknown> = toProps(node.tag, node.attrs)
  for (const event of meta.events) props[handlerName(event)] = (e: Event) => log(describe(e))
  const component = components[meta.component]
  return component ? h(component, props, { default: () => children }) : h(node.tag, props, children)
}

/**
 * The demo itself, in its own component: it depends on nothing that changes, so a new log line never re-renders
 * it (and never re-applies the demo's attributes over what the user changed). Then the demo's own wiring runs.
 */
const Preview = defineComponent({
  name: 'GalleryPreview',
  props: {
    demo: { type: Object as PropType<Demo>, required: true },
    log: { type: Function as PropType<(line: string) => void>, required: true },
  },
  setup(props) {
    const root = ref<HTMLElement>()
    const tree = parseHtml(props.demo.html)
    onMounted(() => root.value && props.demo.setup?.(root.value, props.log))
    return () => h('div', { class: 'preview', 'data-preview': props.demo.id, ref: root }, tree.map((node) => render(node, props.log)))
  },
})

/** A card of the gallery */
export default defineComponent({
  name: 'GalleryCard',
  props: { demo: { type: Object as PropType<Demo>, required: true } },
  setup(props) {
    const log = ref('No event yet')
    const write = (line: string) => (log.value = line)
    return () =>
      h('article', { class: 'card', 'data-card': props.demo.id }, [
        h('h2', [props.demo.title, ' ', h('span', { class: 'group' }, props.demo.group)]),
        h(Preview, { demo: props.demo, log: write }),
        h('output', { class: 'log', 'data-log': props.demo.id }, log.value),
      ])
  },
})
