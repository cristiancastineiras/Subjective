import { css, html, nothing } from 'lit'
import { ifDefined } from 'lit/directives/if-defined.js'
import { announce } from './announce'
import { SubFormControl, formControlStyles, type FormValue } from './shared/form-control'
import { messages } from './shared/messages'
import { define } from './shared/utils'
import { iconClose, iconError, iconUploadFile } from './shared/material-icons'

const size = (bytes: number): string => (bytes < 1024 ? `${bytes} B` : bytes < 1048576 ? `${(bytes / 1024).toFixed(0)} KB` : `${(bytes / 1048576).toFixed(1)} MB`)

/**
 * File upload: a real `<input type="file">` (visually hidden but focusable) behind a labelled button, a
 * drag-and-drop zone that is only an ENHANCEMENT (the button always works), and a file list with named
 * remove buttons. Type/size/count problems are written next to the field and announced. Files are
 * submitted with the form (FormData). Uploading itself is up to the app: listen to `sub-files`.
 * @fires {Event} change - The value changed (native event: works with any framework and form library)
 */
export class SubUpload extends SubFormControl {
  static override properties = {
    accept: { type: String },
    multiple: { type: Boolean },
    maxSizeMb: { type: Number, attribute: 'max-size-mb' },
    maxFiles: { type: Number, attribute: 'max-files' },
    _files: { state: true },
    _problems: { state: true },
    _over: { state: true },
  }

  declare accept: string
  declare multiple: boolean
  declare maxSizeMb: number
  declare maxFiles: number
  declare _files: File[]
  declare _problems: string[]
  declare _over: boolean

  constructor() {
    super()
    this.accept = ''
    this.multiple = false
    this.maxSizeMb = 0
    this.maxFiles = 0
    this._files = []
    this._problems = []
    this._over = false
  }

  static override styles = [
    ...formControlStyles,
    css`
      .zone {
        display: grid;
        gap: var(--sub-upload-gap);
        justify-items: start;
        padding: var(--sub-upload-padding);
        border: var(--sub-upload-border-width) dashed var(--sub-color-border);
        border-radius: var(--sub-upload-radius);
        background: var(--sub-color-surface);
      }

      .zone[data-over] {
        background: var(--sub-color-accent-subtle);
        border-style: solid;
      }

      .pick {
        position: relative;
        display: inline-flex;
        gap: var(--sub-space-2);
        align-items: center;
        min-block-size: var(--sub-field-min-size);
        padding: var(--sub-field-padding-block) var(--sub-field-padding-inline);
        border: var(--sub-field-border-width) solid var(--sub-color-border);
        border-radius: var(--sub-field-radius);
        background: var(--sub-color-surface-hover);
        font-weight: var(--sub-weight-semibold);
        cursor: pointer;
      }

      .pick input {
        position: absolute;
        inset: 0;
        inline-size: 100%;
        block-size: 100%;
        margin: 0;
        opacity: 0;
        cursor: pointer;
      }

      .pick:has(input:focus-visible) {
        outline: var(--sub-focus-width) solid var(--sub-color-focus);
        outline-offset: var(--sub-focus-inner-width);
        box-shadow: 0 0 0 var(--sub-focus-inner-width) var(--sub-color-focus-inner);
      }

      .drop {
        color: var(--sub-color-muted);
        font-size: var(--sub-text-sm);
      }

      /* Touch screens cannot drag a file onto the page: do not offer it */
      @media (hover: none) and (pointer: coarse) {
        .drop {
          display: none;
        }
      }

      /* Phones: the button spans the zone, easy to hit with a thumb */
      @media (max-width: 40rem) {
        .pick {
          display: flex;
          justify-content: center;
          align-self: stretch;
          inline-size: 100%;
        }
      }

      ul {
        display: grid;
        gap: var(--sub-space-1);
        margin: var(--sub-space-3) 0 0;
        padding: 0;
        list-style: none;
      }

      li {
        display: flex;
        gap: var(--sub-space-2);
        align-items: center;
        justify-content: space-between;
        padding-inline-start: var(--sub-space-3);
        border: var(--sub-border-width-thin) solid var(--sub-color-border-subtle);
      }

      li button {
        display: grid;
        place-items: center;
        flex: none;
        inline-size: var(--sub-target-size);
        block-size: var(--sub-target-size);
        padding: 0;
        border: 0;
        background: transparent;
        color: inherit;
        cursor: pointer;
      }

      .name {
        min-inline-size: 0;
        overflow-wrap: anywhere;
      }
    `,
  ]

