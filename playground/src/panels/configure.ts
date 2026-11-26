import { deriveTokens } from '@sub/core/theme'
import type { Demo, PropControl } from '../demo'
import { componentTokens, globalTokens, type TokenControl } from '../tokens'

const REM = 16

/** "0.5rem" | "8px" | "0" -> number in the control's unit */
function toNumber(raw: string, unit: string): number {
  const v = raw.trim()
  const n = parseFloat(v)
  if (Number.isNaN(n)) return 0
  if (v.endsWith('px') && (unit === 'rem' || unit === 'em')) return n / REM
  if (v.endsWith('rem') && unit === 'px') return n * REM
  return n
}

function toHex(color: string): string {
  const c = document.createElement('canvas').getContext('2d')!
  c.fillStyle = '#000'
  c.fillStyle = color
  return c.fillStyle.startsWith('#') ? c.fillStyle : '#000000'
}

const stepOf = (t: TokenControl) => (t.type === 'number' ? 1 : t.unit === 'px' ? 1 : 0.05)

export interface ConfigureApi {
  /** Re-reads defaults (after a theme change) */
  refresh(): void
}

/**
 * Builds the Configure panel. Every token control writes a CSS custom property on the preview
 * element; shadow roots inherit it, so the real component re-renders instantly.
 * `onChange` is called after each change (the Accessibility panel re-audits).
 */
export function mountConfigure(host: HTMLElement, preview: HTMLElement, demo: Demo, onChange: () => void): ConfigureApi {
  const changed = new Map<string, string>()
  const inputs: Array<() => void> = []
  let appliedDerived = new Set<string>()
  host.replaceChildren()

  const apply = (name: string, value: string | null) => {
    if (value === null) {
      preview.style.removeProperty(name)
      changed.delete(name)
    } else {
      preview.style.setProperty(name, value)
      changed.set(name, value)
    }
    // Shared tokens changed below :root: re-declare the component tokens built on them (never the ones set by hand)
    const derived = deriveTokens(changed.keys(), new Set(changed.keys()))
    for (const k of appliedDerived) if (!(k in derived)) preview.style.removeProperty(k)
    for (const [k, v] of Object.entries(derived)) preview.style.setProperty(k, v)
    appliedDerived = new Set(Object.keys(derived))
    css.value = [...changed].map(([k, v]) => `  ${k}: ${v};`).join('\n')
    css.parentElement!.hidden = changed.size === 0
    onChange()
  }

  const group = (title: string, hint?: string, open = false) => {
    const d = document.createElement('details')
    d.className = 'cfg-group'
    d.open = open
    d.innerHTML = `<summary>${title}</summary>${hint ? `<p class="cfg-hint">${hint}</p>` : ''}<div class="cfg-grid"></div>`
    host.append(d)
    return d.querySelector<HTMLElement>('.cfg-grid')!
  }

  let seq = 0
  const tokenRow = (grid: HTMLElement, t: TokenControl) => {
    const id = `cfg-${++seq}`
    const row = document.createElement('div')
    row.className = 'cfg-row'
    const label = t.name.replace(/^--sub-/, '')
    if (t.type === 'color') {
      row.innerHTML = `<label for="${id}">${t.description}<code>${label}</code></label><input id="${id}" type="color">`
      const input = row.querySelector('input')!
      const read = () => (input.value = toHex(getComputedStyle(preview).getPropertyValue(t.name)))
      read()
      inputs.push(read)
      input.addEventListener('input', () => apply(t.name, input.value))
    } else {
      row.innerHTML = `<label for="${id}">${t.description}<code>${label}</code></label>
        <div class="cfg-pair"><input id="${id}" type="number" min="${t.min}" max="${t.max}" step="${stepOf(t)}" inputmode="decimal">
        <span class="unit">${t.unit || ''}</span>
        <input type="range" aria-label="${t.description} (slider)" min="${t.min}" max="${t.max}" step="${stepOf(t)}" tabindex="-1"></div>`
      const [num, range] = row.querySelectorAll('input') as unknown as [HTMLInputElement, HTMLInputElement]
      const read = () => {
        const v = toNumber(getComputedStyle(preview).getPropertyValue(t.name), t.unit)
        num.value = range.value = String(Math.round(v * 100) / 100)
      }
      read()
      inputs.push(read)
      const set = (v: string) => {
        num.value = range.value = v
        apply(t.name, `${v}${t.unit}`)
      }
      num.addEventListener('input', () => num.value !== '' && set(num.value))
      range.addEventListener('input', () => set(range.value))
    }
    grid.append(row)
  }

  // ---- 1. attributes of the component
  if (demo.props) {
    const grid = group('Component options', 'Attributes of this component. They are set on every example.', true)
    for (const c of demo.props.controls) propRow(grid, c, demo.props.selector, preview, onChange, ++seq)
  }

  // ---- 2. this component's tokens
  const own = (demo.tokens ?? [demo.id]).flatMap((n) => componentTokens(n))
  if (own.length) {
    const grid = group('Component tokens', `CSS custom properties of ${demo.title.toLowerCase()}. They default to the shared tokens below.`, true)
    own.forEach((t) => tokenRow(grid, t))
  }

  // ---- 3. shared tokens
  for (const g of globalTokens) {
    const grid = group(g.group, 'Shared tokens: every component that uses them changes.')
    g.controls.forEach((t) => tokenRow(grid, t))
  }

  // ---- 4. output
  const out = document.createElement('div')
  out.className = 'cfg-out'
  out.hidden = true
  out.innerHTML = `<h3>Your overrides</h3><p class="cfg-hint">Paste into your stylesheet.</p><label class="sr-only" for="cfg-css">CSS</label><textarea id="cfg-css" readonly rows="4"></textarea>
    <div class="cfg-actions"><button type="button" id="cfg-copy">Copy CSS</button><button type="button" id="cfg-reset">Reset all</button></div>`
  host.append(out)
  const css = out.querySelector('textarea')!
  out.querySelector('#cfg-reset')!.addEventListener('click', () => {
    for (const name of [...changed.keys(), ...appliedDerived]) preview.style.removeProperty(name)
    appliedDerived = new Set()
    changed.clear()
    css.value = ''
    out.hidden = true
    host.querySelectorAll('[data-prop]').forEach((el) => el.dispatchEvent(new Event('reset-prop')))
    inputs.forEach((fn) => fn())
    onChange()
  })
  out.querySelector('#cfg-copy')!.addEventListener('click', async (e) => {
    const b = e.currentTarget as HTMLButtonElement
    try {
      await navigator.clipboard.writeText(`:root {\n${css.value}\n}`)
      b.textContent = 'Copied'
    } catch {
      css.select()
      b.textContent = 'Select and copy'
    }
    setTimeout(() => (b.textContent = 'Copy CSS'), 1800)
  })

  return { refresh: () => inputs.forEach((fn) => fn()) }
}

