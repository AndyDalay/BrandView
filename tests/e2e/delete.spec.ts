import { test, expect } from '@playwright/test'
import { LibraryPage } from '../fixtures/LibraryPage'
import { DeleteConfirmModalPage } from '../fixtures/DeleteConfirmModalPage'
import { seedLocalManual, removeLocalManual } from '../fixtures/localManuals'

const LOCAL_ID = 'e2e-local-borrar'
const LOCAL_NAME = 'E2E Manual local'

test.describe('Borrado en la galería', () => {
  test('cancelar cierra el modal sin borrar nada', async ({ page }) => {
    const library = new LibraryPage(page)
    await library.goto()
    await expect(library.cards.first()).toBeVisible({ timeout: 15_000 })
    const before = await library.cards.count()

    const modal = new DeleteConfirmModalPage(page)
    await library.deleteButtons.first().click()
    await expect(modal.modal).toBeVisible()
    await modal.cancel.click()

    await expect(modal.modal).toBeHidden()
    await expect(library.cards).toHaveCount(before)
  })

  test('Escape cierra el modal si no está ocupado', async ({ page }) => {
    const library = new LibraryPage(page)
    await library.goto()
    await expect(library.cards.first()).toBeVisible({ timeout: 15_000 })

    const modal = new DeleteConfirmModalPage(page)
    await library.deleteButtons.first().click()
    await expect(modal.modal).toBeVisible()
    await page.keyboard.press('Escape')

    await expect(modal.modal).toBeHidden()
  })

  test('confirmar borra un manual local', async ({ page }) => {
    // Sembrar en el origen de la app y después recargar la galería
    await page.goto('/')
    await seedLocalManual(page, LOCAL_ID, LOCAL_NAME)
    const library = new LibraryPage(page)
    await library.goto()

    const localCard = page.getByAltText(`Portada ${LOCAL_NAME}`)
    await expect(localCard).toBeVisible({ timeout: 15_000 })

    const modal = new DeleteConfirmModalPage(page)
    await page
      .getByTestId('manual-delete')
      .and(page.getByRole('button', { name: `Borrar ${LOCAL_NAME}` }))
      .click()
    await expect(modal.modal).toBeVisible()
    await modal.confirm.click()

    await expect(modal.modal).toBeHidden()
    await expect(localCard).toHaveCount(0)
  })

  test.afterEach(async ({ page }) => {
    // Si el test falla a mitad, no dejar el manual local sembrado
    if (page.url()) await removeLocalManual(page, LOCAL_ID).catch(() => undefined)
  })
})
