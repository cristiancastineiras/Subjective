/**
 * One demo per component, in `src/demos/<id>.ts` (default export). The shell discovers them
 * automatically. `html` is BOTH the live preview and the code shown, so they cannot drift.
 */

/** A property of the component you can change live from the Configure panel */
export type PropControl =
  | { name: string; type: 'boolean' }
  | { name: string; type: 'text'; placeholder?: string }
  | { name: string; type: 'select'; options: string[] }
  | { name: string; type: 'number'; min?: number; max?: number; step?: number }

export interface Demo {
  /** Same as the file name; used in `?c=<id>` */
  id: string
  title: string
  /** Sidebar group */
  group: 'Actions' | 'Forms' | 'Navigation' | 'Disclosure' | 'Feedback' | 'Data' | 'Content' | 'Layout' | 'Patterns' | 'Utilities'
  description: string
  /** Registers the custom elements this demo uses */
  define: () => void
  html: string
  /** Wire behaviour for the preview. `log` writes to the status region. */
  setup?: (preview: HTMLElement, log: (message: string) => void) => void
  /** Token files (packages/tokens/components/<name>.css) whose tokens get live controls. Default: [id] */
  tokens?: string[]
  /** Attributes the Configure panel can change on every `selector` match inside the preview */
  props?: { selector: string; controls: PropControl[] }
  /** Keyboard contract shown on the page: key -> what it does */
  keyboard?: Array<[keys: string, does: string]>
}
