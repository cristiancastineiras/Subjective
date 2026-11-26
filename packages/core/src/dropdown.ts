import { SubMenu } from './menu'
import { define } from './shared/utils'
import { defineOption } from './option'

/**
 * Dropdown (SUB name) = the accessible menu button of <sub-menu>: a button that opens a list of actions
 * (`aria-haspopup="menu"`), Up/Down/Home/End/type-ahead, Esc returns focus. Use for ACTIONS; for
 * choosing a value use <sub-select>; for site navigation use <sub-nav-menu>.
 */
export class SubDropdown extends SubMenu {}

export function defineDropdown(): void {
  defineOption()
  define('sub-dropdown', SubDropdown)
}

declare global {
  interface HTMLElementTagNameMap {
    'sub-dropdown': SubDropdown
  }
}
