import { fileURLToPath } from 'node:url'
import { defineConfig, searchForWorkspaceRoot } from 'vite'

const coreSrc = fileURLToPath(new URL('../packages/core/src/', import.meta.url))

export default defineConfig(({ command, isPreview }) => ({
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
