/**
 * The example of each page in every framework SUB supports. A demo's `html` is the source: it is parsed once
 * and printed by each framework's rules (component names, attribute -> property, typed values, imports), with
 * the names of the real packages (`virtual:sub-elements`, from the same contract as the framework generator).
 * The HTML tab is the demo's own markup, untouched: what you read is what the preview renders.
 */
import table from 'virtual:sub-elements'
import type { SnippetEntry } from '../../../scripts/contract.mjs'
import type { Language } from './highlight'

export type FrameworkId = 'html' | 'react' | 'vue' | 'angular' | 'svelte' | 'solid' | 'preact'

export interface Framework {
  id: FrameworkId
  label: string
  language: Language
  /** Brand mark (decorative: the tab's name is its label) */
  logo: string
  /** File name of the example, from the component name (`ButtonExample`) and the page id (`button`) */
  file: (component: string, id: string) => string
  /** The example's code */
  code: (demo: SnippetSource) => string
}

export interface SnippetSource {
  id: string
  html: string
}

// ------------------------------------------------------------------------------------------------ parsing
type Node = { kind: 'text'; text: string } | { kind: 'comment'; text: string } | { kind: 'element'; tag: string; attrs: Array<[string, string]>; children: Node[]; block: boolean }

/** Kept on one line unless the author broke it: an element is a block when its own text spans lines */
function parse(html: string): Node[] {
  const template = document.createElement('template')
  template.innerHTML = html.trim()
  const walk = (node: ChildNode): Node | null => {
    if (node.nodeType === Node.TEXT_NODE) return { kind: 'text', text: node.textContent ?? '' }
    if (node.nodeType === Node.COMMENT_NODE) return { kind: 'comment', text: (node.textContent ?? '').trim() }
    if (node.nodeType !== Node.ELEMENT_NODE) return null
    const el = node as Element
    const children = [...el.childNodes].map(walk).filter((n): n is Node => n !== null)
    const block = children.some((c) => (c.kind === 'text' ? c.text.includes('\n') : c.kind === 'comment' || c.block))
    return { kind: 'element', tag: el.localName, attrs: [...el.attributes].map((a) => [a.name, a.value]), children, block }
  }
  return [...template.content.childNodes].map(walk).filter((n): n is Node => n !== null)
}

const VOID = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'source', 'track', 'wbr'])
const HTML_BOOLEAN = new Set(['hidden', 'disabled', 'required', 'readonly', 'checked', 'multiple', 'autofocus', 'novalidate', 'open', 'selected', 'inert', 'formnovalidate', 'itemscope', 'playsinline', 'muted', 'controls', 'loop', 'autoplay', 'reversed'])

const pascal = (s: string) => s.replace(/(^|-)(\w)/g, (_, __, c: string) => c.toUpperCase())
const camel = (s: string) => s.replace(/-(\w)/g, (_, c: string) => c.toUpperCase())

/** The contract's entry for a SUB tag; before the core's first build, the naming rules alone */
function entryOf(tag: string): SnippetEntry | undefined {
  if (!tag.startsWith('sub-')) return undefined
  const name = tag.slice(4)
  return table[tag] ?? { component: pascal(tag), directive: `${pascal(tag)}Directive`, define: `define${pascal(name)}`, entry: name, attributes: {} }
}

/** SUB tags in order of appearance */
function subTags(nodes: Node[], into = new Set<string>()): Set<string> {
  for (const n of nodes) {
    if (n.kind !== 'element') continue
    if (entryOf(n.tag)) into.add(n.tag)
    subTags(n.children, into)
  }
  return into
}

const unique = <T>(list: T[]) => [...new Set(list)]
const defines = (tags: Set<string>) => unique([...tags].map((t) => entryOf(t)?.define).filter((d): d is string => !!d))

/** `import { A, B } from 'x'`, broken over lines when long (nothing to import: no line) */
function importLine(names: string[], from: string, indent = ''): string {
  if (!names.length) return ''
  const one = `${indent}import { ${names.join(', ')} } from '${from}'`
  return one.length <= MAX ? one : `${indent}import {\n${names.map((n) => `${indent}  ${n},`).join('\n')}\n${indent}} from '${from}'`
}

