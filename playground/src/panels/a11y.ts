import { auditAll, isBusy, summarize, type A11yCheck, type A11yReport } from '@sub/core/a11y'

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

const STATUS = {
  fail: ['Fail', 'fail'],
  pass: ['Pass', 'pass'],
  manual: ['Check by hand', 'manual'],
} as const

const RANK = { fail: 0, manual: 1, pass: 2 } as const

/** One report per tag: worst result of each check across all instances of the component */
function mergeByTag(reports: A11yReport[]): Array<A11yReport & { instances: number }> {
  const groups = new Map<string, A11yReport[]>()
  for (const r of reports) groups.set(r.tag, [...(groups.get(r.tag) ?? []), r])
  return [...groups].map(([tag, list]) => {
    const checks = new Map<string, A11yCheck>()
    for (const r of list) {
      for (const c of r.checks) {
        const prev = checks.get(c.id)
        if (!prev || RANK[c.status] < RANK[prev.status]) checks.set(c.id, { ...c })
        else if (c.status === 'fail' && prev.status === 'fail') {
          prev.nodes = [...new Set([...(prev.nodes ?? []), ...(c.nodes ?? [])])]
          prev.detail = prev.nodes.slice(0, 4).join('; ')
        }
      }
    }
    const merged = [...checks.values()]
    const fail = merged.filter((c) => c.status === 'fail').length
    const manual = merged.filter((c) => c.status === 'manual').length
    return {
      tag,
      instances: list.length,
      score: Math.min(...list.map((r) => r.score)),
      compliant: list.every((r) => r.compliant),
      strict: list.every((r) => r.strict),
      counts: { pass: merged.length - fail - manual, fail, manual },
      checks: merged,
    }
  })
}

/**
 * Accessibility panel: audits the rendered preview (see @sub/core/a11y) and lists every check.
 * Statuses are words, not just colours. Failing checks come first.
 */
export function mountA11y(host: HTMLElement, preview: HTMLElement): { run(): void } {
  let timer: ReturnType<typeof setTimeout> | undefined
  let last: A11yReport[] = []

  const render = () => {
    const reports = last
    const sum = summarize(reports)
    const verdict = sum.strict ? 'Meets every check' : sum.compliant ? 'Meets WCAG 2.2 AA (some AAA or best-practice checks fail)' : 'Does not meet WCAG 2.2 AA'
    host.dataset.score = String(sum.score)
    host.dataset.compliant = String(sum.compliant)
    host.dataset.strict = String(sum.strict)
    host.innerHTML = `
      <div class="a11y-summary">
        <p class="a11y-score" aria-label="Score ${sum.score} percent"><span>${sum.score}</span>%</p>
        <div>
          <p class="a11y-verdict"><strong class="tag tag--${sum.strict ? 'pass' : sum.compliant ? 'warn' : 'fail'}">${sum.strict ? 'Pass' : sum.compliant ? 'AA pass' : 'Fail'}</strong> ${verdict}</p>
          <p class="cfg-hint">Weighted share of the automated checks that pass (A and AA count most). Automation cannot judge meaning: the "Check by hand" items still need a person and a screen reader.</p>
        </div>
      </div>
      ${mergeByTag(reports)
        .map((r) => {
          const ordered = [...r.checks].sort((a, b) => rank(a.status) - rank(b.status))
          return `<details class="a11y-report" ${r.counts.fail ? 'open' : ''}>
            <summary><code>${r.tag}</code>${r.instances > 1 ? ` &times;${r.instances}` : ''} ${r.score}% &middot; ${r.counts.fail} failing, ${r.counts.pass} passing, ${r.counts.manual} to check by hand</summary>
            <div class="table-wrap"><table>
              <caption class="sr-only">Checks for ${r.tag}</caption>
              <thead><tr><th scope="col">Result</th><th scope="col">Check</th><th scope="col">Level</th><th scope="col">Reference</th></tr></thead>
              <tbody>${ordered
                .map((c) => {
                  const [word, cls] = STATUS[c.status]
                  return `<tr data-status="${c.status}" data-check="${c.id}"><td><strong class="tag tag--${cls}">${word}</strong></td>
                    <td>${esc(c.title)}${c.detail ? `<br><span class="cfg-hint">${esc(c.detail)}</span>` : ''}</td><td>${c.level === 'best' ? 'Best practice' : c.level}</td><td>${esc(c.ref)}</td></tr>`
                })
                .join('')}</tbody></table></div>
          </details>`
        })
        .join('')}`
  }

  const rank = (s: string) => (s === 'fail' ? 0 : s === 'manual' ? 1 : 2)

  /** Resolves when finite animations and transitions are done (colours mid-transition are not real colours) */
  const settle = () =>
    Promise.race([
      Promise.all(
        document
          .getAnimations()
          .filter((a) => Number.isFinite(a.effect?.getComputedTiming().endTime ?? 0))
          .map((a) => a.finished.catch(() => undefined)),
      ),
      new Promise((r) => setTimeout(r, 800)),
    ])

  const run = () => {
    clearTimeout(timer)
    timer = setTimeout(async () => {
      if (isBusy(preview)) return run() // the user is inside the component: auditing would move their focus
      await settle()
      last = auditAll(preview)
      render()
    }, 120)
  }
  // Handle for tests / console
  ;(window as unknown as { subAudit: () => Promise<A11yReport[]> }).subAudit = async () => {
    await settle()
    return auditAll(preview)
  }
  return { run }
}
