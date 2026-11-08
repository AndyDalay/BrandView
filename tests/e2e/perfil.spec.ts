import { test, expect } from '@playwright/test'
import { mockAuthEndpoints, seedSession } from '../fixtures/authMock'
import { mockPerfilesApi, TEST_IMAGE_PATH } from '../fixtures/avatarMock'

// P9 — perfil y avatar. Login mockeado (sin Google real) y API de perfiles/Storage mockeada.
const USER = 'google-user-1'

async function abrirEditarPerfil(page: import('@playwright/test').Page) {
  await page.getByTestId('user-menu-button').click()
  await page.getByTestId('edit-profile-button').click()
  await expect(page.getByTestId('edit-profile-modal')).toBeVisible()
}

test.describe('Perfil y avatar (P9, mock)', () => {
  test.beforeEach(async ({ page }) => {
    await seedSession(page, { id: USER, is_anonymous: false })
    await mockAuthEndpoints(page)
  })

  test('sube una foto con el recortador y la ve tras recargar', async ({ page }) => {
    const api = await mockPerfilesApi(page, { id: USER, nombre: 'Andy', avatar_path: null, avatar_version: 0 })
    await page.goto('/')
    await abrirEditarPerfil(page)

    await page.getByTestId('profile-photo-input').setInputFiles(TEST_IMAGE_PATH)

    const cropper = page.getByTestId('avatar-cropper')
    const img = page.getByTestId('avatar-cropper-image')
    await expect(cropper).toBeVisible()
    await expect(img).toBeVisible()

    // Arrastrar la foto (el cuadro no se mueve)
    const antes = await img.boundingBox()
    const frame = await page.getByTestId('avatar-cropper-frame').boundingBox()
    if (!antes || !frame) throw new Error('No se pudo medir el recortador')
    const cx = frame.x + frame.width / 2
    const cy = frame.y + frame.height / 2
    await page.mouse.move(cx, cy)
    await page.mouse.down()
    await page.mouse.move(cx + 25, cy + 10, { steps: 5 })
    await page.mouse.up()
    const despues = await img.boundingBox()
    expect(Math.abs((despues?.x ?? 0) - antes.x)).toBeGreaterThan(10)

    await page.getByTestId('avatar-cropper-save').click()
    await expect(cropper).toBeHidden({ timeout: 15_000 })
    await expect(page.getByTestId('profile-message')).toHaveText('Foto actualizada.')

    // Dos archivos (256 y 96 px) en la carpeta del usuario, y la versión sube a 1
    expect(api.uploads).toHaveLength(2)
    expect(api.uploads.every((p) => p.includes(`avatares/${USER}/`))).toBe(true)
    expect(api.patches.at(-1)).toMatchObject({ avatar_version: 1 })

    // Tras recargar, el header muestra la foto de 96 px
    await page.reload()
    const avatar = page.getByTestId('user-menu-button').locator('img')
    await expect(avatar).toHaveAttribute('src', new RegExp(`avatares/${USER}/.*-96\\.(webp|jpg)`))
  })

  test('nombre: el botón de guardar aparece al cambiarlo y valida el rango', async ({ page }) => {
    const api = await mockPerfilesApi(page, { id: USER, nombre: 'Andy', avatar_path: null, avatar_version: 0 })
    await page.goto('/')
    await abrirEditarPerfil(page)

    const input = page.getByTestId('profile-name-input')
    const guardar = page.getByTestId('profile-save-name')
    await expect(guardar).toBeHidden()

    // Un solo carácter: el botón aparece, pero el guardado rechaza el nombre
    await input.fill('A')
    await expect(guardar).toBeVisible()
    await guardar.click()
    await expect(page.getByTestId('profile-message')).toContainText('entre 2 y 40 caracteres')
    expect(api.patches).toHaveLength(0)

    // Nombre válido: se guarda y el botón desaparece
    await input.fill('Lucía')
    await guardar.click()
    await expect(page.getByTestId('profile-message')).toHaveText('Nombre guardado.')
    expect(api.patches.at(-1)).toMatchObject({ nombre: 'Lucía' })
    await expect(guardar).toBeHidden()
  })
})
