import { LitElement, css, nothing, type ReactiveControllerHost } from 'lit'
import { ChildrenController } from './shared/children'
import { define } from './shared/utils'

export interface OptionData {
  value: string
  label: string
  description: string
  href: string
  group: string
  disabled: boolean
}

/**
 * Declarative option for select, radio group, autocomplete and menu:
 * `<sub-option value="es" description="Spain">Spanish</sub-option>`.
 * Renders nothing; the parent control reads it and renders native, accessible markup itself.
 */
export class SubOption extends LitElement {
  // Reflected: the parent reads the attributes, and frameworks (Preact, Vue, Svelte, Solid) set the PROPERTIES
  static override properties = {
    value: { type: String, reflect: true },
    description: { type: String, reflect: true },
    href: { type: String, reflect: true },
    group: { type: String, reflect: true },
    disabled: { type: Boolean, reflect: true },
  }

  declare value: string
  declare description: string
  declare href: string
  /** Heading to list this option under (select, autocomplete) */
  declare group: string
  declare disabled: boolean

  constructor() {
    super()
    // value, description, href and group stay unset: a reflected '' would replace the label as the value
    this.disabled = false
  }

  static override styles = css`
    :host {
      display: none;
    }
  `

  protected override render() {
    return nothing
  }
}

/** Reads `<sub-option>` children and re-renders the host whenever they change. */
export class OptionsController extends ChildrenController<SubOption> {
  constructor(host: ReactiveControllerHost & HTMLElement) {
    super(host, 'sub-option', ['value', 'disabled', 'description', 'href', 'group'])
  }

  get options(): OptionData[] {
    return this.elements.map((el) => {
      const label = el.textContent?.trim() ?? ''
      return {
        value: el.getAttribute('value') ?? label,
        label,
        description: el.getAttribute('description') ?? '',
        href: el.getAttribute('href') ?? '',
        group: el.getAttribute('group') ?? '',
        disabled: el.hasAttribute('disabled'),
      }
    })
  }
}

export function defineOption(): void {
  define('sub-option', SubOption)
}

declare global {
  interface HTMLElementTagNameMap {
    'sub-option': SubOption
  }
}