function propRow(grid: HTMLElement, c: PropControl, selector: string, preview: HTMLElement, onChange: () => void, n: number): void {
  const id = `prop-${n}`
  const row = document.createElement('div')
  row.className = 'cfg-row'
  row.dataset.prop = c.name
  const targets = () => [...preview.querySelectorAll(selector)]
  const first = targets()[0]
  const initial = first?.getAttribute(c.name)
  const set = (v: string | null) => {
    for (const t of targets()) v === null ? t.removeAttribute(c.name) : t.setAttribute(c.name, v)
    onChange()
  }
  if (c.type === 'boolean') {
    row.innerHTML = `<label class="cfg-check"><input id="${id}" type="checkbox"><span><code>${c.name}</code></span></label>`
    const input = row.querySelector('input')!
    input.checked = first?.hasAttribute(c.name) ?? false
    input.addEventListener('change', () => set(input.checked ? '' : null))
    row.addEventListener('reset-prop', () => (input.checked = first?.hasAttribute(c.name) ?? false))
  } else if (c.type === 'select') {
    row.innerHTML = `<label for="${id}"><code>${c.name}</code></label><select id="${id}">${['', ...c.options].map((o) => `<option value="${o}">${o || '(default)'}</option>`).join('')}</select>`
    const input = row.querySelector('select')!
    input.value = initial ?? ''
    input.addEventListener('change', () => set(input.value || null))
    row.addEventListener('reset-prop', () => (input.value = ''))
  } else {
    row.innerHTML = `<label for="${id}"><code>${c.name}</code></label><input id="${id}" type="${c.type === 'number' ? 'number' : 'text'}" ${c.type === 'number' ? `min="${c.min ?? ''}" max="${c.max ?? ''}" step="${c.step ?? 1}"` : ''}>`
    const input = row.querySelector('input')!
    input.value = initial ?? ''
    input.addEventListener('input', () => set(input.value === '' ? null : input.value))
    row.addEventListener('reset-prop', () => (input.value = initial ?? ''))
  }
  grid.append(row)
}
