import { Children, type ReactNode } from 'react';

// Botones de la topbar: entran uno a uno de izquierda a derecha y salen a la vez.
export function ActionsStagger({ children, exiting = false }: { children?: ReactNode; exiting?: boolean }) {
  const items = Children.toArray(children);
  return (
    <div className="flex items-center gap-1">
      {items.map((child, i) => (
        <div
          key={i}
          style={
            exiting
              ? { animation: 'actionOut 260ms ease forwards', animationDelay: '0ms' }
              : { animation: 'actionIn 460ms cubic-bezier(0.16, 1, 0.3, 1) both', animationDelay: `${i * 90}ms` }
          }
        >
          {child}
        </div>
      ))}
    </div>
  );
}
