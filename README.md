# GrandBrandView

Visor de manuales de identidad de marca, con galería y animación de libro.

## Estructura de la galería

```
public/
  galeria/
    nombre-de-la-empresa/        ← una carpeta por manual
      nombre.txt                 ← (opcional) nombre visible, ej: "Ejemplo Marca"
      portada.jpg
      page-01.jpg
      page-02.jpg
      ...
      contraportada.jpg
  ads/
    banner-add-01.jpg            ← banners de anuncios (rotan arriba)
    banner-add-02.jpg
  sounds/
    page-flip.wav                ← sonido de hoja (puedes cambiarlo por otro)
```

- Formatos: jpg, png, webp, svg o gif.
- El orden es: portada → page-01, page-02… → contraportada.
- El nombre de la carpeta se usa en la URL (`/manual/nombre-de-la-empresa`), así que usa minúsculas y guiones.
- No hace falta tocar código: al añadir carpetas, recarga la página (en `npm run dev` el manifest se regenera solo).

## Añadir manuales desde la app

En la galería, el botón **Añadir manual** permite subir:

- **PDF**: cada página se convierte en una imagen. La primera es la portada y la última la contraportada.
- **Carpeta** con imágenes: se ordenan como portada → page-xx → contraportada.

Los manuales subidos se guardan en el navegador (IndexedDB) y aparecen al inicio de la galería con un punto azul hasta que se abren. Para que sean visibles para todos, habría que guardarlos en un backend (por ejemplo Supabase).

## Desarrollo

```bash
npm install
npm run dev
```

## Compilar

```bash
npm run build
```

## Despliegue (GitHub + Vercel)

1. Sube el proyecto a un repositorio de GitHub.
2. En Vercel: "Add New Project", importa el repositorio. Framework: Vite. Build: `npm run build`. Output: `dist`.
3. Cada manual compartido tendrá la URL `https://tu-app.vercel.app/manual/nombre-de-la-empresa`.

## Próximos pasos

- Anuncios con Google Ads: reemplazar `AdBanner` por el código de Google Ads.
- Supabase: si se quiere registrar visitas o gestionar manuales desde una base de datos, se añade después.
