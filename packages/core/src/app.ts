import { LitElement, css, html } from 'lit'
import { defineToaster, type SubToaster, type ToastOptions } from './toast'
import { configure, type RequiredIndicator } from './shared/config'
import { setMessages, type Messages } from './shared/messages'
import { baseStyles } from './shared/styles'
import { define } from './shared/utils'
import { applyTheme, importTheme, type SubTheme, type ThemeHandle, type ThemeMode } from './theme'

/**
 * Application root / config provider (SUB "App" + "ConfigProvider"). Wrap your app once:
 *
 *   <sub-app theme-src="/sub-theme.json" mode="auto" lang="es" dir="ltr" required-indicator="optional">
 *
 * It applies the theme to its subtree (CSS custom properties), keeps `data-sub-theme` (light/dark/auto),
 * sets language and direction, configures the required-field marker, can replace UI messages
 * (`app.messages = { close: 'Cerrar' }`) and hosts the shared toast region: `app.toast({ message })`.
 * It adds no layout (`display: contents`) and no landmarks.
 */
export class SubApp extends LitElement {
  static override properties = {
    themeSrc: { type: String, attribute: 'theme-src' },
    mode: { type: String, reflect: true },
    requiredIndicator: { type: String, attribute: 'required-indicator' },
    motion: { type: String, reflect: true },
    density: { type: String, reflect: true },
    theme: { attribute: false },
    messages: { attribute: false },
  }

  /** URL of a sub-theme/1 JSON file */
  declare themeSrc: string
  declare mode: ThemeMode | 'auto'
  declare requiredIndicator: RequiredIndicator
  /** `off` removes every animation inside the app */
  declare motion: 'auto' | 'off'
  /** `compact`: smaller targets and tighter spacing for every component inside */
  declare density: 'comfortable' | 'compact'
  declare theme: SubTheme | undefined
  declare messages: Partial<Messages> | undefined

  #handle: ThemeHandle | undefined

  constructor() {
    super()
    this.themeSrc = ''
    this.mode = 'auto'
    this.requiredIndicator = 'optional'
    this.motion = 'auto'
    this.density = 'comfortable'
    this.theme = undefined
    this.messages = undefined
  }

  static override styles = [
    baseStyles,
    css`
      :host {
        display: contents;
      }
    `,
  ]

  override connectedCallback(): void {
    super.connectedCallback()
    defineToaster()
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback()
    this.#handle?.clear()
  }

  protected override async willUpdate(changed: Map<string, unknown>): Promise<void> {
    if (changed.has('requiredIndicator')) configure({ requiredIndicator: this.requiredIndicator })
    if (changed.has('messages') && this.messages) setMessages(this.messages)
    if (changed.has('themeSrc') && this.themeSrc) {
      try {
        this.theme = importTheme(await (await fetch(this.themeSrc)).text())
      } catch (error) {
        console.warn(`[sub] <sub-app theme-src="${this.themeSrc}">: ${(error as Error).message}`)
      }
    }
  }

  protected override updated(changed: Map<string, unknown>): void {
    if (changed.has('theme') && this.theme) {
      if (this.#handle) this.#handle.setTheme(this.theme)
      else this.#handle = applyTheme(this.theme, this, this.mode)
    }
    if (changed.has('density')) this.dataset.subDensity = this.density
    if (changed.has('motion')) {
      if (this.motion === 'off') this.dataset.subMotion = 'off'
      else delete this.dataset.subMotion
    }
    if (changed.has('mode')) {
      if (this.#handle) this.#handle.setMode(this.mode)
      else this.dataset.subTheme = this.mode === 'dark' ? 'dark' : 'light'
    }
  }

  /** Show a toast in the app's shared live region */
  toast(options: ToastOptions): string {
    return (this.renderRoot.querySelector('sub-toaster') as SubToaster).show(options)
  }

  protected override render() {
    return html`<slot></slot><sub-toaster></sub-toaster>`
  }
}

/** Same element under the SUB name */
export class SubConfigProvider extends SubApp {}

export function defineApp(): void {
  defineToaster()
  define('sub-app', SubApp)
  define('sub-config-provider', SubConfigProvider)
}

declare global {
  interface HTMLElementTagNameMap {
    'sub-app': SubApp
    'sub-config-provider': SubConfigProvider
  }
}
