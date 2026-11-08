import { type Page, type Locator } from '@playwright/test'

/** Page Object del modal de confirmación de borrado/ocultado (ConfirmDeleteModal.tsx). */
export class DeleteConfirmModalPage {
  readonly modal: Locator
  readonly cancel: Locator
  readonly confirm: Locator

  constructor(page: Page) {
    this.modal = page.getByTestId('delete-confirm-modal')
    this.cancel = page.getByTestId('delete-confirm-cancel')
    this.confirm = page.getByTestId('delete-confirm-ok')
  }
}