// ------------------------------------------------------------------------------------------------ printing
interface Dialect {
  /** The tag as written (`SubButton`, `sub-button`, `div`) */
  name: (tag: string) => string
  /** The attributes as written (`variant="danger"`, `max={5}`, `disabled`) */
  attrs: (tag: string, attrs: Array<[string, string]>) => string[]
  text: (text: string) => string
  comment: (text: string) => string
  /** `<X />` for an element without content (JSX, Vue); otherwise `<x></x>` (void elements: `<br>` / `<br />`) */
  selfClose: boolean
  voidEnd: string
  /** JSX drops a line break between words and an inline element, HTML reads it as a space: `{' '}` keeps it */
  space?: string
  /** A line before an element that starts a line (Svelte: which of its a11y warnings the demo means to trigger) */
  before?: (n: El) => string | undefined
}

const escapeText = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
/** `"value"`, or `'value'` when it holds double quotes */
const quote = (v: string) => {
  const s = v.replace(/&(?=[\w#]+;)/g, '&amp;')
  return !s.includes('"') ? `"${s}"` : !s.includes("'") ? `'${s}'` : `"${s.replace(/"/g, '&quot;')}"`
}
/** Line width (Prettier's default): longer opening tags get one attribute per line */
const MAX = 80

type El = Extract<Node, { kind: 'element' }>
/** Content as a stream: words, line breaks, inline elements, and what takes its own lines (blocks, comments) */
type Token = { t: 'text'; s: string } | { t: 'nl' } | { t: 'inline'; n: El } | { t: 'own'; n: Node }

function tokens(nodes: Node[]): Token[] {
  const out: Token[] = []
  for (const n of nodes) {
    if (n.kind === 'text')
      n.text.split('\n').forEach((part, k) => {
        if (k) out.push({ t: 'nl' })
        if (part) out.push({ t: 'text', s: part.replace(/\s+/g, ' ') })
      })
    else if (n.kind === 'comment' || n.block) out.push({ t: 'own', n })
    else out.push({ t: 'inline', n })
  }
  return out
}

const blank = (t: Token | undefined) => t?.t === 'text' && !t.s.trim()
/** Nothing else follows on this line */
const lineEnds = (toks: Token[], at: number) => {
  let k = at
  while (blank(toks[k])) k++
  return !toks[k] || toks[k]!.t === 'nl' || toks[k]!.t === 'own'
}

/** Children, line by line: the author's line breaks are kept, each line re-indented */
function print(nodes: Node[], d: Dialect, indent: string): string[] {
  const toks = tokens(nodes)
  const lines: string[] = []
  let run = ''
  let last: 'text' | 'inline' | null = null
  const endLine = () => {
    const t = run.trim()
    if (t) lines.push(indent + t)
    run = ''
  }
  for (let k = 0; k < toks.length; k++) {
    const tok = toks[k]!
    if (tok.t === 'nl') {
      endLine()
      const next = toks.slice(k + 1).find((x) => x.t !== 'nl' && !blank(x))
      const kind = next?.t === 'text' || next?.t === 'inline' ? next.t : null
      if (d.space && last && kind && last !== kind && lines.length) lines[lines.length - 1] += d.space
      last = null
    } else if (tok.t === 'own') {
      endLine()
      const note = tok.n.kind === 'element' ? d.before?.(tok.n) : undefined
      if (note) lines.push(indent + note)
      lines.push(...(tok.n.kind === 'element' ? printElement(tok.n, d, indent) : [indent + d.comment(tok.n.kind === 'comment' ? tok.n.text : '')]))
      last = null
    } else if (tok.t === 'text') {
      run += d.text(tok.s)
      if (tok.s.trim()) last = 'text'
    } else {
      const one = inline(tok.n, d)
      const note = !run.trim() ? d.before?.(tok.n) : undefined
      if (note) lines.push(indent + note)
      // alone on its line and too long: its attributes go one per line
      if (!run.trim() && lineEnds(toks, k + 1) && (indent + one).length > MAX) lines.push(...printElement(tok.n, d, indent))
      else run += one
      last = 'inline'
    }
  }
  endLine()
  return lines
}

/** An element and its content on one line (`<SubButton variant="danger">Delete</SubButton>`) */
function inline(n: Node, d: Dialect): string {
  if (n.kind === 'text') return d.text(n.text.replace(/\s+/g, ' '))
  if (n.kind === 'comment') return d.comment(n.text)
  const name = d.name(n.tag)
  const attrs = d.attrs(n.tag, n.attrs)
  const open = `<${name}${attrs.map((a) => ` ${a}`).join('')}`
  if (VOID.has(n.tag)) return open + d.voidEnd
  if (!n.children.length) return d.selfClose ? `${open} />` : `${open}></${name}>`
  return `${open}>${n.children.map((c) => inline(c, d)).join('')}</${name}>`
}

function printElement(n: El, d: Dialect, indent: string): string[] {
  const one = indent + inline(n, d)
  if (!n.block && one.length <= MAX) return [one]
  const name = d.name(n.tag)
  const attrs = d.attrs(n.tag, n.attrs)
  const head = `${indent}<${name}${attrs.map((a) => ` ${a}`).join('')}`
  // a long opening tag: one attribute per line
  const wrap = head.length + 1 > MAX && attrs.length > 1
  const openLines = wrap ? [`${indent}<${name}`, ...attrs.map((a) => `${indent}  ${a}`)] : [head]
  const close = wrap ? indent : ''
  if (VOID.has(n.tag) || !n.children.length) {
    const end = VOID.has(n.tag) ? d.voidEnd.trim() : d.selfClose ? '/>' : `></${name}>`
    return wrap ? [...openLines, `${indent}${end}`] : [`${head}${end.startsWith('/') ? ' ' : ''}${end}`]
  }
  const content = print(n.children, d, `${indent}  `)
  if (wrap) return [...openLines, `${close}>`, ...content, `${indent}</${name}>`]
  return [`${head}>`, ...content, `${indent}</${name}>`]
}

// ------------------------------------------------------------------------------------------------ dialects
const kindOf = (tag: string, attr: string) => entryOf(tag)?.attributes[attr]
const isNumber = (v: string) => v.trim() !== '' && Number.isFinite(Number(v))

/** Svelte, Angular: the markup itself, with each template language's escapes */
const markupDialect = (text: (s: string) => string, value: (tag: string, a: [string, string]) => string): Dialect => ({
  name: (tag) => tag,
  attrs: (tag, attrs) => attrs.map((a) => value(tag, a)),
  text: (s) => text(escapeText(s)),
  comment: (s) => `<!-- ${s} -->`,
  selfClose: false,
  voidEnd: '>',
})

/**
 * A SUB attribute written as its PROPERTY in a framework: frameworks set properties on custom elements and their
 * types list properties, and the two names can differ (`static` is `inline`, `offset-top` is `offset`).
 * Booleans are bare, numbers typed (`{5}`), strings as they are.
 */
function subAttr(tag: string, [name, value]: [string, string], write: (prop: string, kind: 'boolean' | 'number' | 'string', value: string) => string): string | undefined {
  const known = kindOf(tag, name)
  if (!known) return undefined
  const [prop, kind] = known
  return write(prop, kind === 'number' && !isNumber(value) ? 'string' : kind, value)
}

/** An attribute that is not a SUB property: boolean HTML attributes bare, the rest quoted */
const plain = ([name, value]: [string, string]) => (value === '' && HTML_BOOLEAN.has(name) ? name : `${name}=${quote(value)}`)

const INTERACTIVE = new Set(['a', 'button', 'input', 'select', 'textarea', 'summary', 'details', 'label', 'option', 'audio', 'video', 'iframe'])

/**
 * The demos mean these: `autofocus` on the field a dialog opens on (as the HTML spec advises), and `tabindex="0"`
 * on a region that scrolls (so a keyboard can scroll it). Svelte would warn whoever copies the example.
 */
function svelteIgnore(n: El): string | undefined {
  const has = (name: string) => n.attrs.find(([a]) => a === name)
  const codes = [
    has('autofocus') && 'a11y_autofocus',
    !n.tag.includes('-') && !INTERACTIVE.has(n.tag) && Number(has('tabindex')?.[1] ?? -1) >= 0 && 'a11y_no_noninteractive_tabindex',
  ].filter(Boolean)
  return codes.length ? `<!-- svelte-ignore ${codes.join(' ')} -->` : undefined
}

const svelteDialect: Dialect = {
  ...markupDialect(
    (s) => s.replace(/[{}]/g, (c) => `{'${c}'}`),
    (tag, a) =>
      subAttr(tag, a, (prop, kind, value) =>
        kind === 'boolean' ? prop : kind === 'number' ? `${prop}={${Number(value)}}` : /[{}]/.test(value) ? `${prop}={${JSON.stringify(value)}}` : `${prop}=${quote(value)}`,
      ) ?? (/[{}]/.test(a[1]) ? `${a[0]}={${JSON.stringify(a[1])}}` : plain(a)), // `{…}` in a value is an expression
  ),
  before: svelteIgnore,
}

/** Inside a TS template literal; `{`, `}` and `@` are template syntax in Angular text. Inputs by name: typed */
const angularDialect = markupDialect(
  (s) => s.replace(/[{}@]/g, (c) => (c === '@' ? '&#64;' : `{{ '${c}' }}`)),
  (tag, a) => subAttr(tag, a, (prop, kind, value) => (kind === 'boolean' ? prop : `${prop}=${quote(value)}`)) ?? plain(a),
)

const kebab = (s: string) => s.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)

/** Vue templates: props in kebab-case, numbers bound (`:max="5"`) */
const vueDialect: Dialect = {
  name: (tag) => entryOf(tag)?.component ?? tag,
  attrs: (tag, attrs) =>
    attrs.map(
      (a) =>
        subAttr(tag, a, (prop, kind, value) => (kind === 'boolean' ? kebab(prop) : kind === 'number' ? `:${kebab(prop)}="${Number(value)}"` : `${kebab(prop)}=${quote(value)}`)) ?? plain(a),
    ),
  text: (s) => escapeText(s).replace(/\{\{|\}\}/g, (c) => `{{ '${c}' }}`),
  comment: (s) => `<!-- ${s} -->`,
  selfClose: true,
  voidEnd: ' />',
}

const jsxText = (s: string) => escapeText(s).replace(/[{}]/g, (c) => `{'${c}'}`)
const jsxValue = (v: string) => (v.includes('"') || v.includes('\n') ? `{${JSON.stringify(v)}}` : `"${v}"`)
const jsxComment = (s: string) => `{/* ${s.replace(/\*\//g, '* /')} */}`

/** HTML attributes that are numbers in JSX's types (`tabIndex={0}`, `maxLength={20}`) */
const HTML_NUMBERS = new Set(['tabindex', 'maxlength', 'minlength', 'rows', 'cols', 'size', 'colspan', 'rowspan', 'span', 'start'])
const jsxSub = (tag: string, a: [string, string]) => subAttr(tag, a, (prop, kind, value) => (kind === 'boolean' ? prop : kind === 'number' ? `${prop}={${Number(value)}}` : `${prop}=${jsxValue(value)}`))

/** Solid and Preact: the elements themselves (both set properties on custom elements); typed values in braces */
const elementJsx: Dialect = {
  name: (tag) => tag,
  attrs: (tag, attrs) =>
    attrs.map(([name, value]) => {
      const sub = jsxSub(tag, [name, value])
      if (sub) return sub
      if (HTML_NUMBERS.has(name) && isNumber(value)) return `${name}={${Number(value)}}`
      if (value === '' && HTML_BOOLEAN.has(name)) return name
      return `${name}=${jsxValue(value)}`
    }),
  text: jsxText,
  comment: jsxComment,
  selfClose: true,
  voidEnd: ' />',
  space: "{' '}",
}

/** React's names for HTML attributes (on elements; SUB components use their own property names first) */
const REACT_ATTRS: Record<string, string> = {
  class: 'className', for: 'htmlFor', tabindex: 'tabIndex', readonly: 'readOnly', maxlength: 'maxLength', minlength: 'minLength',
  inputmode: 'inputMode', autocomplete: 'autoComplete', autofocus: 'autoFocus', enterkeyhint: 'enterKeyHint', colspan: 'colSpan',
  rowspan: 'rowSpan', contenteditable: 'contentEditable', spellcheck: 'spellCheck', accesskey: 'accessKey', crossorigin: 'crossOrigin',
  srcset: 'srcSet', datetime: 'dateTime', novalidate: 'noValidate', formnovalidate: 'formNoValidate', popovertarget: 'popoverTarget',
  referrerpolicy: 'referrerPolicy', fetchpriority: 'fetchPriority', playsinline: 'playsInline', itemscope: 'itemScope',
}

/**
 * `style="min-inline-size: 12rem; --x: 1"` -> `{{ minInlineSize: '12rem', '--x': 1 } as CSSProperties}`: React's
 * style type has no custom properties, so an object with one is cast (and the file imports the type)
 */
function styleObject(css: string): string {
  const entries = css
    .split(';')
    .map((d) => d.trim())
    .filter(Boolean)
    .map((d) => {
      const at = d.indexOf(':')
      const prop = d.slice(0, at).trim()
      const value = d.slice(at + 1).trim()
      const key = prop.startsWith('--') ? `'${prop}'` : camel(prop.replace(/^-(webkit|moz|ms)-/, (_, v: string) => `${v === 'ms' ? 'ms' : pascal(v)}-`))
      return `${key}: ${/^-?\d+(\.\d+)?$/.test(value) ? value : `'${value.replace(/'/g, "\\'")}'`}`
    })
  const object = `{ ${entries.join(', ')} }`
  return `{${css.includes('--') ? `${object} as CSSProperties` : object}}`
}

