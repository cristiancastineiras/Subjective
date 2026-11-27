/** The six example apps and the port each one is served on (dev and preview) */
export const FRAMEWORKS = [
  { id: 'react', name: 'React', port: 4301 },
  { id: 'preact', name: 'Preact', port: 4302 },
  { id: 'solid', name: 'SolidJS', port: 4303 },
  { id: 'vue', name: 'Vue', port: 4304 },
  { id: 'svelte', name: 'Svelte', port: 4305 },
  { id: 'angular', name: 'Angular', port: 4306 },
] as const

export type FrameworkId = (typeof FRAMEWORKS)[number]['id']

/** Links between the six apps (same host, another port) */
export const frameworkLinks = (current: FrameworkId) =>
  FRAMEWORKS.map((f) => ({ ...f, href: `${location.protocol}//${location.hostname}:${f.port}/`, current: f.id === current }))
