import { defineConfig } from '@playwright/test'

// SUB_FIREFOX=1 also runs the cross-browser specs in the Firefox installed on this machine (WebDriver BiDi,
// nothing to download); SUB_FIREFOX=all runs every spec there. `--new-instance` keeps it apart from a Firefox
// you already have open.
const firefox = process.env.SUB_FIREFOX
  ? [{ name: 'firefox', testMatch: process.env.SUB_FIREFOX === 'all' ? /.*\.spec\.ts/ : /cross-browser\.spec\.ts/, use: { browserName: 'firefox' as const, channel: 'moz-firefox', launchOptions: { args: ['--new-instance'] } } }]
  : []

export default defineConfig({
  testDir: './playground/tests',
  use: {
    baseURL: 'http://127.0.0.1:4173',
  },
  projects: [{ name: 'chromium', use: { channel: process.env.SUB_BROWSER_CHANNEL } }, ...firefox],
  webServer: {
    command: 'pnpm --filter @sub/playground preview --host 127.0.0.1 --port 4173 --strictPort',
    url: 'http://127.0.0.1:4173',
  },
})
