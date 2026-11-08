import { useCallback, useRef, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { Ctx } from './transitionContext';

// Navegación con animación de salida: la página actual se limpia y luego cambia de ruta.
export function TransitionProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const [exiting, setExiting] = useState(false);
  const busy = useRef(false);

  const go = useCallback(
    (to: string, ms = 400) => {
      if (busy.current) return;
      busy.current = true;
      setExiting(true);
      window.setTimeout(() => {
        navigate(to);
        setExiting(false);
        busy.current = false;
      }, ms);
    },
    [navigate]
  );

  return <Ctx.Provider value={{ exiting, go }}>{children}</Ctx.Provider>;
}
