/**
 * Token metadata for the Configure panel. Component tokens are READ from the annotated CSS files in
 * packages/tokens/components, so adding a token there adds its control here. Nothing is duplicated.
 */
const files = import.meta.glob('../../packages/tokens/components/*.css', { query: '?raw', import: 'default', eager: true }) as Record<string, string>

export interface TokenControl {
  name: string
  type: 'length' | 'number' | 'color'
  min: number
  max: number
  unit: string
  description: string
}

const LINE = /(--sub-[\w-]+)\s*:\s*[^;]+;\s*\/\*\s*@(length|number|color)(?:\s+([\d.]+)\s+([\d.]+)(?:\s+(\w+))?)?\s*\|\s*(.*?)\s*\*\//g

const byComponent = new Map<string, TokenControl[]>()
for (const [path, css] of Object.entries(files)) {
  const name = path.split('/').pop()!.replace('.css', '')
  const list: TokenControl[] = []
  for (const m of css.matchAll(LINE)) {
    list.push({ name: m[1]!, type: m[2] as TokenControl['type'], min: Number(m[3] ?? 0), max: Number(m[4] ?? 1), unit: m[5] ?? '', description: m[6] ?? '' })
  }
  byComponent.set(name, list)
}

export const componentTokens = (name: string): TokenControl[] => byComponent.get(name) ?? []

const L = (name: string, description: string, min: number, max: number, unit: string): TokenControl => ({ name, type: 'length', min, max, unit, description })
const C = (name: string, description: string): TokenControl => ({ name, type: 'color', min: 0, max: 0, unit: '', description })

/** Shared tiers: change these and every component follows */
export const globalTokens: Array<{ group: string; controls: TokenControl[] }> = [
  {
    group: 'Shape (all controls)',
    controls: [
      L('--sub-control-radius', 'Corner radius of every control', 0, 2, 'rem'),
      L('--sub-control-border-width', 'Border width of every control', 0, 8, 'px'),
      L('--sub-control-padding-block', 'Vertical padding of every control', 0, 2, 'rem'),
      L('--sub-control-padding-inline', 'Horizontal padding of every control', 0, 3, 'rem'),
      L('--sub-control-min-size', 'Minimum target size (2.75rem = 44px)', 1, 4, 'rem'),
      L('--sub-surface-radius', 'Corner radius of dialogs, alerts, menus', 0, 2, 'rem'),
      L('--sub-surface-border-width', 'Border width of dialogs, alerts, menus', 0, 8, 'px'),
    ],
  },
  {
    group: 'Focus indicator',
    controls: [
      L('--sub-focus-width', 'Outer (coloured) ring thickness', 0, 8, 'px'),
      L('--sub-focus-inner-width', 'Inner (dark) ring thickness', 0, 6, 'px'),
      L('--sub-focus-offset', 'Space between the control and the rings', 0, 8, 'px'),
    ],
  },
  {
    group: 'Colour',
    controls: [
      C('--sub-color-page', 'Page background'),
      C('--sub-color-surface', 'Control and card background'),
      C('--sub-color-text', 'Text'),
      C('--sub-color-muted', 'Secondary text'),
      C('--sub-color-border', 'Control borders'),
      C('--sub-color-accent', 'Primary action'),
      C('--sub-color-on-accent', 'Text on the primary action'),
      C('--sub-color-focus', 'Focus ring (outer)'),
      C('--sub-color-focus-inner', 'Focus ring (inner)'),
      C('--sub-color-danger', 'Error text and borders'),
      C('--sub-color-link', 'Links'),
    ],
  },
]
