import { Icon } from '@iconify/react';

// Avatar único para header, comentarios y cuenta (P7).
// Con foto: círculo recortado. Sin foto: icono de usuario plano, sin círculo, a 60 % del tamaño
// (con size 36 queda del tamaño de la campana de notificaciones).
export function UserAvatar({ url, nombre, size = 36 }: { url: string | null; nombre?: string; size?: number }) {
  if (url) {
    return (
      <img
        src={url}
        alt={nombre ? `Foto de ${nombre}` : 'Foto de perfil'}
        width={size}
        height={size}
        draggable={false}
        className="block shrink-0 rounded-full object-cover ring-2 ring-white shadow-sm"
        style={{ width: size, height: size }}
      />
    );
  }
  return <Icon icon="solar:user-linear" width={size * 0.6} height={size * 0.6} aria-hidden className="block shrink-0 text-azul-dark" />;
}
