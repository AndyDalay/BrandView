import { test, expect } from '@playwright/test'
import { LibraryPage } from '../fixtures/LibraryPage'
import { ViewerPage } from '../fixtures/ViewerPage'
import { ShareModalPage } from '../fixtures/ShareModalPage'

test.describe('Compartir', () => {
  test.beforeEach(async ({ page }) => {
    const library = new LibraryPage(page)
    await library.goto()
    await expect(library.cards.first()).toBeVisible({ timeout: 15_000 })
    await library.openFirstManual()
    await expect(new ViewerPage(page).book).toBeVisible({ timeout: 15_000 })
  })

  test('abre el modal de compartir y lo cierra', async ({ page }) => {
    const viewer = new ViewerPage(page)
    const modal = new ShareModalPage(page)
    await viewer.shareButton.click()
    await expect(modal.modal).toBeVisible()
    await modal.close.click()
    await expect(modal.modal).toBeHidden()
  })
})
