import { test, expect, type Page, type Route } from '@playwright/test'
import { seedSession } from '../fixtures/authMock'
import { ViewerPage } from '../fixtures/ViewerPage'

// T9 — Comentarios de texto. Supabase se mockea en memoria: la tabla `comentarios` sobrevive a `page.reload()`.
// Manual de prueba: `ejemplo-marca` (galería local, public/galeria/manifest.json).

const MANUAL = 'ejemplo-marca'
const UID = 'user-comentarios-1'

type Fila = {
  id: string
  manual_id: string
  pagina: number
  x: number
  y: number
  texto: string
  autor_id: string
  audio_path: string | null
  estado: string
  error_msg: string | null
  created_at: string
}

function json(route: Route, body: unknown, status = 200) {
  return route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) })
}

async function mockSupabase(page: Page, opciones: { fallarInsert?: boolean } = {}) {
  const filas: Fila[] = []
  let n = 0

  // Manuales compartidos: ninguno (solo se prueban manuales locales)
  await page.route('**/rest/v1/manuales**', (route) => json(route, []))

  // Perfiles del autor: sin foto, así se ve la inicial
  await page.route('**/rest/v1/perfiles**', (route) =>
    json(route, [{ id: UID, nombre: 'Andy', avatar_path: null, avatar_version: 0 }]),
  )

  await page.route('**/rest/v1/comentarios**', async (route) => {
    const req = route.request()
    const url = new URL(req.url())

    if (req.method() === 'GET') {
      const manual = (url.searchParams.get('manual_id') ?? '').replace(/^eq\./, '')
      return json(route, filas.filter((f) => f.manual_id === manual))
    }

    if (req.method() === 'POST') {
      if (opciones.fallarInsert) return json(route, { message: 'fallo simulado' }, 500)
      const cuerpo = req.postDataJSON() as Partial<Fila>
      n += 1
      const fila: Fila = {
        id: `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`,
        manual_id: String(cuerpo.manual_id),
        pagina: Number(cuerpo.pagina),
        x: Number(cuerpo.x),
        y: Number(cuerpo.y),
        texto: String(cuerpo.texto ?? ''),
        autor_id: UID,
        audio_path: null,
        estado: String(cuerpo.estado ?? 'listo'),
        error_msg: null,
        created_at: new Date(Date.now() + n).toISOString(),
      }
      filas.push(fila)
      return json(route, [{ id: fila.id }], 201)
    }

    if (req.method() === 'DELETE') {
      const id = (url.searchParams.get('id') ?? '').replace(/^eq\./, '')
      const idx = filas.findIndex((f) => f.id === id)
      const borradas = idx >= 0 ? filas.splice(idx, 1) : []
      return json(route, borradas.map((f) => ({ id: f.id })))
    }

    return route.fallback()
  })
}

async function abrirComentarios(page: Page) {
  const viewer = new ViewerPage(page)
  await page.goto(`/manual/${MANUAL}`)
  await expect(viewer.book).toBeVisible({ timeout: 15_000 })
  await expect(viewer.indicator).toHaveText(/1 \/ \d+/, { timeout: 15_000 })
  const toggle = page.getByTestId('comment-toggle-button')
  await expect(toggle).toBeVisible()
  await toggle.click()
  await expect(toggle).toHaveAttribute('aria-pressed', 'true')
  return viewer
}

test.describe('Comentarios de texto (T9)', () => {
  test.beforeEach(async ({ page }) => {
    await seedSession(page, { id: UID, is_anonymous: true })
  })

  test('crea un comentario y la lágrima sigue visible tras recargar', async ({ page }) => {
    await mockSupabase(page)
    const viewer = await abrirComentarios(page)

    await page.getByTestId('comment-layer').click({ position: { x: 200, y: 150 } })
    await expect(page.getByTestId('comment-composer')).toBeVisible()
    await page.getByTestId('comment-text-input').fill('Hola, esto es una prueba')
    await page.getByTestId('comment-save').click()

    await expect(page.getByTestId('comment-pin')).toHaveCount(1, { timeout: 10_000 })

    await page.reload()
    await expect(viewer.indicator).toHaveText(/1 \/ \d+/, { timeout: 15_000 })
    await page.getByTestId('comment-toggle-button').click()
    await expect(page.getByTestId('comment-pin')).toHaveCount(1, { timeout: 10_000 })
  })

  test('el panel muestra el autor y el texto al pulsar la lágrima', async ({ page }) => {
    await mockSupabase(page)
    await abrirComentarios(page)

    await page.getByTestId('comment-layer').click({ position: { x: 200, y: 150 } })
    await page.getByTestId('comment-text-input').fill('Texto del panel')
    await page.getByTestId('comment-save').click()
    await expect(page.getByTestId('comment-pin')).toHaveCount(1, { timeout: 10_000 })

    await page.getByTestId('comment-pin').click()
    const panel = page.getByTestId('comment-panel')
    await expect(panel).toBeVisible()
    await expect(panel).toContainText('Andy')
    await expect(page.getByTestId('comment-text')).toHaveText('Texto del panel')
  })

  test('muestra el error si el servidor rechaza el comentario', async ({ page }) => {
    await mockSupabase(page, { fallarInsert: true })
    await abrirComentarios(page)

    await page.getByTestId('comment-layer').click({ position: { x: 200, y: 150 } })
    await page.getByTestId('comment-text-input').fill('No debería guardarse')
    await page.getByTestId('comment-save').click()

    await expect(page.getByTestId('comment-error')).toBeVisible({ timeout: 10_000 })
    await expect(page.getByTestId('comment-pin')).toHaveCount(0)
  })
})
