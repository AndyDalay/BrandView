import { type Page, type Locator } from '@playwright/test'
import { BasePage } from './BasePage'

/** Page Object de la galería (/). Cada elemento importante tiene data-testid en Library.tsx. */
export class LibraryPage extends BasePage {
  readonly root: Locator
  readonly gallery: Locator
  readonly cards: Locator
  readonly addButton: Locator
  readonly deleteButtons: Locator

  constructor(page: Page) {
    super(page)
    this.root = page.getByTestId('library-page')
    this.gallery = page.getByTestId('gallery')
    this.cards = page.getByTestId('manual-card')
    this.addButton = page.getByTestId('add-manual-button')
    this.deleteButtons = page.getByTestId('manual-delete')
  }

  async goto() {
    await super.goto('/')
    await this.waitForPageLoad()
  }

  async openFirstManual() {
    await this.cards.first().click()
  }
}
