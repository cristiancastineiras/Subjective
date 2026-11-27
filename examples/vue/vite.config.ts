import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'
import { exampleConfig } from '../shared/vite'

export default defineConfig(exampleConfig(4304, [vue({ template: { compilerOptions: { isCustomElement: (tag) => tag.startsWith('sub-') } } })]))
