import { LitElement, css, html, nothing } from 'lit'
import { icons } from './shared/icons'
import { placeNear } from './shared/position'
import { baseStyles, controlTypography, focusInset, focusStyles, iconStyles, popupMotion, visuallyHidden } from './shared/styles'
import { define, emit, warn, wrap } from './shared/utils'
import { OptionsController, defineOption } from './option'

const supportsPopover = typeof HTMLElement !== 'undefined' && typeof HTMLElement.prototype.showPopover === 'function'

/**
 * Menu button for overflow actions ("More actions"). For low-frequency, tertiary actions: never put
 * the primary action here. Items are `<sub-option>`: a `value` (fires `sub-select`) or an `href` (link).
 *
 * Trigger: `aria-haspopup="menu"` + `aria-expanded`. Keys: Enter/Space/Down open on the first item,
 * Up opens on the last; Up/Down/Home/End move, type a letter to jump, Esc closes and returns focus
 * to the trigger, Tab closes. `icon-only` shows "..." with `label` as its accessible name.
 */
export class SubMenu extends LitElement {
  static override shadowRootOptions: ShadowRootInit = { mode: 'open', delegatesFocus: true }

  static override properties = {
    label: { type: String },
    iconOnly: { type: Boolean, attribute: 'icon-only' },
    _open: { state: true },
  }

  declare label: string
  declare iconOnly: boolean
  declare _open: boolean

  readonly #options = new OptionsController(this)
  #typed = ''
  #typedTimer: ReturnType<typeof setTimeout> | undefined

  constructor() {
    super()
    this.label = ''
    this.iconOnly = false
    this._open = false
  }

  static override styles = [
    baseStyles,
    focusStyles,
    iconStyles,
    visuallyHidden,
    css`
      :host {
        display: inline-block;
      }

      .trigger {
        ${controlTypography}
        display: inline-flex;
        gap: var(--sub-space-2);
        align-items: center;
        justify-content: center;
        min-block-size: var(--sub-menu-min-size);
        min-inline-size: var(--sub-menu-min-size);
        padding: var(--sub-space-2) var(--sub-space-3);
        border: var(--sub-menu-trigger-border-width) solid var(--sub-color-border);
        border-radius: var(--sub-menu-trigger-radius);
        font-size: var(--sub-control-font-size);
        font-weight: var(--sub-weight-semibold);
        background: var(--sub-color-surface);
        color: var(--sub-color-text);
        cursor: pointer;
        touch-action: manipulation;
      }

      @media (hover: hover) {
        .trigger:hover {
          background: var(--sub-color-surface-hover);
        }
      }

      .trigger[aria-expanded='true'] {
        background: var(--sub-color-accent-subtle);
        color: var(--sub-color-on-accent-subtle);
      }

      [role='menu'] {
        position: fixed;
        inset: auto;
        margin: 0;
        min-inline-size: var(--sub-menu-min-width);
        max-inline-size: min(24rem, calc(100vw - 1rem));
        padding: var(--sub-space-1);
        border: var(--sub-menu-border-width) solid var(--sub-color-border);
        border-radius: var(--sub-menu-radius);
        background: var(--sub-color-surface-raised);
        color: var(--sub-color-text);
        z-index: var(--sub-z-dropdown);
      }

      [role='menu']:not([popover]):not([data-open]) {
        display: none;
      }

      ${popupMotion("[role='menu']")}

      [role='menuitem'] {
        display: flex;
        align-items: center;
        inline-size: 100%;
        min-block-size: var(--sub-menu-min-size);
        padding: var(--sub-menu-item-padding-block) var(--sub-menu-item-padding-inline);
        border: 0;
        border-radius: var(--sub-menu-item-radius);
        background: transparent;
        color: inherit;
        font: var(--sub-weight-regular) var(--sub-text-md) / var(--sub-leading-normal) var(--sub-font-sans);
        text-align: start;
        text-decoration: none;
        cursor: pointer;
      }

      [role='menuitem']:hover,
      [role='menuitem']:focus-visible {
        background: var(--sub-color-surface-hover);
      }

      ${focusInset("[role='menuitem']")}

      [role='menuitem'][aria-disabled='true'] {
        color: var(--sub-color-on-disabled);
        cursor: not-allowed;
      }
    `,
  ]

  override connectedCallback(): void {
    super.connectedCallback()
    defineOption()
  }

  protected override firstUpdated(): void {
    if (!this.label) warn('<sub-menu> needs a "label" (its text, or its accessible name when icon-only).')
  }

