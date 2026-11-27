import { readdirSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { defineConfig, searchForWorkspaceRoot, type Plugin } from 'vite'
import { manifestPath, readElements, snippetTable } from '../scripts/contract.mjs'

const coreSrc = fileURLToPath(new URL('../packages/core/src/', import.meta.url))
const demosDir = fileURLToPath(new URL('./src/demos/', import.meta.url))

/**
 * `virtual:demo-index`: id, title, group and description of every demo, read from the source files at
 * build time. The navigation needs them for every page, but the demos themselves (and the components
 * they import) only load when you open one, so the first page ships a fraction of the code.
 */
function demoIndex(): Plugin {
  const ID = 'virtual:demo-index'
  const RESOLVED = `\0${ID}`
  const KEYS = ['id', 'title', 'group', 'description'] as const

  const read = (file: string) => {
    const source = readFileSync(demosDir + file, 'utf8')
    const meta: Record<string, string> = {}
    for (const key of KEYS) {
      const match = source.match(new RegExp(`^\\s*${key}:\\s*("(?:[^"\\\\]|\\\\.)*")`, 'm'))
      if (!match) throw new Error(`playground/src/demos/${file}: "${key}" must be a double-quoted string literal (the navigation index reads it without loading the demo).`)
      meta[key] = JSON.parse(match[1]!) as string
    }
    if (meta.id !== file.replace(/\.ts$/, '')) throw new Error(`playground/src/demos/${file}: id "${meta.id}" must match the file name.`)
    return meta
  }

  return {
    name: 'sub-demo-index',
    resolveId: (id) => (id === ID ? RESOLVED : undefined),
    load(id) {
      if (id !== RESOLVED) return
      const files = readdirSync(demosDir).filter((f) => f.endsWith('.ts')).sort()
      for (const f of files) this.addWatchFile(demosDir + f)
      return `export default ${JSON.stringify(files.map(read))}`
    },
    configureServer(server) {
      // a demo was added, removed or renamed: rebuild the index and reload
      const refresh = (file: string) => {
        if (!file.replace(/\\/g, '/').startsWith(demosDir.replace(/\\/g, '/')) || !file.endsWith('.ts')) return
        const graph = server.environments.client.moduleGraph
        const mod = graph.getModuleById(RESOLVED)
        if (!mod) return
        graph.invalidateModule(mod)
        server.ws.send({ type: 'full-reload' })
      }
      server.watcher.on('add', refresh)
      server.watcher.on('unlink', refresh)
      server.watcher.on('change', refresh)
    },
  }
}

/**
 * `virtual:sub-elements`: the names each framework package gives every tag and its attribute types, from the
 * component contract (packages/core/custom-elements.json, the same reader as the framework generator). Only the
 * Code panel imports it, on first open. Before the core's first build the table is empty and the examples use
 * the naming rules alone.
 */
function subElements(): Plugin {
  const ID = 'virtual:sub-elements'
  const RESOLVED = `\0${ID}`
  return {
    name: 'sub-elements',
    resolveId: (id) => (id === ID ? RESOLVED : undefined),
    load(id) {
      if (id !== RESOLVED) return
      this.addWatchFile(manifestPath)
      const elements = readElements({ optional: true })
      if (!elements.length) this.warn('packages/core/custom-elements.json not found (build @sub/core): the code examples use the naming rules only')
      return `export default ${JSON.stringify(snippetTable(elements))}`
    },
  }
}

export default defineConfig(({ command, isPreview }) => ({
  plugins: [demoIndex(), subElements()],
  resolve: {
    // In dev, use the TypeScript sources (instant reload). Build/preview use the real package exports.
    alias:
      command === 'serve' && !isPreview
        ? [
            { find: /^@sub\/core$/, replacement: `${coreSrc}index.ts` },
            { find: /^@sub\/core\/(.+)$/, replacement: `${coreSrc}$1.ts` },
          ]
        : [],
  },
  server: { fs: { allow: [searchForWorkspaceRoot(fileURLToPath(new URL('.', import.meta.url)))] } },
}))
