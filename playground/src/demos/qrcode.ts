import { defineQrcode } from '@sub/core/qrcode'
import type { Demo } from '../demo'

export default {
  id: "qrcode",
  title: "QR code",
  group: "Data",
  description: "Inline SVG with a name AND the encoded value as text, so nobody depends on scanning.",
  define: defineQrcode,
  html: `
<sub-qrcode value="https://example.com/orders/1042" label="QR code for order 1042"></sub-qrcode>
`,
  tokens: ["qrcode"],
  props: { selector: 'sub-qrcode', controls: [{ name: 'value', type: 'text' }, { name: 'level', type: 'select', options: ['L', 'M', 'Q', 'H'] }, { name: 'show-value', type: 'boolean' }] },
} satisfies Demo
