import { fileURLToPath } from 'node:url'
import type { PluginOption, UserConfig } from 'vite'

const repo = fileURLToPath(new URL('../../', import.meta.url))

/** Same setup for the six example apps: a fixed port (dev and preview) and access to the playground's demos */
export function exampleConfig(port: number, plugins: PluginOption[]): UserConfig {
  return {
    plugins,
    server: { port, strictPort: true, fs: { allow: [repo] } },
    preview: { port, strictPort: true },
    build: { chunkSizeWarningLimit: 2048 },
  }
}
