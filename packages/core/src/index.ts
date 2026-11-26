/**
 * Barrel: everything plus `defineAll()`. Prefer per-component imports (`@sub/core/button`) so
 * bundlers only ship what you use. `@sub/core/auto` is the zero-config entry (not exported here).
 * (Generated list: `python gen_index` - keep it in sync when adding a component.)
 */
export * from './a11y'
export * from './a11y-tools'
export * from './accordion'
export * from './affix'
export * from './alert'
export * from './anchor'
export * from './announce'
export * from './app'
export * from './autocomplete'
export * from './avatar'
export * from './badge'
export * from './border-beam'
export * from './breadcrumbs'
export * from './button'
export * from './button-group'
export * from './calendar'
export * from './card'
export * from './carousel'
export * from './cascader'
export * from './chat'
export * from './chat-message'
export * from './checkbox'
export * from './chip'
export * from './color-picker'
export * from './confirm-dialog'
export * from './date-picker'
export * from './descriptions'
export * from './dialog'
export * from './divider'
export * from './drawer'
export * from './dropdown'
export * from './empty-state'
export * from './error-summary'
export * from './flex'
export * from './float-button'
export * from './focus'
export * from './form'
export * from './grid'
export * from './heading'
export * from './icon'
export * from './icon-button'
export * from './image'
export * from './input'
export * from './keys'
export * from './input-number'
export * from './layout'
export * from './link'
export * from './list'
export * from './load-more'
export * from './masonry'
export * from './menu'
export * from './mentions'
export * from './modal'
export * from './nav-menu'
export * from './option'
export * from './pagination'
export * from './popconfirm'
export * from './popover'
export * from './prefs'
export * from './progress'
export * from './qrcode'
export * from './radio'
export * from './rate'
export * from './result'
export * from './segmented'
export * from './select'
export * from './shell'
export * from './skeleton'
export * from './skip-link'
export * from './slider'
export * from './sortable-list'
export * from './spinner'
export * from './splitter'
export * from './statistic'
export * from './stepper'
export * from './switch'
export * from './table'
export * from './tabs'
export * from './text'
export * from './textarea'
export * from './theme'
export * from './time-picker'
export * from './timeline'
export * from './toast'
export * from './tooltip'
export * from './tour'
export * from './transfer'
export * from './tree'
export * from './tree-select'
export * from './truncate'
export * from './upload'
export * from './watermark'
export { configure } from './shared/config'
export { setMessages } from './shared/messages'
export { SubFormControl } from './shared/form-control'

