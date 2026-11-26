import type { ReactiveController, ReactiveControllerHost } from 'lit'

/**
 * Light-DOM children that a component enhances (`<li>` of a stepper, `<a>` of breadcrumbs,
 * `<sub-option>`...). Re-renders the host when they, their text or `attributes` change.
 * Authors write plain, valid HTML that still reads without JavaScript.
 */
export class ChildrenController<T extends Element = HTMLElement> implements ReactiveController {
  #observer: MutationObserver | undefined

  constructor(
    private readonly host: ReactiveControllerHost & HTMLElement,
    private readonly selector: string,
    private readonly attributes: string[] = [],
  ) {
    host.addController(this)
  }

  hostConnected(): void {
    this.#observer = new MutationObserver((records) => {
      // Ignore the host's own attribute reflection
      if (records.some((r) => r.target !== this.host)) this.host.requestUpdate()
    })
    this.#observer.observe(this.host, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: this.attributes.length > 0,
      attributeFilter: this.attributes.length ? this.attributes : undefined,
    })
  }

  hostDisconnected(): void {
    this.#observer?.disconnect()
  }

  get elements(): T[] {
    return [...this.host.querySelectorAll<T>(`:scope > ${this.selector}`)]
  }
}
