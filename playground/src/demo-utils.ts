/** Logs a submitted form's FormData to the status region instead of navigating. */
export function logSubmit(preview: HTMLElement, log: (message: string) => void): void {
  preview.addEventListener('submit', (event) => {
    event.preventDefault()
    const data = new FormData(event.target as HTMLFormElement)
    const entries = [...data].map(([k, v]) => `${k}=${String(v)}`)
    log(`Submitted: ${entries.join(', ') || '(nothing)'}`)
  })
}
