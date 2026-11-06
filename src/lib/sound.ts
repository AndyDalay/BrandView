const SRC = '/sounds/page-flip.wav';

// Cada reproducción crea un Audio nuevo para que sonidos seguidos no se corten
export function playFlipSound() {
  try {
    const a = new Audio(SRC);
    a.volume = 0.7;
    void a.play().catch(() => {});
  } catch {
    /* sin audio disponible */
  }
}