const reactDialect: Dialect = {
  name: (tag) => entryOf(tag)?.component ?? tag,
  attrs: (tag, attrs) =>
    attrs.map(([name, value]) => {
      const sub = jsxSub(tag, [name, value])
      if (sub) return sub
      if (name === 'style') return `style=${styleObject(value)}`
      if (HTML_NUMBERS.has(name) && isNumber(value)) return `${REACT_ATTRS[name] ?? name}={${Number(value)}}`
      // an uncontrolled native field keeps its first value (`value` alone would be read-only in React)
      const native = !entryOf(tag)
      const field = native && (tag === 'input' || tag === 'textarea' || tag === 'select')
      const prop = field && name === 'value' ? 'defaultValue' : field && name === 'checked' ? 'defaultChecked' : name.startsWith('aria-') || name.startsWith('data-') ? name : (REACT_ATTRS[name] ?? name)
      if (value === '' && (HTML_BOOLEAN.has(name) || prop === 'defaultChecked')) return prop
      return `${prop}=${jsxValue(value)}`
    }),
  text: jsxText,
  comment: jsxComment,
  selfClose: true,
  voidEnd: ' />',
  space: "{' '}",
}

// ------------------------------------------------------------------------------------------------ files
/** `button` -> `ButtonExample`, `a11y-tools` -> `A11yToolsExample` */
export const componentName = (id: string) => `${pascal(id)}Example`

