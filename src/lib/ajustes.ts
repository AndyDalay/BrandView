import { useEffect, useState } from 'react';

// Ajustes de la app (V1). Se guardan en localStorage con try/catch y avisan a los componentes al cambiar.
export interface Ajustes {
  volumen: number; // 0–200 (%). 100 = nivel original del sonido de página
  notificaciones: boolean; // preferencia guardada; las notificaciones aún no existen
  mostrarAnuncios: boolean; // V11: el banner de anuncios sale solo si está activado (desactivado por defecto)
}

const KEY = 'gbv-ajustes';
const EVENTO = 'gbv-ajustes-cambio';
const PREDETERMINADO: Ajustes = { volumen: 100, notificaciones: true, mostrarAnuncios: false };

export function leerAjustes(): Ajustes {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return PREDETERMINADO;
    const p = JSON.parse(raw) as Partial<Ajustes>;
    return {
      volumen: Math.min(200, Math.max(0, Number(p.volumen ?? PREDETERMINADO.volumen))),
      notificaciones: Boolean(p.notificaciones ?? PREDETERMINADO.notificaciones),
      mostrarAnuncios: Boolean(p.mostrarAnuncios ?? PREDETERMINADO.mostrarAnuncios),
    };
  } catch {
    return PREDETERMINADO;
  }
}

export function guardarAjustes(cambios: Partial<Ajustes>) {
  const nuevo = { ...leerAjustes(), ...cambios };
  try {
    localStorage.setItem(KEY, JSON.stringify(nuevo));
  } catch {
    /* sin almacenamiento: el ajuste dura solo esta sesión */
  }
  window.dispatchEvent(new Event(EVENTO));
}

/** Ajustes en vivo: se actualiza en todos los componentes que lo usan. */
export function useAjustes(): Ajustes {
  const [ajustes, setAjustes] = useState<Ajustes>(leerAjustes);
  useEffect(() => {
    const onCambio = () => setAjustes(leerAjustes());
    window.addEventListener(EVENTO, onCambio);
    return () => window.removeEventListener(EVENTO, onCambio);
  }, []);
  return ajustes;
}
