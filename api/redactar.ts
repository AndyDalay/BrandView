import { createClient } from '@supabase/supabase-js';

// C2 — Redacción de comentarios con IA (Groq, gratis). POST /api/redactar { prompt, adjunto? }.
// Requiere sesión (token del usuario). El adjunto va como data URL (máx. 3 MB):
// - imagen: se envía al modelo de visión.
// - PDF: se extrae el texto en el servidor (pdfjs-dist, hasta 15 páginas / 6000 caracteres)
//   y se pasa al modelo de texto como material. Un PDF escaneado sin texto se rechaza.
// Variables: VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY, GROQ_API_KEY.

interface Req {
  method?: string;
  headers: Record<string, string | string[] | undefined>;
  body?: unknown;
}
interface Res {
  status(code: number): Res;
  json(body: unknown): void;
}

export const config = { maxDuration: 30 };

const PROMPT_MAX = 600;
const ADJUNTO_MAX_BYTES = 3 * 1024 * 1024;
const TIPOS_IMAGEN = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const TIPO_PDF = 'application/pdf';
const PDF_MAX_PAGINAS = 15;
const PDF_MAX_CARACTERES = 6000;
const TEXTO_MAX = 500;
const TIMEOUT_MS = 20_000;

interface PdfTextContent {
  items: Array<{ str?: string }>;
}
interface PdfDocumento {
  numPages: number;
  getPage(n: number): Promise<{ getTextContent(): Promise<PdfTextContent> }>;
  destroy(): Promise<void>;
}

/** Extrae el texto de un PDF en base64 (sin cabecera data:). Devuelve '' si no hay texto. */
async function textoDePdf(base64: string): Promise<string> {
  // Carga diferida: pdf.js solo se importa cuando llega un PDF
  const pdfjs = (await import('pdfjs-dist/legacy/build/pdf.mjs')) as unknown as {
    getDocument(p: object): { promise: Promise<PdfDocumento> };
  };
  const data = new Uint8Array(Buffer.from(base64, 'base64'));
  const doc = await pdfjs.getDocument({ data, useSystemFonts: true, disableFontFace: true, isEvalSupported: false, verbosity: 0 }).promise;
  let texto = '';
  try {
    const paginas = Math.min(doc.numPages, PDF_MAX_PAGINAS);
    for (let n = 1; n <= paginas && texto.length < PDF_MAX_CARACTERES; n++) {
      const pagina = await doc.getPage(n);
      const contenido = await pagina.getTextContent();
      texto += contenido.items.map((i) => i.str ?? '').join(' ') + '\n';
    }
  } finally {
    await doc.destroy();
  }
  return texto
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
    .slice(0, PDF_MAX_CARACTERES);
}

const SISTEMA =
  'Eres un asistente que redacta comentarios breves en español sobre un trabajo documentado de una marca. ' +
  'Escribe de 2 a 4 frases, claras y profesionales. Puedes resaltar de 1 a 3 palabras clave con **asteriscos**. ' +
  'No inventes datos que no aparezcan en el material o en la petición.';

export default async function handler(req: Req, res: Res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido.', codigo: 'metodo' });

  try {
    const url = process.env.VITE_SUPABASE_URL;
    const publicKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
    const groqKey = process.env.GROQ_API_KEY;
    if (!url || !publicKey) return res.status(500).json({ error: 'El servidor no está configurado.', codigo: 'config' });
    if (!groqKey) return res.status(500).json({ error: 'Falta la clave de la IA en el servidor.', codigo: 'config' });

    const auth = req.headers.authorization;
    const token = typeof auth === 'string' && auth.startsWith('Bearer ') ? auth.slice(7) : null;
    if (!token) return res.status(401).json({ error: 'Inicia sesión para usar la IA.', codigo: 'sesion' });
    const { data: u } = await createClient(url, publicKey, { auth: { persistSession: false } }).auth.getUser(token);
    if (!u.user) return res.status(401).json({ error: 'Tu sesión no es válida. Recarga la página.', codigo: 'sesion' });

    const body = (typeof req.body === 'string' ? JSON.parse(req.body) : req.body) as {
      prompt?: unknown;
      adjunto?: { tipo?: unknown; datos?: unknown };
    };
    const prompt = typeof body?.prompt === 'string' ? body.prompt.trim() : '';
    if (!prompt || prompt.length > PROMPT_MAX) {
      return res.status(400).json({ error: `Escribe qué quieres (máximo ${PROMPT_MAX} caracteres).`, codigo: 'peticion' });
    }

    let contenido: unknown = prompt;
    let modelo = 'llama-3.1-8b-instant';
    if (body.adjunto) {
      const tipo = String(body.adjunto.tipo ?? '');
      const datos = String(body.adjunto.datos ?? '');
      const esPdf = tipo === TIPO_PDF;
      if ((!esPdf && !TIPOS_IMAGEN.includes(tipo)) || !datos.startsWith(`data:${tipo};base64,`)) {
        return res.status(400).json({ error: 'Adjunta una imagen o un PDF.', codigo: 'adjunto' });
      }
      if (datos.length * 0.75 > ADJUNTO_MAX_BYTES) {
        return res.status(400).json({ error: 'El archivo supera los 3 MB.', codigo: 'adjunto' });
      }
      if (esPdf) {
        let extracto = '';
        try {
          extracto = await textoDePdf(datos.slice(datos.indexOf(',') + 1));
        } catch (e) {
          console.error('[redactar] pdf', e);
          return res.status(400).json({ error: 'No se pudo leer el PDF.', codigo: 'adjunto' });
        }
        if (!extracto) {
          return res.status(400).json({ error: 'No se encontró texto en el PDF (¿es un escaneo?).', codigo: 'adjunto' });
        }
        // El PDF es material de texto: se usa el modelo de texto, más barato y rápido
        contenido = `${prompt}\n\nMaterial del documento (extracto):\n${extracto}`;
      } else {
        modelo = 'meta-llama/llama-4-scout-17b-16e-instruct';
        contenido = [
          { type: 'text', text: prompt },
          { type: 'image_url', image_url: { url: datos } },
        ];
      }
    }

    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
    let r: Response;
    try {
      r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${groqKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: modelo,
          temperature: 0.6,
          max_tokens: 220,
          messages: [
            { role: 'system', content: SISTEMA },
            { role: 'user', content: contenido },
          ],
        }),
        signal: ctrl.signal,
      });
    } finally {
      clearTimeout(timer);
    }
    if (!r.ok) {
      console.error('[redactar] Groq', r.status);
      return res.status(502).json({ error: 'La IA no respondió. Inténtalo de nuevo.', codigo: 'proveedor', detalle: `Groq ${r.status}` });
    }
    const j = (await r.json()) as { choices?: { message?: { content?: string } }[] };
    const texto = (j.choices?.[0]?.message?.content ?? '').trim().slice(0, TEXTO_MAX);
    if (!texto) return res.status(502).json({ error: 'La IA devolvió un texto vacío.', codigo: 'proveedor' });
    return res.status(200).json({ texto });
  } catch (e) {
    const abortado = e instanceof Error && e.name === 'AbortError';
    console.error('[redactar]', e);
    return res.status(500).json({
      error: abortado ? 'La IA tardó demasiado. Inténtalo de nuevo.' : 'Error inesperado en el servidor.',
      codigo: abortado ? 'timeout' : 'interno',
    });
  }
}