import { defineAccordion } from './accordion'
import { defineAffix } from './affix'
import { defineAlert } from './alert'
import { defineAnchor } from './anchor'
import { defineApp } from './app'
import { defineAutocomplete } from './autocomplete'
import { defineAvatar } from './avatar'
import { defineBadge } from './badge'
import { defineBorderBeam } from './border-beam'
import { defineBreadcrumbs } from './breadcrumbs'
import { defineButton } from './button'
import { defineButtonGroup } from './button-group'
import { defineCalendar } from './calendar'
import { defineCard } from './card'
import { defineCarousel } from './carousel'
import { defineCascader } from './cascader'
import { defineChat } from './chat'
import { defineChatMessage } from './chat-message'
import { defineCheckbox, defineCheckboxGroup } from './checkbox'
import { defineChip } from './chip'
import { defineColorPicker } from './color-picker'
import { defineConfirmDialog } from './confirm-dialog'
import { defineDatePicker } from './date-picker'
import { defineDescriptions } from './descriptions'
import { defineDialog } from './dialog'
import { defineDivider } from './divider'
import { defineDrawer } from './drawer'
import { defineDropdown } from './dropdown'
import { defineEmptyState } from './empty-state'
import { defineErrorSummary } from './error-summary'
import { defineFlex } from './flex'
import { defineFloatButton } from './float-button'
import { defineForm } from './form'
import { defineGrid } from './grid'
import { defineHeading } from './heading'
import { defineIcon } from './icon'
import { defineIconButton } from './icon-button'
import { defineImage } from './image'
import { defineInput } from './input'
import { defineInputNumber } from './input-number'
import { defineLayout } from './layout'
import { defineLink } from './link'
import { defineList } from './list'
import { defineLoadMore } from './load-more'
import { defineMasonry } from './masonry'
import { defineMenu } from './menu'
import { defineMentions } from './mentions'
import { defineModal } from './modal'
import { defineNavMenu } from './nav-menu'
import { defineOption } from './option'
import { definePagination } from './pagination'
import { definePopconfirm } from './popconfirm'
import { definePopover } from './popover'
import { defineProgress } from './progress'
import { defineQrcode } from './qrcode'
import { defineRadioGroup } from './radio'
import { defineRate } from './rate'
import { defineResult } from './result'
import { defineSegmented } from './segmented'
import { defineSelect } from './select'
import { defineShell } from './shell'
import { defineSkeleton } from './skeleton'
import { defineSkipLink } from './skip-link'
import { defineSlider } from './slider'
import { defineSortableList } from './sortable-list'
import { defineSpinner } from './spinner'
import { defineSplitter } from './splitter'
import { defineStatistic } from './statistic'
import { defineStepper } from './stepper'
import { defineSwitch } from './switch'
import { defineTable } from './table'
import { defineTabs } from './tabs'
import { defineText } from './text'
import { defineTextarea } from './textarea'
import { defineTimePicker } from './time-picker'
import { defineTimeline } from './timeline'
import { defineToaster } from './toast'
import { defineTooltip } from './tooltip'
import { defineTour } from './tour'
import { defineTransfer } from './transfer'
import { defineTree } from './tree'
import { defineTreeSelect } from './tree-select'
import { defineTruncate } from './truncate'
import { defineUpload } from './upload'
import { defineWatermark } from './watermark'

export function defineAll(): void {
  defineAccordion()
  defineAffix()
  defineAlert()
  defineAnchor()
  defineApp()
  defineAutocomplete()
  defineAvatar()
  defineBadge()
  defineBorderBeam()
  defineBreadcrumbs()
  defineButton()
  defineButtonGroup()
  defineCalendar()
  defineCard()
  defineCarousel()
  defineCascader()
  defineChat()
  defineChatMessage()
  defineCheckbox()
  defineCheckboxGroup()
  defineChip()
  defineColorPicker()
  defineConfirmDialog()
  defineDatePicker()
  defineDescriptions()
  defineDialog()
  defineDivider()
  defineDrawer()
  defineDropdown()
  defineEmptyState()
  defineErrorSummary()
  defineFlex()
  defineFloatButton()
  defineForm()
  defineGrid()
  defineHeading()
  defineIcon()
  defineIconButton()
  defineImage()
  defineInput()
  defineInputNumber()
  defineLayout()
  defineLink()
  defineList()
  defineLoadMore()
  defineMasonry()
  defineMenu()
  defineMentions()
  defineModal()
  defineNavMenu()
  defineOption()
  definePagination()
  definePopconfirm()
  definePopover()
  defineProgress()
  defineQrcode()
  defineRadioGroup()
  defineRate()
  defineResult()
  defineSegmented()
  defineSelect()
  defineShell()
  defineSkeleton()
  defineSkipLink()
  defineSlider()
  defineSortableList()
  defineSpinner()
  defineSplitter()
  defineStatistic()
  defineStepper()
  defineSwitch()
  defineTable()
  defineTabs()
  defineText()
  defineTextarea()
  defineTimePicker()
  defineTimeline()
  defineToaster()
  defineTooltip()
  defineTour()
  defineTransfer()
  defineTree()
  defineTreeSelect()
  defineTruncate()
  defineUpload()
  defineWatermark()
}
