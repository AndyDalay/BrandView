import { type Page, type Locator } from '@playwright/test'

/** Page Object del modal de compartir. No publica nada: solo comprueba la interfaz. */
export class ShareModalPage {
  readonly modal: Locator
  readonly close: Locator
  readonly link: Locator
  readonly whatsapp: Locator

  constructor(page: Page) {
    this.modal = page.getByTestId('share-modal')
    this.close = page.getByTestId('share-close')
    this.link = page.getByTestId('share-link')
    this.whatsapp = page.getByTestId('share-whatsapp')
  }
}
