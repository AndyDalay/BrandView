// Cálculo de columnas del masonry horizontal. Sin dependencias de React:
// vive fuera de HorizontalMasonry.tsx para que Fast Refresh solo trate componentes en ese archivo.

export interface Pin {
  id: string;
  w: number; // ancho real
  h: number; // alto real
}

export interface PlacedPin extends Pin {
  y: number; // posición vertical dentro de la columna
  dw: number; // ancho mostrado
  dh: number; // alto mostrado
}

export interface Lane {
  x: number; // posición horizontal de la columna
  width: number; // ancho de la columna (el pin más ancho)
  pins: PlacedPin[];
}

const GAP = 20;
const TARGET_W = 220; // ancho deseado de cada pin; si es demasiado alto, se reduce al alto de la columna

// Columnas verticales que crecen hacia la derecha.
// Cada pin se coloca en la columna actual mientras haya espacio; si no cabe, abre otra columna a la derecha.
export function layoutHorizontal(pins: Pin[], laneH: number): { lanes: Lane[]; width: number } {
  const lanes: Lane[] = [];
  let cur: Lane | undefined;
  let used = 0;

  for (const p of pins) {
    const ratio = p.w / p.h;
    let dw = TARGET_W;
    let dh = TARGET_W / ratio;
    if (dh > laneH) {
      dh = laneH;
      dw = laneH * ratio;
    }

    const needed = cur && cur.pins.length ? used + GAP + dh : dh;
    if (!cur || needed > laneH) {
      const x = cur ? cur.x + cur.width + GAP : 0;
      cur = { x, width: 0, pins: [] };
      lanes.push(cur);
      used = 0;
    }

    const y = cur.pins.length ? used + GAP : 0;
    cur.pins.push({ ...p, y, dw, dh });
    cur.width = Math.max(cur.width, dw);
    used = y + dh;
  }

  const last = lanes[lanes.length - 1];
  return { lanes, width: last ? last.x + last.width : 0 };
}
