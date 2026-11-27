import { svelte } from '@sveltejs/vite-plugin-svelte'
import { defineConfig } from 'vite'
import { exampleConfig } from '../shared/vite'

export default defineConfig(exampleConfig(4305, [svelte()]))
