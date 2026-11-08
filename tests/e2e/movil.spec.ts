import { test, expect, type Page } from '@playwright/test'
import { LibraryPage } from '../fixtures/LibraryPage'
import { ViewerPage } from '../fixtures/ViewerPage'

// T8 — Revisión a 360×800: sin scroll horizontal y con los controles del visor a la vista.
test.use({ viewport: { width: 360, height: 800 } })

async function sinDesbordeHorizontal(page: Page): Promise<boolean> {
  return page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)
}

test.describe('Móvil 360×800 (T8)', () => {
  test('la biblioteca no tiene scroll horizontal', async ({ page }) => {
    const library = new LibraryPage(page)
    await library.goto()
    await expect(library.cards.first()).toBeVisible({ timeout: 15_000 })
    expect(await sinDesbordeHorizontal(page)).toBe(true)
  })

  test('el visor no tiene scroll horizontal y muestra comentarios y compartir', async ({ page }) => {
    const library = new LibraryPage(page)
    await library.goto()
    await expect(library.cards.first()).toBeVisible({ timeout: 15_000 })
    await library.openFirstManual()

    const viewer = new ViewerPage(page)
    await expect(viewer.book).toBeVisible({ timeout: 15_000 })
    expect(await sinDesbordeHorizontal(page)).toBe(true)
    await expect(page.getByTestId('comment-toggle-button')).toBeVisible()
    await expect(viewer.shareButton).toBeVisible()
  })
})
