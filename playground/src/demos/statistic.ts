import { defineStatistic } from '@sub/core/statistic'
import { defineGrid } from '@sub/core/grid'
import type { Demo } from '../demo'

export default {
  id: "statistic",
  title: "Statistic",
  group: "Data",
  description: "A key figure with its label and a comparison in words; the trend is arrow + text, never colour alone.",
  define() {
    defineStatistic()
    defineGrid()
  },
  html: `
<sub-grid class="wide" style="--sub-grid-min: 12rem">
  <sub-statistic label="Active users (last 30 days)" value="1247" trend="up" trend-text="12% vs last month"></sub-statistic>
  <sub-statistic label="Revenue" value="48200" prefix="EUR " trend="down" trend-text="3% vs last month"></sub-statistic>
  <sub-statistic label="Open tickets" value="31" trend="flat" trend-text="no change"></sub-statistic>
</sub-grid>
`,
  tokens: ["statistic"],
  props: { selector: 'sub-statistic', controls: [{ name: 'trend', type: 'select', options: ['up', 'down', 'flat'] }] },
} satisfies Demo
