import { css, html, nothing, type PropertyValues } from 'lit'
import { ifDefined } from 'lit/directives/if-defined.js'
import { SubFormControl, formControlStyles, type FormValue } from './shared/form-control'
import type { MessageContext } from './shared/messages'
import { define, warn } from './shared/utils'
import { OptionsController, defineOption } from './option'

/**
 * Exactly one choice from a short list (2-6 options; for 7+ use <sub-select>).
 * Native radios in a `fieldset` + `legend`: Tab enters the group, arrow keys move, Tab leaves.
 * Options: `<sub-option value="a" description="extra text">Label</sub-option>`; a disabled option
 * should say why in its `description`.
 *
 * `variant="card"` makes each option a bordered card (the whole card is the target).
 * `orientation="horizontal"` only for 2-3 short options such as Yes/No.
 */
export class SubRadioGroup extends SubFormControl {
  static override properties = {
    value: { type: String },
    orientation: { type: String, reflect: true },
    variant: { type: String, reflect: true },
    block: { type: Boolean, reflect: true },
  }

  declare value: string
  declare orientation: 'vertical' | 'horizontal'
  declare variant: 'default' | 'card' | 'segmented'
  /** Segmented: stretch to the full width with equal segments (default: as wide as its content) */
  declare block: boolean

  readonly #options = new OptionsController(this)
  #default = ''

  constructor() {
    super()
    this.value = ''
    this.orientation = 'vertical'
    this.variant = 'default'
    this.block = false
  }

  static override styles = [
    ...formControlStyles,
    css`
      .options {
        display: grid;
        gap: var(--sub-space-1);
      }

      :host([orientation='horizontal']) .options {
        grid-auto-flow: column;
        justify-content: start;
        gap: var(--sub-space-6);
      }

      :host([variant='segmented']) .options {
        display: inline-flex;
      }

      .option {
        display: flex;
        gap: var(--sub-radio-gap);
        align-items: flex-start;
        min-block-size: var(--sub-radio-min-size);
        padding-block: var(--sub-space-2);
        cursor: pointer;
        touch-action: manipulation;
      }

      input {
        flex: none;
        inline-size: var(--sub-radio-size);
        block-size: var(--sub-radio-size);
        margin: 0.125rem 0 0;
        accent-color: var(--sub-color-accent);
        cursor: inherit;
      }

      .text {
        display: grid;
        font-size: var(--sub-radio-label-size);
      }

      .desc {
        font-size: var(--sub-text-sm);
        color: var(--sub-color-muted);
      }

      .option[data-disabled] {
        cursor: not-allowed;
        color: var(--sub-color-on-disabled);
      }

      .option[data-disabled] .desc {
        color: var(--sub-color-on-disabled);
      }

      .option[data-disabled] {
        background: transparent;
      }

      /* Card: whole card is the target; selected = thicker border (not colour alone) */
      /* Segmented: one bordered strip, native radios stretched over their segment (whole segment = target) */
      :host([variant='segmented']) .options {
        display: flex;
        flex-wrap: nowrap;
        justify-self: start; /* as wide as the segments, not the whole row: the border hugs the last one */
        max-inline-size: 100%;
        gap: 0;
        border: var(--sub-segmented-border-width) solid var(--sub-color-border);
        border-radius: var(--sub-segmented-radius);
        overflow: hidden;
      }

      :host([variant='segmented'][block]) .options {
        justify-self: stretch;
      }

      :host([variant='segmented'][block]) .option {
        flex: 1;
      }

      :host([variant='segmented']) .option {
        min-inline-size: 0;
        overflow-wrap: anywhere;
        position: relative;
        justify-content: center;
        align-items: center;
        min-block-size: var(--sub-segmented-min-size);
        padding: 0 var(--sub-segmented-padding-inline);
        font-size: var(--sub-segmented-font-size);
        background: var(--sub-color-surface);
      }

      :host([variant='segmented']) .option + .option {
        border-inline-start: var(--sub-segmented-border-width) solid var(--sub-color-border);
      }

      :host([variant='segmented']) input {
        position: absolute;
        inset: 0;
        inline-size: 100%;
        block-size: 100%;
        margin: 0;
        opacity: 0;
      }

      :host([variant='segmented']) .option[data-checked] {
        background: var(--sub-color-accent);
        color: var(--sub-color-on-accent);
        font-weight: var(--sub-weight-bold);
      }

      :host([variant='segmented']) .option[data-disabled] {
        background: var(--sub-color-disabled);
        color: var(--sub-color-on-disabled);
      }

      :host([variant='segmented']) .option[data-focus-visible] {
        outline: var(--sub-focus-width) solid var(--sub-color-focus);
        outline-offset: calc(var(--sub-focus-width) * -1);
        box-shadow: inset 0 0 0 calc(var(--sub-focus-width) + var(--sub-focus-inner-width)) var(--sub-color-focus-inner);
      }

      :host([variant='segmented']) .desc {
        display: none;
      }

      :host([variant='card']) .options {
        gap: var(--sub-space-3);
      }

      :host([variant='card']) .option {
        padding: var(--sub-radio-card-padding);
        border: var(--sub-radio-card-border-width) solid var(--sub-color-border);
        border-radius: var(--sub-radio-card-radius);
        background: var(--sub-color-surface);
      }

      :host([variant='card']) .option[data-checked] {
        border-color: var(--sub-color-accent);
        background: var(--sub-color-accent-subtle);
        color: var(--sub-color-on-accent-subtle);
        box-shadow: inset 0 0 0 var(--sub-radio-card-border-width) var(--sub-color-accent);
      }

      :host([variant='card']) .option[data-focus-visible] {
        outline: var(--sub-focus-width) solid var(--sub-color-focus);
        outline-offset: var(--sub-focus-inner-width);
        box-shadow: 0 0 0 var(--sub-focus-inner-width) var(--sub-color-focus-inner);
      }
    `,
  ]

