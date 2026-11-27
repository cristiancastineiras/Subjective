// The component contract, read from packages/core/custom-elements.json: every element, the module and the define
// function it comes from, its inputs and events, and the names each framework package gives it. The framework
// generator (gen-frameworks.mjs) and the playground's code examples (playground/vite.config.ts) both read it here,
// so a name is decided once.
import { existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

export const root = join(dirname(fileURLToPath(import.meta.url)), '..')
export const manifestPath = join(root, 'packages/core/custom-elements.json')

export const pascal = (s) => s.replace(/(^|-)(\w)/g, (_, __, c) => c.toUpperCase())
export const camel = (s) => s.replace(/-(\w)/g, (_, c) => c.toUpperCase())

/** Properties that are state or platform API, not inputs */
const NOT_INPUTS = new Set(['form', 'validity', 'validationMessage', 'willValidate', 'currentMessage', 'labels', 'shadowRootOptions'])

const exportsOf = (mod) => new Set((mod.exports ?? []).filter((e) => e.kind === 'js').map((e) => e.name))

/** Every element of the manifest, sorted by tag (`[]` when the core has not been built yet and `optional` is set) */
export function readElements({ optional = false } = {}) {
  if (optional && !existsSync(manifestPath)) return []
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'))
  const elements = []
  for (const mod of manifest.modules) {
    const exported = exportsOf(mod)
    const define = [...exported].find((n) => /^define[A-Z]/.test(n))
    for (const decl of mod.declarations ?? []) {
      if (!decl.tagName) continue
      const entry = mod.path.replace(/^src\//, '').replace(/\.ts$/, '')
      const fields = (decl.members ?? []).filter(
        (m) => m.kind === 'field' && !m.static && !m.readonly && !['private', 'protected'].includes(m.privacy) && !m.name.startsWith('_') && !m.name.startsWith('#') && !NOT_INPUTS.has(m.name),
      )
      const props = fields.map((f) => ({ name: f.name, attribute: f.attribute, type: f.type?.text ?? 'unknown', boolean: f.type?.text === 'boolean', number: f.type?.text === 'number' }))
      const events = (decl.events ?? []).filter((e) => e.name).map((e) => ({ name: e.name, type: e.type?.text ?? 'Event', handler: `on${pascal(e.name)}` }))
      const has = (n) => props.some((p) => p.name === n)
      // two-way binding: the checked state for check boxes and switches, else the value; updated on change / input
      const model = events.some((e) => e.name === 'change') ? (has('checked') ? 'checked' : has('value') ? 'value' : null) : null
      const component = pascal(decl.tagName)
      elements.push({ tag: decl.tagName, className: decl.name, exported: exported.has(decl.name), entry, define, props, events, model, component, directive: `${component}Directive` })
    }
  }
  return elements.sort((a, b) => a.tag.localeCompare(b.tag))
}

/**
 * What a code example needs per tag: the names in each package (`SubButton`, `SubButtonDirective`, `defineButton`
 * from `@sub/core/button`) and the attribute -> property map with kinds (`max="5"` is the number 5 in JSX / Vue).
 */
export function snippetTable(elements) {
  return Object.fromEntries(
    elements.map((e) => [
      e.tag,
      {
        component: e.component,
        directive: e.directive,
        define: e.define ?? null,
        entry: e.entry,
        attributes: Object.fromEntries(e.props.filter((p) => p.attribute).map((p) => [p.attribute, [p.name, p.boolean ? 'boolean' : p.number ? 'number' : 'string']])),
      },
    ]),
  )
}
