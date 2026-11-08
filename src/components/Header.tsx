import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { Icon } from '@iconify/react';
import type { User } from '@supabase/supabase-js';
import { supabaseReady } from '@/lib/supabaseClient';
import { diagnosticoRetorno, ErrorAuth, getCurrentUser, isGoogleAccount, onAuthChange, signInWithGoogle, signOut, urlRetorno } from '@/lib/auth';
import { getPerfil, urlAvatar, type Perfil } from '@/lib/perfiles';
import { UserAvatar } from './UserAvatar';
import { EditProfileModal } from './EditProfileModal';
import { ThemeToggle } from './ThemeToggle';

const OCULTAR_NOMBRE_MS = 10_000; // tras 10 s sin tocar el botón de perfil, se oculta el nombre

// Header fijo arriba. z-40 para quedar por encima de <main> (z-10) y de su dropdown.
// Grupo derecho: [children] [campana] [switch de tema] [perfil].
export function Header({ children }: { children?: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Aviso temporal de diagnóstico (login con Google): mensaje + detalle técnico copiable
  const [aviso, setAviso] = useState<{ tipo: 'info' | 'error'; texto: string; detalle?: string } | null>(null);
  const [perfil, setPerfil] = useState<Perfil | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [editando, setEditando] = useState(false);
  const [nombreVisible, setNombreVisible] = useState(true);
  const [sobrePerfil, setSobrePerfil] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const itemsRef = useRef<HTMLButtonElement[]>([]);

  // Diagnóstico al cargar: si Google devolvió un error o tokens en la URL, se muestra en el aviso
  useEffect(() => {
    const r = diagnosticoRetorno();
    if (r.error) setAviso({ tipo: 'error', texto: 'Google devolvió un error al volver a la app.', detalle: r.error });
    else if (r.tokens) setAviso({ tipo: 'info', texto: 'Volviste de Google con datos de sesión. Comprobando…', detalle: 'access_token recibido' });
  }, []);

  useEffect(() => {
    if (!supabaseReady) return;
    let active = true;
    getCurrentUser().then((u) => {
      if (!active) return;
      setUser(u);
      setAuthReady(true);
    });
    const unsubscribe = onAuthChange((u) => {
      if (active) setUser(u);
    });
    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  const conGoogle = isGoogleAccount(user);
  const uid = user?.id ?? null;
  useEffect(() => {
    if (!uid || !conGoogle) {
      setPerfil(null);
      return;
    }
    let active = true;
    getPerfil(uid)
      .then((p) => active && setPerfil(p))
      .catch(() => active && setPerfil(null));
    return () => {
      active = false;
    };
  }, [uid, conGoogle]);

  // Temporizador del nombre: corre solo con el nombre visible, sin hover y con el menú cerrado
  useEffect(() => {
    if (!nombreVisible || sobrePerfil || menuOpen) return;
    const t = window.setTimeout(() => setNombreVisible(false), OCULTAR_NOMBRE_MS);
    return () => window.clearTimeout(t);
  }, [nombreVisible, sobrePerfil, menuOpen]);

  // Cierra el menú con Escape (y devuelve el foco al botón) o al pulsar fuera
  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMenuOpen(false);
        triggerRef.current?.focus();
      }
    };
    const onPointer = (e: PointerEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    window.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onPointer);
    return () => {
      window.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onPointer);
    };
  }, [menuOpen]);

  // Flechas arriba/abajo entre los elementos del menú
  function onMenuKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    const items = itemsRef.current.filter(Boolean);
    const i = items.indexOf(document.activeElement as HTMLButtonElement);
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      items[(i + 1) % items.length]?.focus();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      items[(i - 1 + items.length) % items.length]?.focus();
    }
  }

  async function handleLogin() {
    setBusy(true);
    setError(null);
    setAviso({ tipo: 'info', texto: 'Abriendo Google…', detalle: `redirectTo: ${urlRetorno()}` });
    try {
      await signInWithGoogle();
    } catch (e) {
      const mensaje = e instanceof Error ? e.message : 'No se pudo iniciar sesión con Google.';
      const detalle = e instanceof ErrorAuth ? e.detalle : String(e);
      setError(mensaje);
      setAviso({ tipo: 'error', texto: mensaje, detalle });
      setBusy(false);
    }
  }

  async function handleLogout() {
    setMenuOpen(false);
    setError(null);
    try {
      await signOut();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo cerrar la sesión.');
    }
  }

  const urlMini = perfil ? urlAvatar(perfil, 'mini') : null;
  const mostrarNombre = nombreVisible || sobrePerfil || menuOpen;

  return (
    <>
      <header className="fixed inset-x-0 top-0 z-40 flex h-[72px] items-center justify-between gap-4 border-b border-gris-line bg-white/60 px-5 backdrop-blur md:px-10">
        <Link to="/" aria-label="Ir a la galería" className="flex items-center">
          <img src="/brand/andybrand-logo.png" alt="Andy Brand" width={52} height={32} className="h-8 w-auto select-none" draggable={false} />
        </Link>

        <div className="ml-auto flex items-center gap-3">
          {children}

          {supabaseReady && authReady && conGoogle && (
            <button
              type="button"
              data-testid="notifications-button"
              aria-label="Notificaciones (próximamente)"
              title="Notificaciones (próximamente)"
              className="grid h-10 w-10 place-items-center rounded-full text-azul-dark transition-colors hover:bg-azul hover:text-white"
            >
              <Icon icon="solar:bell-linear" width={22} aria-hidden />
            </button>
          )}

          <ThemeToggle />

          {supabaseReady && authReady &&
            (conGoogle ? (
              <div ref={menuRef} data-testid="session-state" data-state="google" className="relative">
                <button
                  ref={triggerRef}
                  type="button"
                  data-testid="user-menu-button"
                  aria-label="Menú de cuenta"
                  aria-haspopup="menu"
                  aria-expanded={menuOpen}
                  onPointerEnter={() => setSobrePerfil(true)}
                  onPointerLeave={() => setSobrePerfil(false)}
                  onClick={() => {
                    setNombreVisible(true);
                    setMenuOpen((o) => !o);
                  }}
                  className="group flex items-center rounded-full py-1 pl-1 pr-2 text-azul-dark transition-colors hover:bg-azul hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-azul"
                >
                  <UserAvatar url={urlMini} nombre={perfil?.nombre} size={36} />
                  {/* Separación interna de 4 px (ml-1). Con el nombre oculto, sin margen extra: foto y chevron quedan a 4 px */}
                  <span
                    data-testid="user-menu-name"
                    className={`overflow-hidden whitespace-nowrap text-sm font-medium transition-[max-width,opacity,margin] duration-300 ease-out ${
                      mostrarNombre ? 'ml-1 max-w-[140px] opacity-100' : 'ml-0 max-w-0 opacity-0'
                    }`}
                  >
                    {perfil?.nombre || 'Mi cuenta'}
                  </span>
                  <Icon
                    icon="solar:alt-arrow-down-linear"
                    width={16}
                    aria-hidden
                    className={`ml-1 shrink-0 transition-transform ${menuOpen ? 'rotate-180' : ''}`}
                  />
                </button>

                {menuOpen && (
                  <div
                    role="menu"
                    data-testid="user-menu"
                    onKeyDown={onMenuKeyDown}
                    className="absolute right-0 top-full z-50 mt-2 w-56 rounded-xl border border-gris-line bg-white p-1 shadow-xl"
                  >
                    <button
                      ref={(el) => {
                        if (el) itemsRef.current[0] = el;
                      }}
                      type="button"
                      role="menuitem"
                      data-testid="edit-profile-button"
                      onClick={() => {
                        setMenuOpen(false);
                        setEditando(true);
                      }}
                      className="flex w-full items-center gap-3 rounded-lg border border-transparent px-3 py-2 text-left text-sm text-azul-dark transition-colors hover:border-azul focus-visible:border-azul focus-visible:outline-none"
                    >
                      <Icon icon="solar:user-linear" width={18} aria-hidden />
                      Editar perfil
                    </button>
                    <div role="separator" className="my-1 h-px bg-gris-line" />
                    <button
                      ref={(el) => {
                        if (el) itemsRef.current[1] = el;
                      }}
                      type="button"
                      role="menuitem"
                      data-testid="logout-button"
                      onClick={handleLogout}
                      className="flex w-full items-center gap-3 rounded-lg border border-transparent px-3 py-2 text-left text-sm text-terracota transition-colors hover:border-terracota focus-visible:border-terracota focus-visible:outline-none"
                    >
                      <Icon icon="solar:logout-2-linear" width={18} aria-hidden />
                      Cerrar sesión
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button
                type="button"
                data-testid="login-google-button"
                disabled={busy}
                onClick={handleLogin}
                className="rounded-full border border-gris-line px-4 py-2 text-sm font-medium text-azul disabled:opacity-60"
              >
                Iniciar Sesión
              </button>
            ))}
        </div>

        {aviso && (
          <div
            role="status"
            data-testid="auth-toast"
            className={`fixed bottom-4 left-1/2 z-50 w-[min(92vw,460px)] -translate-x-1/2 rounded-xl border bg-white p-3 text-sm shadow-xl ${
              aviso.tipo === 'error' ? 'border-red-300 text-red-800' : 'border-gris-line text-azul-dark'
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <p className="font-medium">{aviso.texto}</p>
              <button type="button" aria-label="Cerrar aviso" onClick={() => setAviso(null)} className="shrink-0 text-gris-txt-oscuro hover:text-azul-dark">
                <Icon icon="solar:close-linear" width={16} />
              </button>
            </div>
            {aviso.detalle && (
              <p data-testid="auth-toast-detail" className="mt-2 select-all break-all rounded-md bg-gris-bg/60 p-2 font-mono text-[11px] text-gris-txt-oscuro">
                {aviso.detalle}
              </p>
            )}
          </div>
        )}

        {error && (
          <p role="alert" data-testid="auth-error" className="absolute right-5 top-full mt-1 max-w-[260px] text-right text-xs text-red-700 md:right-10">
            {error}
          </p>
        )}
      </header>

      {/* Espaciador: el header es fijo, así que el contenido empieza debajo */}
      <div aria-hidden className="h-[72px]" />

      {/* En un portal para quedar por encima de todo y no heredar el contexto del header */}
      {editando && uid &&
        createPortal(
          <EditProfileModal uid={uid} perfil={perfil} onClose={() => setEditando(false)} onSaved={setPerfil} />,
          document.body
        )}
    </>
  );
}
