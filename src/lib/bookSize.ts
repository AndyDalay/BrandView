// Tamaño del libro según la proporción de sus páginas (ancho / alto). Compartido por el visor y la barra de información.

// Tablet (768–1279 px): las flechas de página van a los lados del libro, así que el libro deja sitio para ellas.
export const TABLET_QUERY = '(min-width: 768px) and (max-width: 1279px)';

// Ancho máximo del libro en escritorio. En tablet deja 110 px a cada lado para las flechas (44 px + aire).
export function vwEscritorio(lateral: boolean): string {
  return lateral ? 'calc(100vw - 220px)' : '94vw';
}

/**
 * Calcula el tamaño del libro a partir de la proporción de sus páginas (ancho / alto).
 * El libro ocupa el máximo espacio disponible sin deformarse ni salirse de la pantalla.
 * En escritorio se muestran dos páginas (una doble), en móvil una sola.
 */
export function bookSize(ratio: number, pagesAcross: number, maxVh: string, maxVw: string, maxPx: number) {
  const totalRatio = ratio * pagesAcross;
  const height = `min(${maxVh}, ${maxPx}px, calc(min(${maxVw}, ${maxPx * 1.5}px) / ${totalRatio.toFixed(4)}))`;
  return { height, width: `calc(${totalRatio.toFixed(4)} * ${height})` };
}

/**
 * Ancho de una página del libro con el tamaño actual (V4: la barra de información del manual
 * ocupa exactamente una página, centrada). Usa los mismos cálculos que el libro.
 */
export function anchoPagina(ratio: number, isDesktop: boolean, lateral = false): string {
  const r = ratio > 0 ? ratio : 0.7071;
  const { height } = isDesktop ? bookSize(r, 2, '74vh', vwEscritorio(lateral), 720) : bookSize(r, 1, '72vh', '94vw', 820);
  return `calc(${r.toFixed(4)} * ${height})`;
}
