// Types of contract.mjs (the playground's vite.config.ts imports it)
export interface ContractElement {
  tag: string
  className: string
  exported: boolean
  entry: string
  define: string | undefined
  props: Array<{ name: string; attribute?: string; type: string; boolean: boolean; number: boolean }>
  events: Array<{ name: string; type: string; handler: string }>
  model: string | null
  component: string
  directive: string
}

export interface SnippetEntry {
  component: string
  directive: string
  define: string | null
  entry: string
  attributes: Record<string, [property: string, kind: 'boolean' | 'number' | 'string']>
}

export const root: string
export const manifestPath: string
export function pascal(s: string): string
export function camel(s: string): string
export function readElements(options?: { optional?: boolean }): ContractElement[]
export function snippetTable(elements: ContractElement[]): Record<string, SnippetEntry>
