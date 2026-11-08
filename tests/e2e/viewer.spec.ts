import { test, expect } from '@playwright/test'
import { LibraryPage } from '../fixtures/LibraryPage'
import { ViewerPage } from '../fixtures/ViewerPage'

test.describe('Visor', () => {
  test.beforeEach(async ({ page }) => {
    const library = new LibraryPage(page)
    await library.goto()
    await expect(library.cards.first()).toBeVisible({ timeout: 15_000 })
    await library.openFirstManual()
  })

  test('abre el manual y muestra el libro', async ({ page }) => {
    await expect(page).toHaveURL(/\/manual\//)
    const viewer = new ViewerPage(page)
    await expect(viewer.book).toBeVisible({ timeout: 15_000 })
    await expect(viewer.indicator).toHaveText(/\d+ \/ \d+/)
  })

  test('pasa a la página siguiente con la flecha', async ({ page }) => {
    const viewer = new ViewerPage(page)
    await expect(viewer.indicator).toHaveText(/1 \/ \d+/, { timeout: 15_000 })
    await viewer.nextPage.click()
    await expect(viewer.indicator).toHaveText(/^(2|3) \/ \d+/, { timeout: 5_000 })
  })

  test('los controles de la barra superior existen', async ({ page }) => {
    const viewer = new ViewerPage(page)
    await expect(viewer.shareButton).toBeVisible({ timeout: 15_000 })
    await expect(viewer.soundToggle).toBeVisible()
    await expect(viewer.fullscreenButton).toBeVisible()
    await expect(viewer.backButton).toBeVisible()
  })
})
