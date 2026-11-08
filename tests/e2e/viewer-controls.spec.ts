import { test, expect, type Page } from '@playwright/test'
import { LibraryPage } from '../fixtures/LibraryPage'
import { ViewerPage } from '../fixtures/ViewerPage'

/** Número de página actual leído del indicador "N / TOTAL". */
async function currentPage(viewer: ViewerPage): Promise<number> {
  const text = (await viewer.indicator.innerText()).trim()
  return Number(text.split('/')[0].trim())
}

async function totalPages(viewer: ViewerPage): Promise<number> {
  const text = (await viewer.indicator.innerText()).trim()
  return Number(text.split('/')[1].trim())
}

async function openFirstManual(page: Page) {
  const library = new LibraryPage(page)
  await library.goto()
  await expect(library.cards.first()).toBeVisible({ timeout: 15_000 })
  await library.openFirstManual()
  const viewer = new ViewerPage(page)
  await expect(viewer.indicator).toHaveText(/^1 \/ \d+/, { timeout: 15_000 })
  return viewer
}

test.describe('Controles del visor', () => {
  test('tocar el indicador muestra el campo de página con la actual', async ({ page }) => {
    const viewer = await openFirstManual(page)

    await viewer.indicator.click()

    await expect(viewer.pageInput).toBeVisible()
    await expect(viewer.pageInput).toHaveValue('1')
  })

  test('un número válido + Enter lleva a esa página', async ({ page }) => {
    const viewer = await openFirstManual(page)
    const total = await totalPages(viewer)
    expect(total).toBeGreaterThanOrEqual(3)

    await viewer.indicator.click()
    await viewer.pageInput.fill('3')
    await viewer.pageInput.press('Enter')

    await expect(viewer.indicator).toHaveText(`3 / ${total}`, { timeout: 5_000 })
  })

  test('un número mayor que el total se limita a la última página', async ({ page }) => {
    const viewer = await openFirstManual(page)
    const total = await totalPages(viewer)

    await viewer.indicator.click()
    await viewer.pageInput.fill('99999')
    await viewer.pageInput.press('Enter')

    await expect(viewer.indicator).toHaveText(`${total} / ${total}`, { timeout: 5_000 })
  })

  test('mantener pulsado next-page avanza más de una página', async ({ page }) => {
    const viewer = await openFirstManual(page)
    await expect(viewer.nextPage).toBeEnabled()

    const box = await viewer.nextPage.boundingBox()
    if (!box) throw new Error('next-page sin posición visible')
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
    await page.mouse.down()
    // Con el retardo de 350 ms y el ritmo del giro, unos 2,5 s bastan para pasar varias páginas.
    // No se comprueba el ritmo exacto, solo que avanza más de una página.
    await page.waitForTimeout(2_500)
    await page.mouse.up()

    await expect
      .poll(() => currentPage(viewer), { timeout: 10_000 })
      .toBeGreaterThan(2)
  })
})
