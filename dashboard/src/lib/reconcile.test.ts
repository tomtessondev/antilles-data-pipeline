import { describe, expect, it } from "vitest";

import { reconcile } from "./reconcile";

type Point = { id: string; x: number };
type Item = { id: string; x: number; removed: boolean };

function markers() {
  const items = new Map<string, Item>();
  const created: string[] = [];
  const ops = {
    create: (point: Point): Item => {
      created.push(point.id);
      return { id: point.id, x: Number.NaN, removed: false };
    },
    update: (item: Item, point: Point) => {
      item.x = point.x;
    },
    remove: (item: Item) => {
      item.removed = true;
    },
  };
  return { items, created, sync: (points: Point[]) => reconcile(items, points, ops) };
}

describe("reconcile", () => {
  it("creates an item per new point and draws it", () => {
    const { items, created, sync } = markers();
    sync([
      { id: "a", x: 1 },
      { id: "b", x: 2 },
    ]);

    expect(created).toEqual(["a", "b"]);
    expect(items.get("a")?.x).toBe(1);
    expect(items.get("b")?.x).toBe(2);
  });

  it("updates the existing items in place instead of recreating them", () => {
    const { items, created, sync } = markers();
    sync([{ id: "a", x: 1 }]);
    const first = items.get("a");

    sync([{ id: "a", x: 5 }]);

    expect(created).toEqual(["a"]);
    expect(items.get("a")).toBe(first);
    expect(first?.x).toBe(5);
  });

  it("removes the items whose point is gone", () => {
    const { items, sync } = markers();
    sync([
      { id: "a", x: 1 },
      { id: "b", x: 2 },
    ]);
    const gone = items.get("b");

    sync([{ id: "a", x: 1 }]);

    expect([...items.keys()]).toEqual(["a"]);
    expect(gone?.removed).toBe(true);
    expect(items.get("a")?.removed).toBe(false);
  });
});
