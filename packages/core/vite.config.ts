import { readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'

// One entry per `src/<component>.ts` (+ index.ts). Adding a component = adding a file.
const src = fileURLToPath(new URL('./src/', import.meta.url))
const entry = Object.fromEntries(
  readdirSync(src)
    .filter((file) => file.endsWith('.ts') && !file.endsWith('.d.ts'))
    .map((file) => [file.replace(/\.ts$/, ''), `${src}${file}`]),
)

export default defineConfig({
  build: {
    lib: { entry, formats: ['es'], fileName: (_format, name) => `${name}.js` },
    rolldownOptions: {
      external: [/^lit(\/|$)/],
      output: { chunkFileNames: 'chunks/[name]-[hash].js' },
    },
  },
})