  override connectedCallback(): void {
    super.connectedCallback()
    defineOption()
    this.#default = this.value
  }

  protected nativeControl(): HTMLInputElement | null {
    return this.renderRoot.querySelector('input[type=radio]')
  }
  protected control(): HTMLElement | null {
    return this.renderRoot.querySelector('input[type=radio]:checked') ?? this.nativeControl()
  }
  protected formValue(): FormValue {
    return this.value || null
  }
  protected resetValue(): void {
    this.value = this.#default
  }
  protected restoreValue(state: FormValue): void {
    this.value = typeof state === 'string' ? state : ''
  }
  protected override messageContext(): MessageContext {
    return { label: this.label, kind: 'choice' }
  }

  protected override firstUpdated(changed: PropertyValues): void {
    super.firstUpdated(changed)
    if (this.#options.options.length > 6) warn('<sub-radio-group> with 7+ options: use <sub-select> instead.')
  }

  #onChange = (event: Event): void => {
    this.value = (event.target as HTMLInputElement).value
    this.dispatchEvent(new Event('change', { bubbles: true }))
  }

  // The option's look follows data-* state written here, not `:has(input:...)`: Firefox does not re-evaluate
  // `:host(...) .option:has(input:checked)` when a radio changes, so the strip kept showing the old choice.
  #onFocus = (event: FocusEvent): void => {
    const input = event.target as HTMLInputElement
    input.parentElement?.toggleAttribute('data-focus-visible', input.matches(':focus-visible'))
  }

  #onBlur = (event: FocusEvent): void => {
    ;(event.target as HTMLInputElement).parentElement?.removeAttribute('data-focus-visible')
    this.onControlBlur()
  }

  protected override render() {
    return html`<fieldset
      class="field"
      aria-describedby=${ifDefined(this.describedBy())}
      ?disabled=${this.isDisabled}
    >
      <legend id="label">${this.labelContent()}</legend>
      ${this.renderHint()}
      <div class="options">
        ${this.#options.options.map(
          (o, i) => html`<label class="option" ?data-checked=${o.value === this.value} ?data-disabled=${o.disabled || this.isDisabled}>
            <input
              type="radio"
              name="group"
              .value=${o.value}
              .checked=${o.value === this.value}
              ?required=${this.required}
              ?disabled=${o.disabled}
              aria-describedby=${ifDefined(o.description ? `desc-${i}` : undefined)}
              @change=${this.#onChange}
              @focus=${this.#onFocus}
              @blur=${this.#onBlur}
            />
            <span class="text"
              ><span>${o.label}</span>${o.description ? html`<span class="desc" id="desc-${i}">${o.description}</span>` : nothing}</span
            >
          </label>`,
        )}
      </div>
      ${this.renderError()}
    </fieldset>`
  }
}

export function defineRadioGroup(): void {
  defineOption()
  define('sub-radio-group', SubRadioGroup)
}

declare global {
  interface HTMLElementTagNameMap {
    'sub-radio-group': SubRadioGroup
  }
}