/** The JSX body of a function component: one root as is, several in a fragment */
function jsxReturn(nodes: Node[], d: Dialect): string {
  const roots = nodes.filter((n) => n.kind !== 'text' || n.text.trim())
  const body = roots.length === 1 && roots[0]!.kind === 'element' ? print(roots, d, '    ') : ['    <>', ...print(nodes, d, '      '), '    </>']
  return `  return (\n${body.join('\n')}\n  )`
}

/** Sections of a file, one blank line apart (an empty one, such as imports of nothing, is left out) */
const file = (...parts: string[]) => `${parts.filter((p) => p.trim()).join('\n\n')}\n`

const memo = new Map<string, Node[]>()
const tree = (demo: SnippetSource) => {
  let nodes = memo.get(demo.id)
  if (!nodes) memo.set(demo.id, (nodes = parse(demo.html)))
  return nodes
}

function htmlCode(demo: SnippetSource): string {
  const tags = subTags(tree(demo))
  const byModule = new Map<string, string[]>()
  for (const tag of tags) {
    const e = entryOf(tag)!
    if (!e.define) continue
    byModule.set(e.entry, unique([...(byModule.get(e.entry) ?? []), e.define]))
  }
  const imports = [...byModule].map(([entry, names]) => importLine(names, `@sub/core/${entry}`, '  '))
  const calls = defines(tags).map((d) => `  ${d}()`)
  const script = calls.length ? `<script type="module">\n${imports.join('\n')}\n\n${calls.join('\n')}\n</script>` : ''
  return file(script, demo.html.trim())
}

