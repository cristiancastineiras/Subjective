import { expect, test, type Page } from '@playwright/test'
import { open } from './helpers'

const status = (page: Page) => page.locator('#result')
const activeTag = (page: Page) => page.evaluate(() => {
  let a = document.activeElement
  while (a?.shadowRoot?.activeElement) a = a.shadowRoot.activeElement
  return a?.localName ?? ''
})

test('tabs: arrows, Home/End, roving tabindex, Tab enters the panel', async ({ page }) => {
  await open(page, 'tabs')
  const tabs = page.getByRole('tab')
  await tabs.first().focus()
  await page.keyboard.press('ArrowRight')
  await expect(tabs.nth(1)).toBeFocused()
  await expect(tabs.nth(1)).toHaveAttribute('aria-selected', 'true')
  await expect(page.getByRole('tabpanel')).toHaveAccessibleName('Security')
  await page.keyboard.press('End')
  await expect(tabs.nth(2)).toBeFocused()
  await page.keyboard.press('ArrowRight') // wraps
  await expect(tabs.first()).toBeFocused()
  await page.keyboard.press('Tab')
  await expect(page.getByRole('tabpanel')).toBeFocused()
  // only the selected tab is a tab stop
  await expect(tabs.nth(1)).toHaveAttribute('tabindex', '-1')
})

test('accordion: Enter/Space toggle, expand all flips and stays in sync', async ({ page }) => {
  await open(page, 'accordion')
  const first = page.getByRole('button', { name: 'How do I reset my password?' })
  await expect(first).toHaveAttribute('aria-expanded', 'false')
  await first.focus()
  await page.keyboard.press('Enter')
  await expect(first).toHaveAttribute('aria-expanded', 'true')
  await page.keyboard.press('Space')
  await expect(first).toHaveAttribute('aria-expanded', 'false')
  const all = page.getByRole('button', { name: 'Expand all' })
  await all.focus()
  await page.keyboard.press('Enter')
  await expect(page.getByRole('button', { name: 'Collapse all' })).toHaveAttribute('aria-expanded', 'true')
  const preview = page.locator('#preview')
  await expect(preview.getByRole('region')).toHaveCount(3)
  await expect(preview.getByRole('heading', { level: 3 })).toHaveCount(3)
})

test('dialog: focus inside, Tab cycles, Esc closes and focus returns to the opener', async ({ page }) => {
  await open(page, 'dialog')
  const opener = page.getByRole('button', { name: 'Edit profile' })
  await opener.focus()
  await page.keyboard.press('Enter')
  const dialog = page.getByRole('dialog', { name: 'Edit profile' })
  await expect(dialog).toBeVisible()
  await expect(page.getByRole('textbox', { name: 'Display name' })).toBeFocused()
  // Focus stays in the dialog (or leaves to the browser UI, never to the inert page behind it)
  for (let i = 0; i < 8; i++) {
    await page.keyboard.press('Tab')
    expect(await page.evaluate(() => !document.activeElement || document.activeElement === document.body || !!document.activeElement.closest('sub-dialog'))).toBe(true)
  }
  await dialog.getByRole('heading', { name: 'Edit profile' }).click() // back into the page after tabbing out
  await page.keyboard.press('Escape')
  await expect(dialog).toBeHidden()
  await expect(opener).toBeFocused()
  await expect(status(page)).toHaveText('Dialog closed (dismissed).')
})

test('confirm dialog: initial focus is on Cancel and Esc never confirms', async ({ page }) => {
  await open(page, 'confirm-dialog')
  await page.getByRole('button', { name: 'Delete project' }).focus()
  await page.keyboard.press('Enter')
  const dialog = page.getByRole('alertdialog', { name: 'Delete the project Atlas permanently?' })
  await expect(dialog).toBeVisible()
  await expect(dialog).toHaveAccessibleDescription(/cannot be undone/)
  await expect(page.getByRole('button', { name: 'Cancel' })).toBeFocused() // slotted into the dialog
  await page.keyboard.press('Escape')
  await expect(status(page)).toHaveText('Deletion cancelled.')
  await expect(page.getByRole('button', { name: 'Delete project' }).first()).toBeFocused()
})

test('confirm dialog: confirming needs a deliberate action', async ({ page }) => {
  await open(page, 'confirm-dialog')
  await page.getByRole('button', { name: 'Delete project' }).click()
  await page.keyboard.press('Tab')
  await page.keyboard.press('Enter')
  await expect(status(page)).toHaveText('Project deleted.')
})

