// Compiles every example of the playground's Code block with the real compiler of its framework, inside the
// example apps (their dependencies and strict settings): React, Preact and Solid with tsc (prop names and value
// types against the packages' types), Angular with ngc (strictTemplates: static attributes against the
// directives' inputs), Svelte and Vue with their own compilers. A deliberately wrong "canary" per type-checked
// framework must be reported, so an OK cannot come from a check that did not run.
//
//   node scripts/check-snippets.mjs <snippets.json> [react|preact|solid|angular|svelte|vue ...]
// The JSON ({ [page]: { [Framework]: { file, code } } }) is written by playground/tests/snippets.check.ts,
// which `pnpm test:snippets` runs.
import { execSync } from 'node:child_process'
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { join } from 'node:path'
import { root } from './contract.mjs'

const EX = join(root, 'examples')
const snippets = JSON.parse(readFileSync(process.argv[2], 'utf8'))
const wanted = process.argv.slice(3)
const want = (fw) => !wanted.length || wanted.includes(fw)
const pages = Object.keys(snippets).length
let failures = 0

const CANARY = {
  React: ['ZzCanary.tsx', `import { SubButton } from '@sub/react'\nexport const C = () => <SubButton variant="nope">x</SubButton>\n`],
  Preact: ['ZzCanary.tsx', `import '@sub/preact'\nexport const C = () => <sub-button variant="nope">x</sub-button>\n`],
  Solid: ['ZzCanary.tsx', `import '@sub/solid'\nexport const C = () => <sub-button variant="nope">x</sub-button>\n`],
  Angular: [
    'zz-canary.component.ts',
    `import { CUSTOM_ELEMENTS_SCHEMA, Component } from '@angular/core'\nimport { SubButtonDirective } from '@sub/angular'\n@Component({ selector: 'zz-canary', imports: [SubButtonDirective], schemas: [CUSTOM_ELEMENTS_SCHEMA], template: '<sub-button variant="nope">x</sub-button>' })\nexport class ZzCanaryComponent {}\n`,
  ],
}

/** Write every page's example (and the canary) into the app's src/zz-snippets; returns the folder */
function writeAll(app, label) {
  const dir = join(EX, app, 'src', 'zz-snippets')
  rmSync(dir, { recursive: true, force: true })
  mkdirSync(dir, { recursive: true })
  for (const byFramework of Object.values(snippets)) writeFileSync(join(dir, byFramework[label].file), byFramework[label].code)
  const [name, code] = CANARY[label]
  writeFileSync(join(dir, name), code)
  return dir
}

function typecheck(app, label, command) {
  const dir = writeAll(app, label)
  let out = ''
  try {
    execSync(command, { cwd: root, stdio: 'pipe', encoding: 'utf8' })
  } catch (e) {
    out = `${e.stdout ?? ''}${e.stderr ?? ''}`
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
  const lines = out.split(/\r?\n/)
  const canary = lines.some((l) => /zz-?canary/i.test(l))
  const errors = lines.filter((l) => l.includes('zz-snippets') && !/zz-?canary/i.test(l))
  const other = lines.filter((l) => /error/i.test(l) && !l.includes('zz-snippets'))
  console.log(`\n=== ${label}: ${errors.length || other.length ? 'ERRORS' : 'OK'} (${pages} examples; canary ${canary ? 'reported' : 'NOT REPORTED: the check did not run'})`)
  for (const l of [...errors, ...other].slice(0, 60)) console.log(l)
  failures += errors.length + other.length + (canary ? 0 : 1)
}

if (want('react')) typecheck('react', 'React', 'npx tsc -p examples/react/tsconfig.json')
if (want('preact')) typecheck('preact', 'Preact', 'npx tsc -p examples/preact/tsconfig.json')
if (want('solid')) typecheck('solid', 'Solid', 'npx tsc -p examples/solid/tsconfig.json')
if (want('angular')) {
  // only the examples, with the app's strict template checking (rootDir: examples/, for the shared folder)
  const config = join(EX, 'angular', 'tsconfig.zz-check.json')
  writeFileSync(config, JSON.stringify({ extends: './tsconfig.json', compilerOptions: { rootDir: '..', noEmit: true }, include: ['src/zz-snippets'], angularCompilerOptions: { strictTemplates: true } }))
  try {
    typecheck('angular', 'Angular', 'node examples/angular/node_modules/@angular/compiler-cli/bundles/src/bin/ngc.js -p examples/angular/tsconfig.zz-check.json')
  } finally {
    rmSync(config, { force: true })
  }
}

if (want('svelte')) {
  const { compile } = createRequire(join(EX, 'svelte', 'package.json'))('svelte/compiler')
  const problems = []
  for (const byFramework of Object.values(snippets)) {
    const { file, code } = byFramework.Svelte
    try {
      for (const w of compile(code, { filename: file, generate: 'client' }).warnings) problems.push(`${file}: warning ${w.code}: ${w.message.split('\n')[0]}`)
    } catch (e) {
      problems.push(`${file}: error ${e.code ?? ''}: ${String(e.message).split('\n')[0]}`)
    }
  }
  console.log(`\n=== Svelte: ${problems.length ? 'PROBLEMS' : 'OK'} (${pages} examples, warnings count)`)
  for (const p of problems.slice(0, 60)) console.log(p)
  failures += problems.length
}

if (want('vue')) {
  const sfc = createRequire(join(EX, 'vue', 'package.json'))('vue/compiler-sfc')
  const problems = []
  for (const [id, byFramework] of Object.entries(snippets)) {
    const { file, code } = byFramework.Vue
    const { descriptor, errors } = sfc.parse(code, { filename: file })
    for (const e of errors) problems.push(`${file}: ${e.message}`)
    if (descriptor.scriptSetup) {
      try {
        sfc.compileScript(descriptor, { id })
      } catch (e) {
        problems.push(`${file}: script: ${String(e.message).split('\n')[0]}`)
      }
    }
    const template = sfc.compileTemplate({ source: descriptor.template.content, filename: file, id })
    for (const e of template.errors) problems.push(`${file}: template: ${typeof e === 'string' ? e : e.message}`)
    for (const tip of template.tips) problems.push(`${file}: tip: ${tip}`)
  }
  console.log(`\n=== Vue: ${problems.length ? 'PROBLEMS' : 'OK'} (${pages} examples)`)
  for (const p of problems.slice(0, 60)) console.log(p)
  failures += problems.length
}

console.log(`\n${failures ? `FAILED (${failures})` : 'ALL EXAMPLES COMPILE'}`)
process.exit(failures ? 1 : 0)
