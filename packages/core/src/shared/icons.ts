import type { TemplateResult } from 'lit'
import { svgIcon } from './icon-svg'
import { directionalIcons, iconAliases, materialIcons } from './material-icons'

/**
 * Icons by NAME, for components that receive one at runtime (`<sub-icon name>`, `<sub-icon-button icon>`).
 * Importing this module ships every icon in `icons.config.json`.
 *
 * Components that draw fixed icons import them one by one from `./material-icons` (`iconClose()`), so an
 * app that uses a few components only ships the icons those draw.
 *
 * Icons are Material Symbols (Google, Apache-2.0) rendered as inline SVG: `fill="currentColor"`
 * (follows the text colour, forced-colors safe), no icon font (no ligature text read aloud, no flash
 * while loading). Names are the ones on https://fonts.google.com/icons; `name-fill` is the filled
 * variant. Only the icons listed in `icons.config.json` are shipped (see `pnpm --filter @sub/core icons`).
 * Apps add more with `registerIcon()`.
 */
export type IconName = keyof typeof materialIcons | keyof typeof iconAliases

/** Directional icons are mirrored in right-to-left layouts */
const directional = new Set<string>(directionalIcons)
const custom = new Map<string, string>()

/**
 * Register an extra icon: `path` is the `d` of a Material Symbols SVG (960 grid, viewBox
 * "0 -960 960 960"). Trusted, developer-provided data only.
 */
export function registerIcon(name: string, path: string, options: { directional?: boolean } = {}): void {
  custom.set(name, path)
  if (options.directional) directional.add(name)
}

const resolve = (name: string): string => (iconAliases as Record<string, string>)[name] ?? name

export function iconPath(name: string): string | undefined {
  return custom.get(name) ?? (materialIcons as Record<string, string>)[resolve(name)]
}

export const isDirectional = (name: string): boolean => directional.has(name) || directional.has(resolve(name))

export function iconNames(): string[] {
  return [...Object.keys(materialIcons), ...custom.keys()]
}

/** Decorative inline icon by name (empty when the name is not shipped) */
export function renderIcon(name: string): TemplateResult {
  return svgIcon(iconPath(name) ?? '', isDirectional(name))
}
