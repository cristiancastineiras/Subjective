import angular from '@analogjs/vite-plugin-angular'
import { defineConfig } from 'vite'
import { exampleConfig } from '../shared/vite'

export default defineConfig(exampleConfig(4306, [angular({ tsconfig: 'tsconfig.json' })]))
