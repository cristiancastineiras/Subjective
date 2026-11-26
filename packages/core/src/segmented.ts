import { SubRadioGroup } from './radio'
import { define } from './shared/utils'
import { defineOption } from './option'

/**
 * Segmented control: a radio group drawn as one strip (view switcher: Day / Week / Month). Still native
 * radios in a fieldset (one tab stop, arrows move AND select), so it is a CHOICE, not navigation: for
 * page navigation use <sub-tabs>. Options: `<sub-option value="week">Week</sub-option>`.
 */
export class SubSegmented extends SubRadioGroup {
  constructor() {
    super()
    this.variant = 'segmented'
    this.orientation = 'horizontal'
  }
}

export function defineSegmented(): void {
  defineOption()
  define('sub-segmented', SubSegmented)
}

declare global {
  interface HTMLElementTagNameMap {
    'sub-segmented': SubSegmented
  }
}
