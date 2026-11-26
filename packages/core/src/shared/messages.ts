/**
 * Every user-facing default string lives here so it can be translated in one place.
 * Error copy follows SubUX: [what went wrong] + [how to fix], neutral tone, no codes.
 */
export interface MessageContext {
  /** Field label as shown to the user */
  label: string
  /** `choice`: pick from options. `check`: must be ticked. `text`: type a value. */
  kind?: 'text' | 'choice' | 'check'
  example?: string
  min?: string
  max?: string
  minLength?: number
  maxLength?: number
  length?: number
}

const lower = (s: string) => s.toLowerCase()
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)
const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`

export const defaultMessages = {
  // Validation (see error-messages-in-forms)
  valueMissing: (c: MessageContext) =>
    c.kind === 'check'
      ? `Select "${c.label}" to continue`
      : c.kind === 'choice'
        ? `Please select ${lower(c.label)}`
        : `Please enter your ${lower(c.label)}`,
  typeMismatch: (c: MessageContext) =>
    `Enter a valid ${lower(c.label)}${c.example ? ` - for example, ${c.example}` : ''}`,
  patternMismatch: (c: MessageContext) =>
    `Enter a valid ${lower(c.label)}${c.example ? ` - for example, ${c.example}` : ''}`,
  badInput: (c: MessageContext) => `Enter a valid ${lower(c.label)}`,
  stepMismatch: (c: MessageContext) => `Enter a valid ${lower(c.label)}`,
  tooShort: (c: MessageContext) => {
    const need = (c.minLength ?? 0) - (c.length ?? 0)
    return `${cap(c.label)} must be at least ${plural(c.minLength ?? 0, 'character', 'characters')} - add ${need} more`
  },
  tooLong: (c: MessageContext) => {
    const extra = (c.length ?? 0) - (c.maxLength ?? 0)
    return `${cap(c.label)} must be at most ${plural(c.maxLength ?? 0, 'character', 'characters')} - remove ${extra}`
  },
  rangeUnderflow: (c: MessageContext) =>
    c.max ? `${cap(c.label)} must be between ${c.min} and ${c.max}` : `${cap(c.label)} must be ${c.min} or more`,
  rangeOverflow: (c: MessageContext) =>
    c.min ? `${cap(c.label)} must be between ${c.min} and ${c.max}` : `${cap(c.label)} must be ${c.max} or less`,

  // Field chrome
  optional: 'optional',
  showPassword: 'Show password',
  characterCount: (n: number, max: number) => `${n} of ${max} characters`,

  // Generic UI
  close: 'Close',
  /** The button that shows the navigation of <sub-layout> on narrow screens */
  navigationMenu: 'Menu',
  loading: 'Loading',
  cancel: 'Cancel',
  expandAll: 'Expand all',
  collapseAll: 'Collapse all',
  errorsToFix: (n: number) => `Please fix ${n} errors before continuing`,
  breadcrumb: 'Breadcrumb',
  pagination: 'Pagination',
  previous: 'Previous',
  next: 'Next',
  pageOf: (page: number, total: number) => `Page ${page} of ${total}`,
  stepOf: (step: number, total: number) => `Step ${step} of ${total}`,
  showing: (from: number, to: number, total: number) => `Showing ${from}-${to} of ${total}`,
  loadMore: (n: number) => `Load ${n} more`,
  remaining: (n: number) => `${n} remaining`,
  opensInNewTab: '(opens in a new tab)',
  showMore: 'Show more',
  showLess: 'Show less',
  suggestions: (n: number) => (n === 1 ? '1 suggestion available' : `${n} suggestions available`),
  noSuggestions: 'No suggestions',
  subRows: (name: string) => `Sub-rows of ${name}`,
  subRowOf: (name: string) => `sub-row of ${name}`,
  rowExpanded: (name: string, n: number) => `${name} expanded, ${n === 1 ? '1 sub-row' : `${n} sub-rows`}`,
  rowCollapsed: (name: string) => `${name} collapsed`,
  noResults: 'No results',
  mentionSuggestions: 'Suggestions',
  tourStep: (n: number, total: number) => `Step ${n} of ${total}`,
  tourClose: 'Close tour',
  tourFinish: 'Finish',
  results: (n: number) => (n === 1 ? '1 result' : `${n} results`),
  search: (label: string) => `Search ${label}`,
  done: 'Done',
  selectedCount: (n: number) => (n === 1 ? '1 selected' : `${n} selected`),
  removeValue: (name: string) => `Remove ${name}`,
  clearSelection: (label: string) => `Clear ${label}`,
  removeFilter: (name: string) => `Remove filter: ${name}`,
  skipToContent: 'Skip to main content',
  dragHandle: (name: string) => `Drag to move ${name}`,
  moveUp: 'Move up',
  moveDown: 'Move down',
  moveItemUp: (name: string) => `Move ${name} up`,
  moveItemDown: (name: string) => `Move ${name} down`,
  grabbed: (name: string, pos: number, total: number) =>
    `Grabbed ${name}. Position ${pos} of ${total}. Arrow keys to move, Space to drop, Escape to cancel.`,
  movedTo: (pos: number, total: number) => `Moved to position ${pos} of ${total}.`,
  dropped: (name: string, pos: number, total: number) => `Dropped ${name} at position ${pos} of ${total}.`,
  reorderCancelled: (name: string, pos: number) => `Reorder cancelled. ${name} returned to position ${pos}.`,

  // Data entry
  decrease: (label: string) => `Decrease ${label}`,
  increase: (label: string) => `Increase ${label}`,
  choose: 'Choose',
  chooseFiles: 'Choose files',
  dragFilesHere: 'or drag and drop them here',
  removeFile: (name: string) => `Remove file: ${name}`,
  fileTooLarge: (name: string, max: string) => `${name} is larger than ${max}`,
  fileWrongType: (name: string, accept: string) => `${name} is not an accepted type (${accept})`,
  tooManyFiles: (max: number) => `You can add at most ${max} files`,
  selectAll: 'Select all',
  moveToRight: (side: string) => `Move selected to ${side}`,
  moveToLeft: (side: string) => `Move selected to ${side}`,
  hexValue: 'Hex value',
  previousMonth: 'Previous month',
  nextMonth: 'Next month',
  chooseDate: 'Choose date',
  today: 'Today',
  dateFormat: 'yyyy-mm-dd',
  starsOf: (n: number, count: number) => `${n} of ${count} stars`,
  clearRating: 'Clear rating',
  levelN: (n: number) => `Level ${n}`,
  pause: 'Pause',
  play: 'Play',
  previousSlide: 'Previous slide',
  nextSlide: 'Next slide',
  slideOf: (n: number, total: number) => `${n} of ${total}`,
  resizePanes: 'Resize panes',
  scrollToTop: 'Back to top',
  onThisPage: 'On this page',

  // Chat
  aiAssistant: 'AI assistant',
  you: 'You',
  assistantSaid: 'Assistant said:',
  youSaid: 'You said:',
  message: 'Message',
  send: 'Send',
  stopGenerating: 'Stop generating',
  assistantTyping: 'Assistant is typing',
  stillWorking: 'Still working on that...',
  suggestedReplies: 'Suggested replies',
  conversation: 'Conversation',
  messageActions: 'Message actions',
  copy: 'Copy',
  copied: 'Copied to clipboard',
  regenerate: 'Regenerate response',
  goodResponse: 'Good response',
  badResponse: 'Bad response',
  chatHint: 'Enter sends, Shift+Enter adds a new line.',
} as const

export type Messages = {
  -readonly [K in keyof typeof defaultMessages]: (typeof defaultMessages)[K]
}

export const messages: Messages = { ...defaultMessages } as Messages

/** Replace any message (translation or tone). Call once at start-up. */
export function setMessages(next: Partial<Messages>): void {
  Object.assign(messages, next)
}
