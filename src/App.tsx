import { Route, Routes } from 'react-router-dom';
import { Library } from './pages/Library';
import { Viewer } from './pages/Viewer';
import { TransitionProvider } from './lib/transition';

export default function App() {
  return (
    <div className="relative min-h-screen">
      <div className="noise-layer" aria-hidden />
      {/* Fondo: degradado elíptico del azul de la marca desde la esquina superior izquierda, bajo el header */}
      <div className="bg-glow" aria-hidden />
      {/* Ruido más visible justo debajo del header, que se desvanece hacia abajo */}
      <div className="noise-top" aria-hidden />
      <TransitionProvider>
        <Routes>
          <Route path="/" element={<Library />} />
          <Route path="/manual/:id" element={<Viewer />} />
          <Route path="*" element={<Library />} />
        </Routes>
      </TransitionProvider>
    </div>
  );
}
