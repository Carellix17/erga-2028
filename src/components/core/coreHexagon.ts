export type HexPoint = [number, number];

/** Vertice di un esagono regolare. L'indice 0 è in alto, poi si procede in senso orario. */
export function hexPoint(cx: number, cy: number, radius: number, index: number, count = 6): HexPoint {
  const angle = Math.PI / 2 - (index * 2 * Math.PI) / count;
  return [cx + radius * Math.cos(angle), cy - radius * Math.sin(angle)];
}

/**
 * Poligono con gli spigoli appena smussati. Il raggio è limitato a metà lato,
 * così un punteggio molto basso non piega il lato su se stesso.
 */
export function roundPolygon(points: HexPoint[], radius: number): string {
  const count = points.length;
  if (count < 3) return "";

  let path = "";
  for (let index = 0; index < count; index += 1) {
    const previous = points[(index - 1 + count) % count];
    const current = points[index];
    const next = points[(index + 1) % count];
    const incomingX = current[0] - previous[0];
    const incomingY = current[1] - previous[1];
    const outgoingX = next[0] - current[0];
    const outgoingY = next[1] - current[1];
    const incomingLength = Math.hypot(incomingX, incomingY) || 1;
    const outgoingLength = Math.hypot(outgoingX, outgoingY) || 1;
    const curve = Math.min(radius, incomingLength / 2, outgoingLength / 2);
    const startX = current[0] - (incomingX / incomingLength) * curve;
    const startY = current[1] - (incomingY / incomingLength) * curve;
    const endX = current[0] + (outgoingX / outgoingLength) * curve;
    const endY = current[1] + (outgoingY / outgoingLength) * curve;
    path += index === 0 ? `M ${startX} ${startY}` : `L ${startX} ${startY}`;
    path += ` Q ${current[0]} ${current[1]} ${endX} ${endY}`;
  }
  return `${path} Z`;
}

/** Ritira i vertici verso il centro del profilo, lasciando un bordo in cui le linee sfocate restano visibili. */
export function insetPolygon(points: HexPoint[], amount: number): HexPoint[] {
  const cx = points.reduce((sum, point) => sum + point[0], 0) / points.length;
  const cy = points.reduce((sum, point) => sum + point[1], 0) / points.length;
  return points.map(([x, y]) => {
    const dx = x - cx;
    const dy = y - cy;
    const length = Math.hypot(dx, dy) || 1;
    const next = Math.max(0, length - amount);
    return [cx + (dx / length) * next, cy + (dy / length) * next];
  });
}
