import { html, type TemplateResult } from 'lit'

export interface ChartPoint {
  /** ISO date or any text */
  label: string
  value: number
}

const fmt = (n: number): string => new Intl.NumberFormat('en').format(n)
/** `2026-11-26` -> `26 Nov`; any other label is kept */
const short = (label: string): string => (/^\d{4}-\d{2}-\d{2}$/.test(label) ? new Intl.DateTimeFormat('en', { day: 'numeric', month: 'short' }).format(new Date(`${label}T12:00:00`)) : label)

/**
 * A bar chart that does not depend on colour or on seeing it: the bars are decoration (`aria-hidden`), the figure has
 * a text summary (range, peak, total) that screen readers get as the image's name, and the exact numbers are one
 * disclosure away as a real table. Bars use `--sub-color-accent`, so any theme recolours it.
 */
export function barChart({ title, unit, data }: { title: string; unit: string; data: ChartPoint[] }): TemplateResult {
  if (!data.length) return html`<p class="app-muted">No data for this period.</p>`
  const max = Math.max(1, ...data.map((d) => d.value))
  const total = data.reduce((n, d) => n + d.value, 0)
  const peak = data.reduce((a, b) => (b.value > a.value ? b : a))
  const first = data[0]!
  const last = data[data.length - 1]!
  const summary = `${title}: from ${first.label} to ${last.label}, ${fmt(total)} ${unit} in total, peak ${fmt(peak.value)} on ${peak.label}.`
  return html`
    <figure class="app-chart">
      <div class="app-bars" role="img" aria-label=${summary}>
        ${data.map((d) => html`<span style=${`block-size: ${Math.max(2, (d.value / max) * 100)}%`}></span>`)}
      </div>
      <figcaption>
        <span class="app-muted">${short(first.label)}</span>
        <span>Peak ${fmt(peak.value)}, ${short(peak.label)}</span>
        <span class="app-muted">${short(last.label)}</span>
      </figcaption>
      <details>
        <summary>Show the numbers</summary>
        <sub-table class="app-table" caption=${title} .columns=${[{ key: 'label', label: 'Day', sortable: true }, { key: 'value', label: 'Downloads', sortable: true, align: 'end' as const }]} .rows=${data.map((d) => ({ id: d.label, label: d.label, value: d.value }))}></sub-table>
      </details>
    </figure>`
}
