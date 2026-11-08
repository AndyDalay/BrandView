import { type Page } from '@playwright/test'

/** Base común para los Page Objects. Playwright busca elementos por data-testid, no por clases. */
export class BasePage {
  constructor(protected readonly page: Page) {}

  async goto(path = '/') {
    await this.page.goto(path)
  }

  async waitForPageLoad() {
    await this.page.waitForLoadState('domcontentloaded')
  }
}
