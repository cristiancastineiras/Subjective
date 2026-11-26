#!/usr/bin/env node
// sub-theme: build-time companion of the theme SDK.
//   sub-theme build theme.json [--out theme.css] [--selector :root]   JSON -> CSS (loaded after @sub/tokens/theme.css)
//   sub-theme check theme.json                                          WCAG contrast report (exit 1 on failures)
//   sub-theme init --primary #0e7490 [--radius 0.5] [--tinted] [--name Ocean] > theme.json
//   sub-theme fix theme.json                                            print the theme with failing colours nudged to pass
import { readFileSync, writeFileSync } from 'node:fs'
import { checkThemeContrast, exportTheme, fixThemeContrast, generateTheme, importTheme, themeToCss } from '../dist/theme.js'

const [, , command, ...rest] = process.argv
const flag = (name, fallback) => {
  const i = rest.indexOf(`--${name}`)
  return i === -1 ? fallback : rest[i + 1] && !rest[i + 1].startsWith('--') ? rest[i + 1] : true
}
const file = rest.find((a) => !a.startsWith('--') && (rest[rest.indexOf(a) - 1] ?? '').startsWith('--') === false)

function load() {
  if (!file) throw new Error('Pass the path of a sub-theme JSON file.')
  return importTheme(readFileSync(file, 'utf8'))
}

try {
  if (command === 'build') {
    const css = themeToCss(load(), { selector: flag('selector', ':root') })
    const out = flag('out', '')
    if (out) writeFileSync(out, css)
    else process.stdout.write(css)
  } else if (command === 'check') {
    const issues = checkThemeContrast(load())
    if (!issues.length) console.log('Theme meets WCAG 2.2 AA contrast in light and dark.')
    else {
      for (const i of issues) console.error(`FAIL [${i.mode}] ${i.foreground} on ${i.background}: ${i.ratio}:1 (needs ${i.required}:1)`)
      console.error(`\n${issues.length} issue(s). Run \`sub-theme fix ${file}\` to nudge the colours.`)
      process.exit(1)
    }
  } else if (command === 'fix') {
    process.stdout.write(exportTheme(fixThemeContrast(load())))
  } else if (command === 'init') {
    const theme = generateTheme({
      name: flag('name', 'Custom'),
      primary: flag('primary', '#1d70b8'),
      radius: Number(flag('radius', 0)),
      borderWidth: Number(flag('border', 2)),
      tinted: Boolean(flag('tinted', false)),
    })
    process.stdout.write(exportTheme(theme))
  } else {
    console.log('Usage: sub-theme <build|check|fix|init> [file] [options]  (see the header of this file)')
    process.exit(command ? 1 : 0)
  }
} catch (error) {
  console.error(`sub-theme: ${error.message}`)
  process.exit(1)
}