test('menu: opens on the first/last item, arrows, type-ahead, Esc returns to the trigger', async ({ page }) => {
  await open(page, 'menu')
  const trigger = page.getByRole('button', { name: 'More actions' })
  await trigger.focus()
  await page.keyboard.press('ArrowDown')
  await expect(page.getByRole('menuitem', { name: 'Duplicate' })).toBeFocused()
  await page.keyboard.press('ArrowDown')
  await expect(page.getByRole('menuitem', { name: 'Archive' })).toBeFocused()
  await page.keyboard.press('End')
  await expect(page.getByRole('menuitem', { name: 'Open button docs' })).toBeFocused()
  await page.keyboard.press('d')
  await expect(page.getByRole('menuitem', { name: 'Duplicate' })).toBeFocused()
  await page.keyboard.press('Escape')
  await expect(trigger).toBeFocused()
  await expect(trigger).toHaveAttribute('aria-expanded', 'false')
  await page.keyboard.press('Enter')
  await page.keyboard.press('Enter')
  await expect(status(page)).toHaveText('Chose: duplicate.')
  await expect(trigger).toBeFocused()
})

test('autocomplete: combobox pattern, no auto-selection, Esc keeps the text', async ({ page }) => {
  await open(page, 'autocomplete')
  const box = page.getByRole('combobox', { name: 'City' })
  await box.focus()
  await page.keyboard.type('ma')
  await expect(box).toHaveAttribute('aria-expanded', 'true')
  await expect(page.getByRole('option')).toHaveCount(4) // Madrid, Malaga, Manchester, Marseille
  await expect(box).not.toHaveAttribute('aria-activedescendant', /./) // nothing auto-selected
  await page.keyboard.press('ArrowDown')
  await expect(page.getByRole('option', { name: 'Madrid' })).toHaveAttribute('aria-selected', 'true')
  await page.keyboard.press('ArrowDown')
  await page.keyboard.press('Escape')
  await expect(box).toHaveAttribute('aria-expanded', 'false')
  await expect(box).toHaveValue('ma')
  await page.keyboard.press('ArrowDown')
  await page.keyboard.press('Enter')
  await expect(box).toHaveValue('Madrid')
  await expect(status(page)).toHaveText('Selected: Madrid.')
  await expect(box).toBeFocused() // caret stays in the input
})

test('form: shows every error at once, a summary from 3 errors, and moves focus to it', async ({ page }) => {
  await open(page, 'form')
  await page.getByRole('button', { name: 'Create account' }).click()
  const summary = page.getByRole('alert').filter({ hasText: 'Please fix 4 errors before continuing' })
  await expect(summary).toBeVisible()
  await expect(summary).toBeFocused()
  await expect(page.getByText('Please enter your first name').first()).toBeVisible()
  await expect(status(page)).toHaveText('4 errors; not submitted.')
  await page.getByRole('link', { name: /Email address:/ }).click()
  await expect(page.getByRole('textbox', { name: 'Email address' })).toBeFocused()
})

test('form: valid data submits and nothing is wiped', async ({ page }) => {
  await open(page, 'form')
  await page.getByRole('textbox', { name: 'First name' }).fill('Ana')
  await page.getByRole('textbox', { name: 'Email address' }).fill('ana@example.com')
  await page.getByRole('textbox', { name: 'Postal code' }).fill('28013')
  await page.getByRole('checkbox', { name: 'I accept the terms' }).check()
  await page.getByRole('button', { name: 'Create account' }).click()
  await expect(status(page)).toContainText('given=Ana')
  await expect(status(page)).toContainText('email=ana@example.com')
})

test('input: friendly error on blur, cleared once fixed', async ({ page }) => {
  await open(page, 'input')
  const email = page.getByRole('textbox', { name: 'Email address' })
  await email.fill('nope')
  await email.blur()
  await expect(page.getByText('Enter a valid email address - for example, ana@example.com')).toBeVisible()
  await expect(email).toHaveAttribute('aria-invalid', 'true')
  await email.fill('ana@example.com')
  await expect(page.getByText('Enter a valid email address')).toBeHidden()
})

test('radio group: one tab stop, arrows move and select', async ({ page }) => {
  await open(page, 'radio-group')
  await page.getByRole('radio', { name: /Standard/ }).focus()
  await page.keyboard.press('ArrowDown')
  await expect(page.getByRole('radio', { name: /Express/ })).toBeChecked()
  await page.keyboard.press('ArrowDown') // skips the disabled option, wraps
  await expect(page.getByRole('radio', { name: /Standard/ })).toBeChecked()
})

test('switch and checkbox: Space toggles', async ({ page }) => {
  await open(page, 'switch')
  const sw = page.getByRole('switch', { name: 'Dark mode' })
  await sw.focus()
  await page.keyboard.press('Space')
  await expect(sw).toHaveAttribute('aria-checked', 'true')
  await expect(status(page)).toHaveText('Dark mode turned on.')
  await open(page, 'checkbox')
  const all = page.getByRole('checkbox', { name: 'Select all' })
  await expect(all).toBeChecked({ checked: false })
  await all.focus()
  await page.keyboard.press('Space')
  await expect(page.getByRole('checkbox', { name: 'Events' })).toBeChecked()
})

