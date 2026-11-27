/**
 * Syntax colouring for the playground's code examples: markup (HTML, JSX, Vue / Svelte / Angular templates) and
 * TypeScript in one small tokenizer, no dependency. The result is escaped HTML with `<span class="tok-…">`
 * around each token; the text itself is unchanged, so screen readers and Copy read plain code.
 */

const escape = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const span = (kind: string, text: string) => (text ? `<span class="tok-${kind}">${escape(text)}</span>` : '')

const KEYWORDS = new Set(['import', 'from', 'export', 'default', 'const', 'let', 'function', 'return', 'class', 'new', 'type', 'interface', 'if', 'else', 'as', 'await', 'async', 'extends'])
const LITERALS = new Set(['true', 'false', 'null', 'undefined', 'this'])

/** `{ ... }` with nested braces, from `start` (which is a `{`); returns the index after the closing brace */
function balanced(code: string, start: number): number {
  let depth = 0
  for (let i = start; i < code.length; i++) {
    const c = code[i]
    if (c === '{') depth++
    else if (c === '}' && --depth === 0) return i + 1
    else if (c === '"' || c === "'" || c === '`') {
      const close = code.indexOf(c, i + 1)
      if (close < 0) return code.length
      i = close
    }
  }
  return code.length
}

/** A tag from `<` to `>`: name, attributes and their values (strings, `{expressions}`) */
function tag(code: string, at: number): [html: string, end: number] {
  const head = /^<\/?([A-Za-z][\w.:-]*)/.exec(code.slice(at))!
  const name = head[1]!
  const closing = head[0].startsWith('</')
  // components (custom elements, PascalCase framework components) stand out from plain HTML
  const kind = name.includes('-') || /^[A-Z]/.test(name) ? 'component' : 'tag'
  let out = span('punct', closing ? '</' : '<') + span(kind, name)
  let i = at + head[0].length
  while (i < code.length) {
    const rest = code.slice(i)
    const space = /^\s+/.exec(rest)
    if (space) {
      out += escape(space[0])
      i += space[0].length
      continue
    }
    const end = /^\/?>/.exec(rest)
    if (end) return [out + span('punct', end[0]), i + end[0].length]
    const attr = /^[^\s=/>"'{]+/.exec(rest)
    if (attr) {
      out += span('attr', attr[0])
      i += attr[0].length
      if (code[i] === '=') {
        out += span('punct', '=')
        i++
        const q = code[i]
        if (q === '"' || q === "'") {
          const close = code.indexOf(q, i + 1)
          const stop = close < 0 ? code.length : close + 1
          out += span('string', code.slice(i, stop))
          i = stop
        } else if (q === '{') {
          const stop = balanced(code, i)
          out += span('punct', '{') + script(code.slice(i + 1, stop - 1)) + span('punct', '}')
          i = stop
        }
      }
      continue
    }
    if (code[i] === '{') {
      // JSX spread or Svelte shorthand: {...props}
      const stop = balanced(code, i)
      out += span('punct', '{') + script(code.slice(i + 1, stop - 1)) + span('punct', '}')
      i = stop
      continue
    }
    out += escape(code[i]!)
    i++
  }
  return [out, i]
}

/** End of the tag that starts at `at` (after its `>`), skipping quoted values and `{expressions}` */
function tagEnd(code: string, at: number): number {
  let j = at + 1
  while (j < code.length && code[j] !== '>') {
    const c = code[j]
    if (c === '"' || c === "'") {
      const close = code.indexOf(c, j + 1)
      j = close < 0 ? code.length : close + 1
    } else if (c === '{') j = balanced(code, j)
    else j++
  }
  return j + 1
}

/** End of the JSX element (or fragment) that starts at `at`: its matching closing tag, nested ones included */
function jsxEnd(code: string, at: number): number {
  let depth = 0
  let i = at
  while (i < code.length) {
    if (code[i] === '{') {
      i = balanced(code, i)
      continue
    }
    if (code[i] === '<' && /^<\/?([A-Za-z]|>)/.test(code.slice(i, i + 3))) {
      const end = tagEnd(code, i)
      if (code[i + 1] === '/') depth--
      else if (code[end - 2] !== '/') depth++
      i = end
      if (depth <= 0) return i
      continue
    }
    i++
  }
  return code.length
}

/** A `<` that opens JSX (`return (<div>`, `=> <X />`), not a comparison or a type argument (`Array<T>`) */
function opensJsx(code: string, i: number): boolean {
  if (!/^<([A-Za-z]|>)/.test(code.slice(i, i + 2))) return false
  const before = code.slice(Math.max(0, i - 40), i)
  return /\b(return|yield|await)\s*$/.test(before) || !/[\w$)\]]\s*$/.test(before)
}

