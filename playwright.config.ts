import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './playground/tests',
  use: {
    baseURL: 'http://127.0.0.1:4173',
    channel: process.env.SUB_BROWSER_CHANNEL,
  },
  webServer: {
    command: 'pnpm --filter @sub/playground preview --host 127.0.0.1 --port 4173 --strictPort',
    url: 'http://127.0.0.1:4173',
  },
})