function reactCode(demo: SnippetSource): string {
  const nodes = tree(demo)
  const components = unique([...subTags(nodes)].map((t) => entryOf(t)!.component))
  const body = `export function ${componentName(demo.id)}() {\n${jsxReturn(nodes, reactDialect)}\n}`
  const types = body.includes(' as CSSProperties}') ? "import type { CSSProperties } from 'react'\n" : ''
  return file(types + importLine(components, '@sub/react'), body)
}

function vueCode(demo: SnippetSource): string {
  const nodes = tree(demo)
  const components = unique([...subTags(nodes)].map((t) => entryOf(t)!.component))
  const script = components.length ? `<script setup lang="ts">\n${importLine(components, '@sub/vue')}\n</script>` : ''
  return file(script, `<template>\n${print(nodes, vueDialect, '  ').join('\n')}\n</template>`)
}

function angularCode(demo: SnippetSource): string {
  const nodes = tree(demo)
  const directives = unique([...subTags(nodes)].map((t) => entryOf(t)!.directive))
  // the template lives in a TS template literal
  const template = print(nodes, angularDialect, '    ')
    .join('\n')
    .replace(/[\\`]|\$\{/g, (c) => `\\${c}`)
  const list = `[${directives.join(', ')}]`
  const meta = directives.length
    ? [`  imports: ${list.length + 11 <= MAX ? list : `[\n${directives.map((d) => `    ${d},`).join('\n')}\n  ]`},`, '  schemas: [CUSTOM_ELEMENTS_SCHEMA],']
    : []
  const imports = [`import { ${directives.length ? 'CUSTOM_ELEMENTS_SCHEMA, ' : ''}Component } from '@angular/core'`, importLine(directives, '@sub/angular')].filter(Boolean).join('\n')
  const component = [`@Component({`, `  selector: 'app-${demo.id}-example',`, ...meta, '  template: `', template, '  `,', '})', `export class ${componentName(demo.id)}Component {}`].join('\n')
  return file(imports, component)
}

function svelteCode(demo: SnippetSource): string {
  const nodes = tree(demo)
  const names = defines(subTags(nodes))
  const script = names.length ? `<script lang="ts">\n${importLine(names, '@sub/svelte', '  ')}\n\n${names.map((d) => `  ${d}()`).join('\n')}\n</script>` : ''
  return file(script, print(nodes, svelteDialect, '').join('\n'))
}

const elementsCode = (pkg: string) => (demo: SnippetSource) => {
  const nodes = tree(demo)
  const names = defines(subTags(nodes))
  return file(importLine(names, pkg), names.map((d) => `${d}()`).join('\n'), `export function ${componentName(demo.id)}() {\n${jsxReturn(nodes, elementJsx)}\n}`)
}

// ------------------------------------------------------------------------------------------------ logos
// Each brand's own mark and colours, drawn small; `currentColor`-free so they read the same in both themes,
// except React's, which takes the darker cyan of its docs on light backgrounds (see .code-logo-react in CSS).
const svg = (viewBox: string, body: string) => `<svg class="code-logo" viewBox="${viewBox}" aria-hidden="true" focusable="false">${body}</svg>`

const LOGOS: Record<FrameworkId, string> = {
  html: svg(
    '0 0 512 512',
    '<path fill="#E44D26" d="M71 460 30 0h452l-41 460-185 52z"/><path fill="#F16529" d="m256 472 149-41 35-394H256z"/><path fill="#EBEBEB" d="M256 208h-75l-5-58h80V94H114l15 171h127zm0 147h-1l-63-17-4-45h-56l8 89 116 32z"/><path fill="#FFF" d="M255 208v57h70l-7 73-63 17v59l116-32 16-174zm0-114v56h137l5-56z"/>',
  ),
  react: svg(
    '-11.5 -10.23 23 20.46',
    '<g class="code-logo-react"><circle r="2.05" stroke="none"/><g fill="none" stroke-width="1"><ellipse rx="11" ry="4.2"/><ellipse rx="11" ry="4.2" transform="rotate(60)"/><ellipse rx="11" ry="4.2" transform="rotate(120)"/></g></g>',
  ),
  vue: svg('0 0 256 221', '<path fill="#41B883" d="M204.8 0H256L128 220.8 0 0h97.92L128 51.2 157.44 0z"/><path fill="#41B883" d="m0 0 128 220.8L256 0h-51.2L128 132.48 50.56 0z"/><path fill="#35495E" d="M50.56 0 128 133.12 204.8 0h-47.36L128 51.2 97.92 0z"/>'),
  angular: svg(
    '0 0 250 250',
    '<path fill="#DD0031" d="M125 30 31.9 63.2l14.2 123.1L125 230l78.9-43.7 14.2-123.1z"/><path fill="#C3002F" d="M125 30v200l78.9-43.7 14.2-123.1z"/><path fill="#FFF" d="M125 52.1 66.8 182.6h21.7l11.7-29.2h49.4l11.7 29.2H183zm17 83.3h-34l17-40.9z"/>',
  ),
  svelte: svg(
    '0 0 98.1 118',
    '<path fill="#FF3E00" d="M91.8 15.6C80.9-.1 59.2-4.7 43.6 5.2L16.1 22.8C8.6 27.5 3.4 35.2 1.9 43.9c-1.3 7.3-.2 14.8 3.3 21.3-2.4 3.6-4 7.6-4.7 11.8-1.6 8.9.5 18.1 5.7 25.4 11 15.7 32.6 20.3 48.2 10.4l27.5-17.5c7.5-4.7 12.7-12.4 14.2-21.1 1.3-7.3.2-14.8-3.3-21.3 2.4-3.6 4-7.6 4.7-11.8 1.7-9-.4-18.2-5.7-25.5"/><path fill="#FFF" d="M40.9 103.9c-8.9 2.3-18.2-1.2-23.4-8.7-3.2-4.4-4.4-9.9-3.5-15.3.2-.9.4-1.7.6-2.6l.5-1.6 1.4 1c3.3 2.4 6.9 4.2 10.8 5.4l1 .3-.1 1c-.1 1.4.3 2.9 1.1 4.1 1.6 2.3 4.4 3.4 7.1 2.7.6-.2 1.2-.4 1.7-.7L65.5 72c1.4-.9 2.3-2.2 2.6-3.8.3-1.6-.1-3.3-1-4.6-1.6-2.3-4.4-3.3-7.1-2.6-.6.2-1.2.4-1.7.7l-10.5 6.7c-1.7 1.1-3.6 1.9-5.6 2.4-8.9 2.3-18.2-1.2-23.4-8.7-3.1-4.4-4.4-9.9-3.4-15.3.9-5.2 4.1-9.9 8.6-12.7l27.5-17.5c1.7-1.1 3.6-1.9 5.6-2.5 8.9-2.3 18.2 1.2 23.4 8.7 3.2 4.4 4.4 9.9 3.5 15.3-.2.9-.4 1.7-.7 2.6l-.5 1.6-1.4-1c-3.3-2.4-6.9-4.2-10.8-5.4l-1-.3.1-1c.1-1.4-.3-2.9-1.1-4.1-1.6-2.3-4.4-3.3-7.1-2.6-.6.2-1.2.4-1.7.7L32.4 46.1c-1.4.9-2.3 2.2-2.6 3.8s.1 3.3 1 4.6c1.6 2.3 4.4 3.3 7.1 2.6.6-.2 1.2-.4 1.7-.7l10.5-6.7c1.7-1.1 3.6-1.9 5.6-2.5 8.9-2.3 18.2 1.2 23.4 8.7 3.2 4.4 4.4 9.9 3.5 15.3-.9 5.2-4.1 9.9-8.6 12.7l-27.5 17.5c-1.7 1.1-3.6 1.9-5.6 2.5"/>',
  ),
  solid: svg(
    '0 0 32 32',
    '<defs><linearGradient id="code-logo-solid-a" x1="0" x2="1" y1="0" y2="1"><stop offset="0" stop-color="#76B3E1"/><stop offset="1" stop-color="#4377BB"/></linearGradient><linearGradient id="code-logo-solid-b" x1="0" x2="1" y1="0" y2="1"><stop offset="0" stop-color="#518AC8"/><stop offset="1" stop-color="#2C4F7C"/></linearGradient></defs><path fill="url(#code-logo-solid-a)" d="M9.6 4.5h15.2a3.6 3.6 0 0 1 3.1 5.4l-1.7 3a5.4 5.4 0 0 1-4.7 2.7H6.3a3.6 3.6 0 0 1-3.1-5.4l1.7-3a5.4 5.4 0 0 1 4.7-2.7z"/><path fill="url(#code-logo-solid-b)" d="M10.8 16.4H26a3.6 3.6 0 0 1 3.1 5.4l-1.7 3a5.4 5.4 0 0 1-4.7 2.7H7.5a3.6 3.6 0 0 1-3.1-5.4l1.7-3a5.4 5.4 0 0 1 4.7-2.7z"/>',
  ),
  preact: svg(
    '-256 -256 512 512',
    '<path fill="#673AB8" d="M0-256 221.7-128v256L0 256-221.7 128v-256z"/><g fill="none" stroke="#FFF" stroke-width="16"><ellipse rx="75" ry="196" transform="rotate(52.5)"/><ellipse rx="75" ry="196" transform="rotate(-52.5)"/></g><circle r="34" fill="#FFF"/>',
  ),
}

export const FRAMEWORKS: Framework[] = [
  { id: 'html', label: 'HTML', language: 'html', logo: LOGOS.html, file: (_, id) => `${id}-example.html`, code: htmlCode },
  { id: 'react', label: 'React', language: 'tsx', logo: LOGOS.react, file: (c) => `${c}.tsx`, code: reactCode },
  { id: 'vue', label: 'Vue', language: 'vue', logo: LOGOS.vue, file: (c) => `${c}.vue`, code: vueCode },
  { id: 'angular', label: 'Angular', language: 'ts', logo: LOGOS.angular, file: (_, id) => `${id}-example.component.ts`, code: angularCode },
  { id: 'svelte', label: 'Svelte', language: 'svelte', logo: LOGOS.svelte, file: (c) => `${c}.svelte`, code: svelteCode },
  { id: 'solid', label: 'Solid', language: 'tsx', logo: LOGOS.solid, file: (c) => `${c}.tsx`, code: elementsCode('@sub/solid') },
  { id: 'preact', label: 'Preact', language: 'tsx', logo: LOGOS.preact, file: (c) => `${c}.tsx`, code: elementsCode('@sub/preact') },
]
