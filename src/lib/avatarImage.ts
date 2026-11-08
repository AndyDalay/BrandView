// Procesado de la foto de perfil (P4). Todo ocurre en el navegador antes de subir.

export const AVATAR_SIZE = 256; // perfil
export const AVATAR_MINI = 96; // header y comentarios
export const MAX_AVATAR_BYTES = 80 * 1024; // peso máximo por imagen subida
const MAX_INPUT_BYTES = 10 * 1024 * 1024; // límite de la foto original
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

/** Devuelve un mensaje de error en español, o null si el archivo sirve. */
export function validateImageFile(file: File): string | null {
  if (/image\/hei[cf]/.test(file.type) || /\.(heic|heif)$/i.test(file.name)) {
    return 'Las fotos HEIC no son compatibles. Exporta la foto como JPG o PNG.';
  }
  if (!ACCEPTED_TYPES.includes(file.type)) {
    return 'Formato no válido. Usa JPG, PNG, WebP o GIF.';
  }
  if (file.size > MAX_INPUT_BYTES) {
    return 'La foto pesa más de 10 MB. Elige una más pequeña.';
  }
  return null;
}

/** Encuadre del usuario: zoom relativo (1–3) y desplazamiento de la imagen en px respecto al centro del cuadro. */
export interface Encuadre {
  zoom: number;
  ox: number;
  oy: number;
}

/**
 * Escala y desplazamiento máximo para que la foto siempre cubra el círculo.
 * `diametro` es el diámetro del círculo en píxeles de pantalla.
 */
export function limitesEncuadre(natW: number, natH: number, diametro: number, zoom: number) {
  const cubre = Math.max(diametro / natW, diametro / natH); // escala mínima para cubrir el círculo
  const scale = cubre * zoom;
  const maxX = Math.max(0, (natW * scale - diametro) / 2);
  const maxY = Math.max(0, (natH * scale - diametro) / 2);
  return { scale, maxX, maxY };
}

/** Limita el encuadre para que el círculo siempre quede cubierto por la foto. */
export function clampEncuadre(enc: Encuadre, natW: number, natH: number, diametro: number): Encuadre {
  const zoom = Math.min(3, Math.max(1, enc.zoom));
  const { maxX, maxY } = limitesEncuadre(natW, natH, diametro, zoom);
  return {
    zoom,
    ox: Math.min(maxX, Math.max(-maxX, enc.ox)),
    oy: Math.min(maxY, Math.max(-maxY, enc.oy)),
  };
}

/** Rectángulo de origen (en píxeles de la foto original) que corresponde al círculo. Función pura. */
export function computeCropRect(natW: number, natH: number, diametro: number, enc: Encuadre) {
  const { scale } = limitesEncuadre(natW, natH, diametro, enc.zoom);
  const side = diametro / scale;
  return {
    sx: natW / 2 + (-diametro / 2 - enc.ox) / scale,
    sy: natH / 2 + (-diametro / 2 - enc.oy) / scale,
    side,
  };
}

function toBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob((b) => resolve(b), type, quality));
}

function drawSquare(img: HTMLImageElement, rect: { sx: number; sy: number; side: number }, size: number) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('El navegador no permite procesar la imagen.');
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, rect.sx, rect.sy, rect.side, rect.side, 0, 0, size, size);
  return canvas;
}

/**
 * Codifica el canvas en WebP (con respaldo JPEG si el navegador no lo soporta),
 * bajando la calidad hasta que pese menos de MAX_AVATAR_BYTES.
 */
async function encode(canvas: HTMLCanvasElement): Promise<Blob> {
  for (const type of ['image/webp', 'image/jpeg']) {
    for (let q = 0.9; q >= 0.6; q -= 0.1) {
      const blob = await toBlob(canvas, type, q);
      if (blob && blob.type === type && blob.size <= MAX_AVATAR_BYTES) return blob;
    }
  }
  throw new Error('La foto no se puede reducir por debajo de 80 KB. Prueba con otra imagen.');
}

/** Genera las dos versiones del avatar (256 px para el perfil y 96 px para header y comentarios). */
export async function procesarAvatar(img: HTMLImageElement, rect: { sx: number; sy: number; side: number }) {
  const grande = await encode(drawSquare(img, rect, AVATAR_SIZE));
  const mini = await encode(drawSquare(img, rect, AVATAR_MINI));
  return { grande, mini };
}

/** Carga un File como imagen. Libera la URL temporal al terminar. */
export function cargarImagen(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('No se pudo leer la foto. Prueba con otra imagen.'));
    };
    img.src = url;
  });
}
