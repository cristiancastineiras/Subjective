// Custom Elements Manifest: the public contract of every component (properties, attributes, events, methods,
// slots, CSS parts). The framework packages (@sub/react, @sub/vue, @sub/angular...) are generated from it.
// Run by `pnpm build` (and `pnpm --filter @sub/core manifest`).

/**
 * SUB registers elements with its own `define('sub-x', SubX)` and dispatches events with `emit(this, 'sub-x')`;
 * the analyzer understands neither. This plugin:
 * - gives every class registered by `define()` its tag name (and a custom-element definition export);
 * - checks that every event a class emits (`emit(...)`, `new Event('change')`) is documented with a typed
 *   `@fires {Type} name - description`: an undocumented event fails the build, so the contract cannot drift.
 */
function subContract() {
  const defines = []
  const emitted = []
  const classOf = (ts, node) => {
    let c = node.parent
    while (c && !ts.isClassDeclaration(c)) c = c.parent
    return c?.name?.text
  }
  return {
    name: 'sub-contract',
    analyzePhase({ ts, node, moduleDoc }) {
      if (ts.isCallExpression(node)) {
        const callee = node.expression.getText()
        const [a, b] = node.arguments
        if (callee === 'define' && a && b && ts.isStringLiteral(a) && ts.isIdentifier(b)) defines.push({ tag: a.text, className: b.text })
        if (callee === 'emit' && b && ts.isStringLiteral(b)) {
          const className = classOf(ts, node)
          if (className) emitted.push({ path: moduleDoc.path, className, event: b.text })
        }
      }
      if (ts.isNewExpression(node) && node.expression.getText() === 'Event' && node.arguments?.[0] && ts.isStringLiteral(node.arguments[0])) {
        const className = classOf(ts, node)
        if (className) emitted.push({ path: moduleDoc.path, className, event: node.arguments[0].text })
      }
    },
    packageLinkPhase({ customElementsManifest }) {
      const find = (className) => {
        for (const mod of customElementsManifest.modules) {
          const decl = mod.declarations?.find((d) => d.kind === 'class' && d.name === className)
          if (decl) return { mod, decl }
        }
        return undefined
      }
      const problems = []
      for (const { tag, className } of defines) {
        const hit = find(className)
        if (!hit) {
          problems.push(`define('${tag}', ${className}): class not found`)
          continue
        }
        hit.decl.customElement = true
        hit.decl.tagName = tag
        hit.mod.exports = [...(hit.mod.exports ?? []), { kind: 'custom-element-definition', name: tag, declaration: { name: className, module: hit.mod.path } }]
      }
      for (const { path, className, event } of emitted) {
        const decl = find(className)?.decl
        const doc = decl?.events?.find((e) => e.name === event)
        if (!doc) problems.push(`${path}: ${className} emits "${event}" without "@fires {Type} ${event} - description" in its JSDoc`)
        else if (!doc.type?.text) problems.push(`${path}: ${className} documents "${event}" without a type`)
      }
      if (problems.length) throw new Error(`The component contract is incomplete:\n  ${[...new Set(problems)].join('\n  ')}`)
    },
  }
}

export default {
  globs: ['src/*.ts', 'src/shared/*.ts'],
  exclude: ['src/**/*.d.ts', 'src/shared/material-icons.ts'],
  outdir: '.',
  litelement: true,
  plugins: [subContract()],
}
