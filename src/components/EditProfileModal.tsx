import { useEffect, useRef, useState } from 'react';
import { Icon } from '@iconify/react';
import { AvatarCropper } from './AvatarCropper';
import { getPerfil, guardarAvatar, guardarNombre, NOMBRE_MAX, urlAvatar, type Perfil } from '@/lib/perfiles';

// Modal "Editar perfil". Título a la izquierda; el resto centrado.
// Foto circular con botón de editar sobre el borde; nombre editable con botón de guardar
// que aparece solo cuando el nombre cambia. La foto nueva pasa por el recortador (P5).
export function EditProfileModal({
  uid,
  perfil,
  onClose,
  onSaved,
}: {
  uid: string;
  perfil: Perfil | null;
  onClose: () => void;
  onSaved: (perfil: Perfil | null) => void;
}) {
  const [nombre, setNombre] = useState(perfil?.nombre ?? '');
  const [fileToCrop, setFileToCrop] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [mensaje, setMensaje] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const urlGrande = perfil ? urlAvatar(perfil, 'grande') : null;
  const cambiado = nombre.trim() !== (perfil?.nombre ?? '').trim();

  // Escape cierra el modal, salvo mientras hay recortador abierto o se guarda
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !saving && !fileToCrop) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [saving, fileToCrop, onClose]);

  async function refrescar() {
    const actualizado = await getPerfil(uid);
    onSaved(actualizado);
    return actualizado;
  }

  async function handleGuardarNombre() {
    setSaving(true);
    setMensaje(null);
    try {
      await guardarNombre(uid, nombre);
      await refrescar();
      setMensaje({ tipo: 'ok', texto: 'Nombre guardado.' });
    } catch (e) {
      setMensaje({ tipo: 'error', texto: e instanceof Error ? e.message : 'No se pudo guardar el nombre.' });
    } finally {
      setSaving(false);
    }
  }

  async function handleConfirmarFoto(grande: Blob, mini: Blob) {
    await guardarAvatar(uid, grande, mini);
    setFileToCrop(null);
    await refrescar();
    setMensaje({ tipo: 'ok', texto: 'Foto actualizada.' });
  }

  return (
    <>
      <div
        data-testid="edit-profile-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-profile-title"
        className="fixed inset-0 z-50 grid place-items-center bg-azul-dark/35 p-4 backdrop-blur-sm"
        onMouseDown={(e) => e.target === e.currentTarget && !saving && !fileToCrop && onClose()}
      >
        <div className="anim-in w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
          <div className="flex items-center justify-between">
            <h2 id="edit-profile-title" className="font-display text-2xl text-azul-dark">
              Editar perfil
            </h2>
            <button
              type="button"
              data-testid="profile-close"
              onClick={onClose}
              disabled={saving}
              aria-label="Cerrar"
              className="grid h-9 w-9 place-items-center text-gris-txt-oscuro transition-colors hover:text-azul-dark disabled:opacity-40"
            >
              <Icon icon="solar:close-linear" width={22} aria-hidden />
            </button>
          </div>

          <div className="mt-4 flex flex-col items-center">
            {/* Foto circular con el botón de editar sobre el borde */}
            <div className="relative">
              <div className="grid h-28 w-28 place-items-center overflow-hidden rounded-full bg-azul-tint text-azul-dark">
                {urlGrande ? (
                  <img src={urlGrande} alt="Foto de perfil" className="h-full w-full object-cover" draggable={false} />
                ) : (
                  <Icon icon="solar:user-linear" width={56} aria-hidden />
                )}
              </div>
              <button
                type="button"
                data-testid="profile-photo-button"
                aria-label="Cambiar foto"
                onClick={() => inputRef.current?.click()}
                disabled={saving}
                className="absolute bottom-0 right-0 grid h-10 w-10 place-items-center rounded-full border-4 border-white bg-azul text-white shadow transition-colors hover:bg-azul-mid disabled:opacity-50"
              >
                <Icon icon="solar:pen-linear" width={16} aria-hidden />
              </button>
              <input
                ref={inputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                data-testid="profile-photo-input"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  e.target.value = '';
                  if (f) setFileToCrop(f);
                }}
              />
            </div>

            {/* Nombre: campo editable con botón de guardar, solo si se ha modificado */}
            <div className="mt-6 flex w-full max-w-xs items-center gap-2">
              <input
                type="text"
                value={nombre}
                maxLength={NOMBRE_MAX}
                onChange={(e) => setNombre(e.target.value)}
                data-testid="profile-name-input"
                aria-label="Nombre"
                className="min-w-0 flex-1 rounded-lg border border-gris-line bg-white px-3 py-2 text-center text-lg font-medium text-azul-dark focus:border-azul focus:outline-none"
              />
              {cambiado && (
                <button
                  type="button"
                  data-testid="profile-save-name"
                  aria-label="Guardar nombre"
                  title="Guardar nombre"
                  onClick={handleGuardarNombre}
                  disabled={saving}
                  className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-azul text-white shadow hover:bg-azul-mid disabled:opacity-50"
                >
                  <Icon icon="solar:diskette-linear" width={20} aria-hidden />
                </button>
              )}
            </div>

            {mensaje && (
              <p
                role={mensaje.tipo === 'error' ? 'alert' : 'status'}
                data-testid="profile-message"
                className={`mt-4 text-center text-sm ${mensaje.tipo === 'error' ? 'text-terracota' : 'text-azul-dark'}`}
              >
                {mensaje.texto}
              </p>
            )}
          </div>
        </div>
      </div>

      {fileToCrop && (
        <AvatarCropper file={fileToCrop} onCancel={() => setFileToCrop(null)} onConfirm={handleConfirmarFoto} />
      )}
    </>
  );
}
