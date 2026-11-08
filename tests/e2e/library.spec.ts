import { test, expect } from '@playwright/test'
import { LibraryPage } from '../fixtures/LibraryPage'

test.describe('Galería', () => {
  let library: LibraryPage

  test.beforeEach(async ({ page }) => {
    library = new LibraryPage(page)
    await library.goto()
  })

  test('muestra la galería y el botón de añadir', async () => {
    await expect(library.root).toBeVisible()
    await expect(library.gallery).toBeVisible()
    await expect(library.addButton).toBeVisible()
  })

  test('muestra al menos un manual', async () => {
    await expect(library.cards.first()).toBeVisible({ timeout: 15_000 })
  })
})
