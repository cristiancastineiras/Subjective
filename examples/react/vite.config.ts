import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { exampleConfig } from '../shared/vite'

export default defineConfig(exampleConfig(4301, [react()]))
