// Icons stay tree-shakeable: a component ships only the icons it draws. Run: pnpm --filter @sub/core test:unit
import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import { test } from 'node:test'

const src = new URL('../src/', import.meta.url)
const read = (path) => readFileSync(new URL(path, src), 'utf8')
const config = JSON.parse(readFileSync(new URL('../icons.config.json', import.meta.url), 'utf8'))
const generated = read('shared/material-icons.ts')

/** Files that take an icon NAME at runtime: the only ones allowed to import the whole catalogue */
const BY_NAME = new Set(['icon.ts', 'icon-button.ts'])

test('only the components that take an icon name import the full catalogue', () => {
  const files = [...readdirSync(src).map((f) => f), ...readdirSync(new URL('shared/', src)).map((f) => `shared/${f}`)].filter((f) => f.endsWith('.ts'))
  const offenders = files.filter((file) => {
    if (BY_NAME.has(file) || file === 'shared/icons.ts' || file === 'shared/material-icons.ts') return false
    const code = read(file)
    return /from '\.\.?\/(shared\/)?icons'/.test(code) || /\bmaterialIcons\b/.test(code)
  })
  assert.deepEqual(offenders, [], 'Import single icons (iconClose) from ./shared/material-icons instead')
})

test('every shipped icon is its own export, and directional ones are mirrored', () => {
  const exports = [...generated.matchAll(/^export const (icon\w+) = \(\) => svgIcon\(d(\d+)(, true)?\)$/gm)]
  const names = [...generated.matchAll(/^const d(\d+) = ".*" \/\/ (.+)$/gm)].map((m) => m[2])
  assert.equal(exports.length, new Set(config.icons).size)
  assert.equal(names.length, exports.length)
  for (const [, id, index, mirrored] of exports) {
    const name = names[Number(index)]
    assert.equal(Boolean(mirrored), config.directional.includes(name), `${id} (${name}) mirroring`)
  }
})

test('the generated module has no side effects that would keep unused icons', () => {
  // top-level statements are imports, string constants, arrow functions, object literals or a pure-annotated Set
  const statements = generated.split(/\r?\n/).filter((l) => /^\S/.test(l) && !/^(\/\/|\/\*\*|import |const d\d+ = "|export const icon\w+ = \(\) =>|export const (materialIcons|iconAliases) = \{|\} as const|export const directionalIcons: ReadonlySet<string> = \/\* @__PURE__ \*\/ new Set\()/.test(l))
  assert.deepEqual(statements, [])
})