  protected nativeControl(): HTMLInputElement | null {
    return this.renderRoot.querySelector('input[type=file]')
  }
  protected control(): HTMLElement | null {
    return this.nativeControl()
  }
  protected formValue(): FormValue {
    const data = new FormData()
    for (const f of this._files) data.append(this.name || 'file', f)
    return this._files.length ? data : null
  }
  protected resetValue(): void {
    this.#apply([])
  }
  protected restoreValue(): void {
    /* files cannot be restored by the browser */
  }

  /** Mirror the list into the native input so constraint validation (`required`) stays truthful */
  #apply(files: File[]): void {
    this._files = files
    const input = this.nativeControl()
    if (input) {
      const dt = new DataTransfer()
      files.forEach((f) => dt.items.add(f))
      input.files = dt.files
    }
    this.dispatchEvent(new CustomEvent('sub-files', { bubbles: true, composed: true, detail: { files } }))
    this.dispatchEvent(new Event('change', { bubbles: true }))
  }

  #add(incoming: File[]): void {
    const problems: string[] = []
    const accepted: File[] = []
    const tokens = this.accept.split(',').map((t) => t.trim().toLowerCase()).filter(Boolean)
    for (const f of incoming) {
      const typeOk =
        !tokens.length ||
        tokens.some((t) => (t.startsWith('.') ? f.name.toLowerCase().endsWith(t) : t.endsWith('/*') ? f.type.startsWith(t.slice(0, -1)) : f.type === t))
      if (!typeOk) problems.push(messages.fileWrongType(f.name, this.accept))
      else if (this.maxSizeMb && f.size > this.maxSizeMb * 1048576) problems.push(messages.fileTooLarge(f.name, `${this.maxSizeMb} MB`))
      else accepted.push(f)
    }
    let next = this.multiple ? [...this._files, ...accepted] : accepted.slice(0, 1)
    if (this.maxFiles && next.length > this.maxFiles) {
      problems.push(messages.tooManyFiles(this.maxFiles))
      next = next.slice(0, this.maxFiles)
    }
    this._problems = problems
    if (problems.length) announce(problems.join('. '), 'assertive')
    this.#apply(next)
  }

  #remove(file: File): void {
    this._problems = []
    this.#apply(this._files.filter((f) => f !== file))
    announce(`${file.name} removed`)
    void this.updateComplete.then(() => this.renderRoot.querySelector<HTMLElement>('input[type=file]')?.focus())
  }

  protected override render() {
    return html`<div class="field">
      <div id="label">${this.labelContent()}</div>
      ${this.renderHint()}
      <div
        class="zone"
        ?data-over=${this._over}
        @dragover=${(e: DragEvent) => {
          e.preventDefault()
          this._over = true
        }}
        @dragleave=${() => (this._over = false)}
        @drop=${(e: DragEvent) => {
          e.preventDefault()
          this._over = false
          if (!this.isDisabled && e.dataTransfer) this.#add([...e.dataTransfer.files])
        }}
      >
        <label class="pick">
          <input
            id="control"
            type="file"
            accept=${this.accept || nothing}
            ?multiple=${this.multiple}
            ?required=${this.required}
            ?disabled=${this.isDisabled}
            aria-labelledby="label pick-text"
            aria-describedby=${ifDefined(this.describedBy())}
            @change=${(e: Event) => this.#add([...((e.target as HTMLInputElement).files ?? [])])}
            @blur=${this.onControlBlur}
          />
          ${iconUploadFile()}<span id="pick-text">${messages.chooseFiles}</span>
        </label>
        <span class="drop" aria-hidden="true">${messages.dragFilesHere}</span>
      </div>
      ${this._files.length
        ? html`<ul aria-label=${`${this.label} files`}>
            ${this._files.map(
              (f) => html`<li>
                <span class="name">${f.name} <span class="drop">(${size(f.size)})</span></span>
                <button type="button" aria-label=${messages.removeFile(f.name)} @click=${() => this.#remove(f)}>${iconClose()}</button>
              </li>`,
            )}
          </ul>`
        : nothing}
      ${this._problems.length ? html`<div class="error" role="alert">${iconError()}<span>${this._problems.join('. ')}</span></div>` : nothing}
      ${this.renderError()}
    </div>`
  }
}

export function defineUpload(): void {
  define('sub-upload', SubUpload)
}

declare global {
  interface HTMLElementTagNameMap {
    'sub-upload': SubUpload
  }
}