/** TypeScript / JavaScript (with markup inside it: JSX, template literals that hold a template) */
function script(code: string): string {
  let out = ''
  let i = 0
  while (i < code.length) {
    const rest = code.slice(i)
    const comment = /^(\/\/[^\n]*|\/\*[\s\S]*?\*\/)/.exec(rest)
    if (comment) {
      out += span('comment', comment[0])
      i += comment[0].length
      continue
    }
    if (opensJsx(code, i)) {
      // the whole element is markup: its text is prose, not code (an apostrophe is not a string)
      const end = jsxEnd(code, i)
      out += markup(code.slice(i, end))
      i = end
      continue
    }
    const q = code[i]
    if (q === '"' || q === "'") {
      const close = code.indexOf(q, i + 1)
      const stop = close < 0 ? code.length : close + 1
      out += span('string', code.slice(i, stop))
      i = stop
      continue
    }
    if (q === '`') {
      const close = code.indexOf('`', i + 1)
      const stop = close < 0 ? code.length : close + 1
      const inner = code.slice(i + 1, stop - 1)
      // an inline template (Angular `template:`) is coloured as markup
      out += span('punct', '`') + (/^\s*</.test(inner) ? markup(inner) : span('string', inner)) + span('punct', '`')
      i = stop
      continue
    }
    const decorator = /^@[A-Za-z]\w*/.exec(rest)
    if (decorator) {
      out += span('decorator', decorator[0])
      i += decorator[0].length
      continue
    }
    const number = /^\d[\d_.]*/.exec(rest)
    if (number) {
      out += span('number', number[0])
      i += number[0].length
      continue
    }
    const word = /^[A-Za-z_$][\w$]*/.exec(rest)
    if (word) {
      const w = word[0]
      const call = code[i + w.length] === '('
      out += KEYWORDS.has(w) ? span('keyword', w) : LITERALS.has(w) ? span('literal', w) : call ? span('function', w) : /^[A-Z]/.test(w) ? span('type', w) : escape(w)
      i += w.length
      continue
    }
    out += /[{}()[\];,.:=<>+\-*/!?&|]/.test(q!) ? span('punct', q!) : escape(q!)
    i++
  }
  return out
}

/** Markup: tags and their attributes, comments, text; `<script>` blocks are coloured as script */
function markup(code: string): string {
  let out = ''
  let i = 0
  while (i < code.length) {
    const rest = code.slice(i)
    const comment = /^<!--[\s\S]*?-->/.exec(rest)
    if (comment) {
      out += span('comment', comment[0])
      i += comment[0].length
      continue
    }
    const fragment = /^<\/?>/.exec(rest)
    if (fragment) {
      out += span('punct', fragment[0])
      i += fragment[0].length
      continue
    }
    if (/^<\/?[A-Za-z]/.test(rest)) {
      const [html, end] = tag(code, i)
      out += html
      i = end
      if (/^<script\b/.test(rest)) {
        const close = code.indexOf('</script>', i)
        const stop = close < 0 ? code.length : close
        out += script(code.slice(i, stop))
        i = stop
      }
      continue
    }
    if (code[i] === '{') {
      // Svelte / Angular / JSX expressions in text: {name}, {{ value }}
      const stop = balanced(code, i)
      out += span('punct', '{') + script(code.slice(i + 1, stop - 1)) + span('punct', '}')
      i = stop
      continue
    }
    const text = /^[^<{]+/.exec(rest)
    out += escape(text ? text[0] : code[i]!)
    i += text ? text[0].length : 1
  }
  return out
}

export type Language = 'html' | 'tsx' | 'vue' | 'svelte' | 'ts'

/** Coloured HTML for `code` */
export function highlight(code: string, language: Language): string {
  return language === 'tsx' || language === 'ts' ? script(code) : markup(code)
}
