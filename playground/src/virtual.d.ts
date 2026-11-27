declare module 'virtual:demo-index' {
  const index: Array<import('./demo').DemoMeta>
  export default index
}

/** Per tag: its names in each framework package and its attribute -> property map (scripts/contract.mjs) */
declare module 'virtual:sub-elements' {
  const table: Record<string, import('../../scripts/contract.mjs').SnippetEntry>
  export default table
}
