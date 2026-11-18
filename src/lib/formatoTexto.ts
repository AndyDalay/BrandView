// C3 — Formato del texto de los comentarios. Solo se permiten negrita, cursiva, subrayado, salto de línea y enlaces http(s).
// Todo lo demás se desenvuelve (se conserva su texto) y los atributos se eliminan.
const PERMITIDAS = new Set(['B', 'STRONG', 'I', 'EM', 'U', 'BR', 'A']);

function limpiar(nodo: Node) {
  for (const hijo of Array.from(nodo.childNodes)) {
    if (hijo.nodeType === Node.TEXT_NODE) continue;
    if (hijo.nodeType !== Node.ELEMENT_NODE) {
      nodo.removeChild(hijo);
      continue;
    }
    const el = hijo as Element;
    limpiar(el);
    const tag = el.tagName;
    const href = el.getAttribute('href') ?? '';
    if (tag === 'A' && /^https?:\/\//i.test(href)) {
      for (const attr of Array.from(el.attributes)) el.removeAttribute(attr.name);
      el.setAttribute('href', href);
      el.setAttribute('target', '_blank');
      el.setAttribute('rel', 'noopener noreferrer');
    } else if (PERMITIDAS.has(tag) && tag !== 'A') {
      for (const attr of Array.from(el.attributes)) el.removeAttribute(attr.name);
    } else {
      while (el.firstChild) nodo.insertBefore(el.firstChild, el);
      nodo.removeChild(el);
    }
  }
}

/** HTML seguro con el formato permitido. Se usa tanto al guardar como al mostrar. */
export function sanitizarHtml(html: string): string {
  const doc = new DOMParser().parseFromString(`<body>${html}</body>`, 'text/html');
  limpiar(doc.body);
  return doc.body.innerHTML;
}

/** Texto plano de un HTML (para el campo `texto`, la lectura en voz alta y el contador). */
export function htmlATexto(html: string): string {
  const doc = new DOMParser().parseFromString(`<body>${html}</body>`, 'text/html');
  return doc.body.textContent ?? '';
}
