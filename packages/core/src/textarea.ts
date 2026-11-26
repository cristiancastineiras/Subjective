import { css, html, nothing } from 'lit'
import { ifDefined } from 'lit/directives/if-defined.js'
import { live } from 'lit/directives/live.js'
import { formControlStyles } from './shared/form-control'
import { SubTextField } from './shared/text-field'
import { define } from './shared/utils'

/** Multi-line text. Same labelling, validation and counter behaviour as <sub-input>. */
export class SubTextarea extends SubTextField {
  static override properties = {
    rows: { type: Number },
  }

  declare rows: number

  constructor() {
    super()
    this.rows = 4
  }

  static override styles = [
    ...formControlStyles,
    css`
      textarea {
        display: block;
        resize: vertical;
        min-block-size: calc(var(--sub-field-min-size) * 2);
      }

      .counter {
        justify-self: end;
        font-size: var(--sub-text-sm);
        color: var(--sub-color-muted);
        font-variant-numeric: tabular-nums;
      }
    `,
  ]

  protected field(): HTMLTextAreaElement | null {
    return this.renderRoot.querySelector('textarea')
  }

  protected override render() {
    return html`<div class="field">
      ${this.renderLabel()} ${this.renderHint()}
      <textarea
        id="control"
        class="control"
        part="textarea"
        rows=${this.rows}
        .value=${live(this.value)}
        name=${this.name || nothing}
        placeholder=${this.placeholder || nothing}
        autocomplete=${this.autocomplete || nothing}
        minlength=${ifDefined(this.minlength)}
        maxlength=${ifDefined(this.maxlength)}
        ?required=${this.required}
        ?readonly=${this.readonly}
        ?disabled=${this.isDisabled}
        aria-invalid=${this.displayedError ? 'true' : nothing}
        aria-describedby=${ifDefined(this.describedBy())}
        @input=${this.onInput}
        @change=${this.onChange}
        @blur=${this.onControlBlur}
      ></textarea>
      ${this.renderCounter()} ${this.renderError()}
    </div>`
  }
}

export function defineTextarea(): void {
  define('sub-textarea', SubTextarea)
}

declare global {
  interface HTMLElementTagNameMap {
    'sub-textarea': SubTextarea
  }
}
