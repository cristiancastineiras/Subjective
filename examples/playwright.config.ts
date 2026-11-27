import { defineConfig } from '@playwright/test'
import { FRAMEWORKS } from './shared/frameworks'

// The same conformance suite against the six example apps (each built, then served by `vite preview` on its port).
// `pnpm test:frameworks` (SUB_BROWSER_CHANNEL=chrome to use the installed Chrome); one framework: `--project=vue`.
export default defineConfig({
  testDir: './tests',
  timeout: 60_000,
  use: { channel: process.env.SUB_BROWSER_CHANNEL },
  projects: FRAMEWORKS.map((f) => ({ name: f.id, use: { baseURL: `http://127.0.0.1:${f.port}` } })),
  webServer: FRAMEWORKS.map((f) => ({
    command: `pnpm --filter @sub/example-${f.id} preview --host 127.0.0.1`,
    url: `http://127.0.0.1:${f.port}`,
    reuseExistingServer: !process.env.CI,
  })),
})