test('sortable list: grab, move, drop and cancel with the keyboard, announced', async ({ page }) => {
  await open(page, 'sortable-list')
  const handle = page.getByRole('button', { name: 'Drag to move Review the design' })
  await handle.focus()
  await page.keyboard.press('Space')
  await expect(handle).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByText(/Grabbed Review the design. Position 2 of 4/)).toBeAttached()
  await page.keyboard.press('ArrowUp')
  await expect(handle).toBeFocused()
  await page.keyboard.press('Space')
  await expect(status(page)).toHaveText('Order: Review the design > Write the spec > Build the prototype > Test with users')
  // Cancel returns the item
  await page.keyboard.press('Space')
  await page.keyboard.press('ArrowDown')
  await page.keyboard.press('Escape')
  await expect(page.getByText(/Reorder cancelled/)).toBeAttached()
  // Visible buttons work without a grab step
  await page.getByRole('button', { name: 'Move Test with users up' }).click()
  await expect(status(page)).toContainText('Test with users')
})

test('chat: Enter sends, focus stays in the composer, generation can be stopped', async ({ page }) => {
  await open(page, 'chat')
  await expect(page.getByText('I answer questions about your account')).toBeVisible()
  const box = page.getByRole('textbox', { name: 'Message' })
  await box.focus()
  await page.keyboard.type('Where is my invoice?')
  await page.keyboard.press('Enter')
  await expect(page.locator('sub-chat-message').first()).toContainText('Where is my invoice?')
  await expect(box).toBeFocused()
  await expect(page.getByRole('button', { name: 'Stop generating' })).toBeVisible()
  await page.getByRole('button', { name: 'Stop generating' }).click()
  await expect(status(page)).toHaveText('Generation stopped.')
  await page.getByRole('button', { name: 'Talk to a human' }).click()
  await expect(status(page)).toHaveText('Transferring to a person.')
})

test('tooltip: shows on focus, Esc dismisses', async ({ page }) => {
  await open(page, 'tooltip')
  const tip = page.locator('sub-tooltip')
  await page.getByRole('button', { name: 'Export report' }).focus()
  await expect(tip).toBeVisible()
  // The description is attached to the button INSIDE the sub-button shadow root (element reference:
  // an id could not cross the boundary). Playwright only reads ids, so assert the reference itself.
  expect(await page.evaluate(() => {
    const inner = document.querySelector('#export')?.shadowRoot?.querySelector('button') as (HTMLElement & { ariaDescribedByElements?: Element[] }) | null
    return inner?.ariaDescribedByElements?.map((e) => e.localName + ':' + e.textContent?.trim())
  })).toEqual(['sub-tooltip:CSV with every row from the last 30 days'])
  await page.keyboard.press('Escape')
  await expect(tip).toBeHidden()
})

test('toast: announced politely, Undo is reachable', async ({ page }) => {
  await open(page, 'toast')
  await page.getByRole('button', { name: 'Turn off notifications' }).click()
  await expect(page.getByRole('status').filter({ hasText: 'Notifications turned off' })).toBeVisible()
  await page.getByRole('button', { name: 'Undo' }).click()
  await expect(status(page)).toHaveText('Undo pressed.')
})

test('pagination and load more', async ({ page }) => {
  await page.setViewportSize({ width: 1600, height: 900 }) // wide enough for the numbered (not compact) pagination
  await open(page, 'pagination')
  await expect(page.getByRole('button', { name: 'Page 3' })).toHaveAttribute('aria-current', 'page')
  await page.getByRole('button', { name: 'Page 4' }).focus()
  await page.keyboard.press('Enter')
  await expect(status(page)).toHaveText('Go to page 4.')
  await open(page, 'load-more')
  const more = page.getByRole('button', { name: /Load 20 more products/ })
  await more.focus()
  await page.keyboard.press('Enter')
  await expect(status(page)).toHaveText('40 of 64 loaded.')
  await expect(page.getByRole('button', { name: /Load 20 more products/ })).toBeFocused()
})

test('skip link: first Tab reveals it, Enter moves focus to the target (also after the audit has run)', async ({ page }) => {
  await open(page, 'skip-link')
  await page.locator('#a11y[data-score]').waitFor() // the automatic audit moves focus around while it measures; it must not leave a trace
  await page.keyboard.press('Tab')
  const link = page.getByRole('link', { name: 'Skip to main content' })
  await expect(link).toBeFocused()
  await expect(link).toBeInViewport()
  await page.keyboard.press('Enter')
  await expect(page.locator('main')).toBeFocused()
})

test('focus utilities: moveFocus gives a heading a temporary tabindex', async ({ page }) => {
  await open(page, 'focus')
  await page.getByRole('button', { name: /Move focus to the heading/ }).click()
  await expect(page.getByRole('heading', { name: 'Target heading' })).toBeFocused()
  await page.keyboard.press('Tab')
  await expect(page.getByRole('heading', { name: 'Target heading' })).not.toHaveAttribute('tabindex', /.*/)
  await page.getByRole('button', { name: /first invalid field/ }).click()
  expect(await activeTag(page)).toBe('input')
})
