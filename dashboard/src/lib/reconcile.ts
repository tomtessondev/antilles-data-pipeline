/**
 * Brings `items` (keyed by point id) in line with `points`: creates the missing ones,
 * updates every kept one in place and removes those whose point is gone.
 */
export function reconcile<P extends { id: string }, I>(
  items: Map<string, I>,
  points: readonly P[],
  ops: { create: (point: P) => I; update: (item: I, point: P) => void; remove: (item: I) => void },
): void {
  const seen = new Set<string>();
  for (const point of points) {
    seen.add(point.id);
    let item = items.get(point.id);
    if (item === undefined) {
      item = ops.create(point);
      items.set(point.id, item);
    }
    ops.update(item, point);
  }
  for (const [id, item] of items) {
    if (!seen.has(id)) {
      ops.remove(item);
      items.delete(id);
    }
  }
}
