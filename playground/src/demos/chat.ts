import { defineChat } from '@sub/core/chat'
import type { Demo } from '../demo'

export default {
  id: "chat",
  title: "AI chat",
  group: "Patterns",
  description: "Says it is an AI and what it can do first; example prompts instead of a blank screen; live log; stop generating; a human is one click away.",
  define: defineChat,
  html: `
<sub-chat class="wide" heading="Help assistant" escalation-label="Talk to a human"
  intro="I answer questions about your account and billing. I cannot change your plan or see payment details.">
</sub-chat>
`,
  tokens: ["chat"],
  keyboard: [
    ["Tab", "Conversation, suggestions, message box, send, escape hatch"],
    ["Enter", "Send"],
    ["Shift+Enter", "New line"],
    ["Arrow keys / Page keys", "Scroll the focused conversation"],
  ],
  setup(preview, log) {
    const chat = preview.querySelector('sub-chat')
    if (!chat) return
    chat.examples = ['How do I reset my password?', 'Why was I charged twice?', 'Export my data']
    const add = (sender: 'user' | 'assistant', text: string) => {
      const m = document.createElement('sub-chat-message')
      m.setAttribute('sender', sender)
      if (sender === 'assistant') m.setAttribute('actions', '')
      m.textContent = text
      chat.append(m)
    }
    let timer: ReturnType<typeof setTimeout> | undefined
    chat.addEventListener('sub-send', (event) => {
      add('user', (event as CustomEvent<{ message: string }>).detail.message)
      chat.generating = true
      timer = setTimeout(() => {
        chat.generating = false
        add('assistant', 'You can do that from Settings > Account. Was this helpful?')
        chat.suggestions = ['Yes, thanks', 'No, I need more help']
      }, 900)
    })
    chat.addEventListener('sub-stop', () => {
      clearTimeout(timer)
      chat.generating = false
      log('Generation stopped.')
    })
    chat.addEventListener('sub-escalate', () => log('Transferring to a person.'))
  },
} satisfies Demo
