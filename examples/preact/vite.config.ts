import preact from '@preact/preset-vite'
import { defineConfig } from 'vite'
import { exampleConfig } from '../shared/vite'

export default defineConfig(exampleConfig(4302, [preact()]))
