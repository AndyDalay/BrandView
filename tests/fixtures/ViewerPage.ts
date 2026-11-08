import { type Page, type Locator } from '@playwright/test'
import { BasePage } from './BasePage'

/** Page Object del visor (/manual/:id). */
export class ViewerPage extends BasePage {
  readonly book: Locator
  readonly indicator: Locator
  readonly pageInput: Locator
  readonly nextPage: Locator
  readonly prevPage: Locator
  readonly shareButton: Locator
  readonly soundToggle: Locator
  readonly fullscreenButton: Locator
  readonly backButton: Locator

  constructor(page: Page) {
    super(page)
    this.book = page.getByTestId('book-viewer')
    this.indicator = page.getByTestId('page-indicator')
    this.pageInput = page.getByTestId('page-input')
    this.nextPage = page.getByTestId('next-page')
    this.prevPage = page.getByTestId('prev-page')
    this.shareButton = page.getByTestId('share-button')
    this.soundToggle = page.getByTestId('sound-toggle')
    this.fullscreenButton = page.getByTestId('fullscreen-button')
    this.backButton = page.getByTestId('back-button')
  }
}
