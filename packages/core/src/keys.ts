/**
 * Keyboard helpers so every custom widget answers the same keys the same way.
 */

/** The key as a readable name: `Space` for " ", otherwise `event.key` (Enter, Escape, ArrowDown, a...) */
export function keyName(event: KeyboardEvent): string {
  return event.key === ' ' || event.key === 'Spacebar' ? 'Space' : event.key
}

/** Enter or Space: the keys that "click" a button-like control */
export function isActivationKey(event: KeyboardEvent): boolean {
  return event.key === 'Enter' || event.key === ' ' || event.key === 'Spacebar'
}

/** A character key with no Ctrl/Meta/Alt: type-ahead territory, never a shortcut */
export function isPrintableKey(event: KeyboardEvent): boolean {
  return event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey
}

/** Arrow keys as a direction, honouring right-to-left layouts (`rtl`: Left means "next") */
export function arrowDirection(event: KeyboardEvent, rtl = false): 'next' | 'previous' | null {
  const right = rtl ? 'ArrowLeft' : 'ArrowRight'
  const left = rtl ? 'ArrowRight' : 'ArrowLeft'
  if (event.key === 'ArrowDown' || event.key === right) return 'next'
  if (event.key === 'ArrowUp' || event.key === left) return 'previous'
  return null
}

/**
 * Does the event match a shortcut written as `"Ctrl+K"`, `"Shift+?"`, `"Alt+ArrowDown"`, `"Mod+S"`?
 * `Mod` is Cmd on Apple platforms and Ctrl elsewhere. Modifiers must match exactly.
 */
export function matchesShortcut(event: KeyboardEvent, shortcut: string): boolean {
  const parts = shortcut.split('+').map((p) => p.trim())
  const key = parts.pop() ?? ''
  const mods = new Set(parts.map((p) => p.toLowerCase()))
  const apple = typeof navigator !== 'undefined' && /mac|iphone|ipad/i.test(navigator.platform)
  const wantCtrl = mods.has('ctrl') || (mods.has('mod') && !apple)
  const wantMeta = mods.has('meta') || mods.has('cmd') || (mods.has('mod') && apple)
  if (event.ctrlKey !== wantCtrl || event.metaKey !== wantMeta || event.altKey !== mods.has('alt') || event.shiftKey !== mods.has('shift')) return false
  const name = keyName(event)
  return name.toLowerCase() === key.toLowerCase() || event.key.toLowerCase() === key.toLowerCase()
}

/**
 * Type-ahead for lists, menus and trees: type "mad" quickly and the first item starting with "mad" is found.
 * Repeating the same letter cycles through the items that start with it.
 *
 *   const ahead = new Typeahead<Item>((item) => item.label)
 *   const next = ahead.match(items, event.key, currentIndex)   // -1 when nothing matches
 */
export class Typeahead<T> {
  #typed = ''
  #timer: ReturnType<typeof setTimeout> | undefined
  readonly #text: (item: T) => string
  readonly #reset: number

  constructor(text: (item: T) => string, resetAfterMs = 600) {
    this.#text = text
    this.#reset = resetAfterMs
  }

  /** Index of the match for `key` (a printable character), searching after `from`; -1 when none. */
  match(items: readonly T[], key: string, from = -1, skip: (item: T) => boolean = () => false): number {
    clearTimeout(this.#timer)
    this.#typed += key.toLowerCase()
    this.#timer = setTimeout(() => (this.#typed = ''), this.#reset)
    const cycling = this.#typed.length > 1 && [...this.#typed].every((c) => c === this.#typed[0])
    const needle = cycling ? this.#typed[0]! : this.#typed
    const start = this.#typed.length === 1 || cycling ? from + 1 : from
    for (let step = 0; step < items.length; step++) {
      const i = (((start + step) % items.length) + items.length) % items.length
      const item = items[i]!
      if (!skip(item) && this.#text(item).toLowerCase().startsWith(needle)) return i
    }
    return -1
  }

  clear(): void {
    clearTimeout(this.#timer)
    this.#typed = ''
  }
}
