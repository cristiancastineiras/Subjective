import { defineConfig } from '@playwright/test'
import base from './playwright.config'

// `pnpm test:snippets`: every example of the Code block, compiled by each framework's own compiler
export default defineConfig({
  ...base,
  testMatch: /snippets\.check\.ts$/,
  projects: [{ name: 'chromium', use: { channel: process.env.SUB_BROWSER_CHANNEL } }],
})
