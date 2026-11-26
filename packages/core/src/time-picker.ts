import { SubInput } from './input'
import { define } from './shared/utils'

/**
 * Time field: the native `<input type="time">` (spin parts with the arrows, type digits, the OS picker on
 * touch) with the same label, hint and error behaviour as <sub-input>. `step` in seconds (default 60).
 */
export class SubTimePicker extends SubInput {
  constructor() {
    super()
    this.type = 'time'
    this.step = '60'
  }
}

export function defineTimePicker(): void {
  define('sub-time-picker', SubTimePicker)
}

declare global {
  interface HTMLElementTagNameMap {
    'sub-time-picker': SubTimePicker
  }
}
