import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'node:fs';
import path from 'node:path';
import { buildManifest } from './scripts/manifest.mjs';

// Genera public/galeria/manifest.json leyendo las carpetas de la galería.
// Se regenera al arrancar, al compilar y cada vez que la app lo pide en dev.
function galleryManifest(): Plugin {
  const root = process.cwd();
  const write = () => {
    const dir = path.join(root, 'public', 'galeria');
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'manifest.json'), JSON.stringify(buildManifest(root), null, 2));
  };
  return {
    name: 'gallery-manifest',
    buildStart: write,
    configureServer(server) {
      write();
      server.middlewares.use('/galeria/manifest.json', (_req, _res, next) => {
        write();
        next();
      });
    },
  };
}

export default defineConfig({ plugins: [react(), galleryManifest()] });
