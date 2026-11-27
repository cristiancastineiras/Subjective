import solid from 'vite-plugin-solid'
import { defineConfig } from 'vite'
import { exampleConfig } from '../shared/vite'

export default defineConfig(exampleConfig(4303, [solid()]))