  get #menu(): HTMLElement | null {
    return this.renderRoot.querySelector('[role=menu]')
  }
  get #trigger(): HTMLButtonElement | null {
    return this.renderRoot.querySelector('.trigger')
  }
  get #items(): HTMLElement[] {
    return [...this.renderRoot.querySelectorAll<HTMLElement>('[role=menuitem]:not([aria-disabled=true])')]
  }

  #show(focus: 'first' | 'last' | 'none' = 'first'): void {
    const menu = this.#menu
    const trigger = this.#trigger
    if (!menu || !trigger || this._open) return
    this._open = true
    if (supportsPopover) menu.showPopover()
    else menu.setAttribute('data-open', '')
    placeNear(trigger, menu, 'bottom', 'start', 4)
    const items = this.#items
    if (focus !== 'none') (focus === 'last' ? items[items.length - 1] : items[0])?.focus()
    document.addEventListener('pointerdown', this.#onOutside)
  }

  #hide(returnFocus = true): void {
    const menu = this.#menu
    if (!this._open || !menu) return
    this._open = false
    if (supportsPopover && menu.matches(':popover-open')) menu.hidePopover()
    menu.removeAttribute('data-open')
    document.removeEventListener('pointerdown', this.#onOutside)
    if (returnFocus) this.#trigger?.focus()
  }

  #onOutside = (event: Event): void => {
    if (!event.composedPath().includes(this)) this.#hide(false)
  }

  /** Native popover light-dismiss (Esc, outside click) closed it */
  #onToggle = (event: Event): void => {
    if ((event as ToggleEvent).newState === 'closed' && this._open) {
      this._open = false
      this.#trigger?.focus()
    }
  }

  #onTriggerKey = (event: KeyboardEvent): void => {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      this.#show('first')
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      this.#show('last')
    }
  }

  #onMenuKey = (event: KeyboardEvent): void => {
    const items = this.#items
    const i = items.indexOf(event.composedPath()[0] as HTMLElement)
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault()
        items[wrap(i + 1, items.length)]?.focus()
        break
      case 'ArrowUp':
        event.preventDefault()
        items[wrap(i - 1, items.length)]?.focus()
        break
      case 'Home':
        event.preventDefault()
        items[0]?.focus()
        break
      case 'End':
        event.preventDefault()
        items[items.length - 1]?.focus()
        break
      case 'Escape':
        event.preventDefault()
        event.stopPropagation()
        this.#hide()
        break
      case 'Tab':
        this.#hide(false)
        break
      default:
        if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
          clearTimeout(this.#typedTimer)
          this.#typed += event.key.toLowerCase()
          this.#typedTimer = setTimeout(() => (this.#typed = ''), 600)
          const hit = items.find((el) => el.textContent?.trim().toLowerCase().startsWith(this.#typed))
          hit?.focus()
        }
    }
  }

  #activate(value: string): void {
    this.#hide()
    emit(this, 'sub-select', { value })
  }

  protected override render() {
    const options = this.#options.options
    return html`<button
        class="trigger"
        part="trigger"
        type="button"
        aria-haspopup="menu"
        aria-expanded=${this._open ? 'true' : 'false'}
        aria-controls="menu"
        aria-label=${this.iconOnly ? this.label : nothing}
        @click=${() => (this._open ? this.#hide() : this.#show('first'))}
        @keydown=${this.#onTriggerKey}
      >
        ${this.iconOnly ? icons.more() : html`<span>${this.label}</span>${icons.chevronDown()}`}
      </button>
      <div
        id="menu"
        role="menu"
        aria-label=${this.label}
        popover=${supportsPopover ? 'auto' : nothing}
        @toggle=${this.#onToggle}
        @keydown=${this.#onMenuKey}
      >
        ${options.map((o) =>
          o.href
            ? html`<a role="menuitem" href=${o.href} tabindex="-1" aria-disabled=${o.disabled ? 'true' : nothing} @click=${() => this.#hide(false)}>${o.label}</a>`
            : html`<button
                role="menuitem"
                type="button"
                tabindex="-1"
                aria-disabled=${o.disabled ? 'true' : nothing}
                @click=${() => !o.disabled && this.#activate(o.value)}
              >
                ${o.label}
              </button>`,
        )}
      </div>`
  }
}

export function defineMenu(): void {
  defineOption()
  define('sub-menu', SubMenu)
}

declare global {
  interface HTMLElementTagNameMap {
    'sub-menu': SubMenu
  }
}
