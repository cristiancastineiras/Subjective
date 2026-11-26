import { defineAll } from '@sub/core'
import * as subTheme from '@sub/core/theme'
import { dashboardHtml, setupDashboard } from './dashboard'
import { mountEditor } from './editor'

/**
 * Studio: a complete working application on the left, its theme editor on the right.
 * Change anything and the whole app re-themes live; export the result as JSON, CSS or an install snippet.
 */
export async function mountStudio(preview: HTMLElement, editor: HTMLElement): Promise<void> {
  defineAll()
  preview.innerHTML = dashboardHtml
  await customElements.whenDefined('sub-app')
  const app = setupDashboard(preview)
  const api = mountEditor(editor, app, preview)
  ;(window as unknown as { studio: unknown; subTheme: unknown }).studio = { app, theme: api.theme }
  ;(window as unknown as { subTheme: unknown }).subTheme = subTheme
}
