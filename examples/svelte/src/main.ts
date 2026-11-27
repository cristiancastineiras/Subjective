import '@sub/tokens/fonts.css'
import '@sub/tokens/theme.css'
import '../../shared/styles.css'
import { mount } from 'svelte'
import { registerAll } from '@sub/svelte'
import App from './App.svelte'

registerAll()
mount(App, { target: document.getElementById('app')! })
