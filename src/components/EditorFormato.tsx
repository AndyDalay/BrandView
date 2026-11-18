import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { IconButton, Button } from './ui/Button';
import { htmlATexto, sanitizarHtml } from '../lib/formatoTexto';

// C3 — Editor de texto con formato. Al seleccionar texto aparece una barra: negrita, cursiva, subrayado y enlace.
// Un enlace se quita con la primera pulsación de borrar (queda el texto seleccionado); la segunda lo borra.
export function EditorFormato({
  onChange,
  insertar,
}: {
  onChange: (html: string, texto: string) => void;
  insertar?: { valor: string; version: number }; // C2: texto generado por la IA, reemplaza el contenido
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [barra, setBarra] = useState<{ x: number; y: number } | null>(null);
  const [enlace, setEnlace] = useState<{ rango: Range; url: string } | null>(null);

  function emitir() {
    const el = ref.current;
    if (!el) return;
    const html = sanitizarHtml(el.innerHTML);
    onChange(html, htmlATexto(html));
  }

  // Reemplaza el contenido cuando llega un texto nuevo (p. ej. de la IA). Solo si la versión cambia.
  useEffect(() => {
    if (!insertar || !ref.current) return;
    ref.current.textContent = insertar.valor;
    emitir();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [insertar?.version]);

  // Barra flotante sobre la selección dentro del editor
  useEffect(() => {
    const actualizar = () => {
      const sel = window.getSelection();
      const el = ref.current;
      if (!sel || sel.isCollapsed || !el || !sel.anchorNode || !el.contains(sel.anchorNode)) {
        setBarra(null);
        return;
      }
      const r = sel.getRangeAt(0).getBoundingClientRect();
      const p = el.getBoundingClientRect();
      setBarra({ x: r.left - p.left + r.width / 2, y: r.top - p.top - 44 });
    };
    document.addEventListener('selectionchange', actualizar);
    return () => document.removeEventListener('selectionchange', actualizar);
  }, []);

  function comando(nombre: 'bold' | 'italic' | 'underline' | 'unlink') {
    ref.current?.focus();
    document.execCommand(nombre);
    emitir();
  }

  function abrirEnlace() {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;
    setEnlace({ rango: sel.getRangeAt(0).cloneRange(), url: 'https://' });
  }

  function aplicarEnlace() {
    if (!enlace || !ref.current) return;
    let url = enlace.url.trim();
    if (!/^https?:\/\//i.test(url)) url = `https://${url}`;
    try {
      new URL(url);
    } catch {
      return;
    }
    const a = document.createElement('a');
    a.href = url;
    const r = enlace.rango;
    a.appendChild(r.extractContents());
    r.insertNode(a);
    setEnlace(null);
    ref.current.focus();
    emitir();
  }

  // Borrar dentro de un enlace: primero se quita el enlace (queda el texto seleccionado), luego ya se borra
  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key !== 'Backspace' && e.key !== 'Delete') return;
    const sel = window.getSelection();
    const nodo = sel?.anchorNode ?? null;
    const base = nodo instanceof Element ? nodo : nodo?.parentElement;
    const a = base?.closest('a');
    if (!a || !ref.current?.contains(a)) return;
    e.preventDefault();
    const padre = a.parentNode!;
    const primero = a.firstChild;
    const ultimo = a.lastChild;
    while (a.firstChild) padre.insertBefore(a.firstChild, a);
    padre.removeChild(a);
    if (primero && ultimo) {
      const r = document.createRange();
      r.setStartBefore(primero);
      r.setEndAfter(ultimo);
      sel?.removeAllRanges();
      sel?.addRange(r);
    }
    emitir();
  }

  return (
    <div className="relative">
      {barra && !enlace && (
        <div
          role="toolbar"
          aria-label="Formato"
          data-testid="format-toolbar"
          style={{ left: barra.x, top: barra.y }}
          className="absolute z-30 flex -translate-x-1/2 items-center gap-s1 rounded-lg border border-gris-line bg-white p-s1 shadow-lg"
          onMouseDown={(e) => e.preventDefault()}
        >
          <IconButton icono="solar:text-bold-linear" label="Negrita" tamano="sm" data-testid="format-bold" onClick={() => comando('bold')} />
          <IconButton icono="solar:text-italic-linear" label="Cursiva" tamano="sm" data-testid="format-italic" onClick={() => comando('italic')} />
          <IconButton icono="solar:text-underline-linear" label="Subrayado" tamano="sm" data-testid="format-underline" onClick={() => comando('underline')} />
          <IconButton icono="solar:link-linear" label="Enlace" tamano="sm" data-testid="format-link" onClick={abrirEnlace} />
          <IconButton icono="solar:link-broken-linear" label="Quitar enlace" tamano="sm" data-testid="format-unlink" onClick={() => comando('unlink')} />
        </div>
      )}

      {enlace && (
        <div className="mb-s2 flex items-center gap-s2" data-testid="link-form">
          <input
            autoFocus
            aria-label="Dirección del enlace"
            data-testid="link-input"
            value={enlace.url}
            onChange={(e) => setEnlace({ ...enlace, url: e.target.value })}
            onKeyDown={(e) => e.key === 'Enter' && aplicarEnlace()}
            className="min-w-0 flex-1 rounded-lg border border-gris-line bg-white px-s2 py-s1 text-sm text-azul-dark focus:border-azul focus:outline-none"
          />
          <Button variante="primaria" tamano="sm" data-testid="link-apply" onClick={aplicarEnlace}>Aplicar</Button>
          <Button variante="secundaria" tamano="sm" onClick={() => setEnlace(null)}>Cancelar</Button>
        </div>
      )}

      <div
        ref={ref}
        role="textbox"
        aria-multiline="true"
        aria-label="Comentario"
        data-testid="comment-text-input"
        contentEditable
        suppressContentEditableWarning
        onInput={emitir}
        onKeyDown={onKeyDown}
        className="min-h-[72px] w-full rounded-lg border border-gris-line bg-white p-s2 text-sm text-azul-dark focus:border-azul focus:outline-none [&_a]:text-azul [&_a]:underline"
      />
    </div>
  );
}
