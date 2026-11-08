import { test, expect } from '@playwright/test'
import { mockAuthEndpoints, seedSession } from '../fixtures/authMock'

// P2 (con mocks). No se hace login real de Google.

test.describe('Login con Google (P2, mock)', () => {
  test('sin sesión: muestra el botón y pide OAuth con redirect a /cuenta', async ({ page }) => {
    const calls = await mockAuthEndpoints(page)
    await page.goto('/')

    const login = page.getByTestId('login-google-button')
    await expect(login).toBeVisible({ timeout: 15_000 })
    await login.click()

    await expect.poll(() => calls.oauth.length).toBeGreaterThan(0)
    expect(calls.link).toHaveLength(0)
    expect(calls.oauth[0]).toContain('provider=google')
    expect(decodeURIComponent(calls.oauth[0])).toContain('/cuenta')
  })

  test('sesión anónima: usa linkIdentity (mismo user.id), no signInWithOAuth', async ({ page }) => {
    await seedSession(page, { id: 'anon-user-1', is_anonymous: true })
    const calls = await mockAuthEndpoints(page)
    await page.goto('/')

    const login = page.getByTestId('login-google-button')
    await expect(login).toBeVisible({ timeout: 15_000 })
    await login.click()

    await expect.poll(() => calls.link.length).toBeGreaterThan(0)
    expect(calls.oauth).toHaveLength(0)
    expect(calls.link[0]).toContain('provider=google')
  })

  test('con cuenta de Google: muestra session-state y oculta el botón', async ({ page }) => {
    await seedSession(page, { id: 'google-user-1', is_anonymous: false })
    await mockAuthEndpoints(page)
    await page.goto('/')

    const state = page.getByTestId('session-state')
    await expect(state).toBeVisible({ timeout: 15_000 })
    await expect(state).toHaveAttribute('data-state', 'google')
    await expect(page.getByTestId('login-google-button')).toHaveCount(0)
  })
})
