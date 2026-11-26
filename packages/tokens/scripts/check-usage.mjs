// Keeps the token layers and the components in sync.
//  - FAIL: a component uses var(--sub-x) that no token file defines (and gives no fallback)
//  - WARN: a component token is defined but nothing uses it (dead weight in the playground)
// Run: pnpm --filter @sub/tokens check:usage
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { join } from 'node:path'

const tokensDir = fileURLToPath(new URL('..', import.meta.url))
const coreSrc = fileURLToPath(new URL('../../core/src', import.meta.url))

const walk = (dir, ext) =>
  readdirSync(dir).flatMap((f) => {
    const p = join(dir, f)
    return statSync(p).isDirectory() ? (f === 'node_modules' ? [] : walk(p, ext)) : p.endsWith(ext) ? [p] : []
  })

const defined = new Set()
const componentTokens = new Set()
for (const file of walk(tokensDir, '.css')) {
  for (const [, name] of readFileSync(file, 'utf8').matchAll(/(--sub-[\w-]+)\s*:/g)) {
    defined.add(name)
    if (file.includes('components')) componentTokens.add(name)
  }
}

const used = new Map() // name -> files
const fallbackOnly = new Set()
for (const file of walk(coreSrc, '.ts')) {
  const src = readFileSync(file, 'utf8')
  for (const [, name, after] of src.matchAll(/var\((--sub-[\w-]+)\s*(,)?/g)) {
    if (name.endsWith('-')) continue // dynamic: var(--sub-color-${x})
    if (after === ',') fallbackOnly.add(name)
    used.set(name, [...(used.get(name) ?? []), file.slice(coreSrc.length + 1)])
  }
}

let failures = 0
for (const [name, files] of used) {
  if (!defined.has(name) && !fallbackOnly.has(name)) {
    failures++
    console.error(`FAIL ${name} is used in ${[...new Set(files)].join(', ')} but defined nowhere`)
  }
}
const unused = [...componentTokens].filter((t) => !used.has(t))
for (const t of unused) console.warn(`warn ${t} is defined but never used`)

if (failures) process.exit(1)
console.log(`Token usage OK: ${used.size} tokens used, ${defined.size} defined, ${unused.length} unused component tokens.`)
