import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { poll, type Visibility } from "./poll";

/** A page whose visibility the test switches, like `document.hidden` + `visibilitychange`. */
function page(hidden = false) {
  const listeners = new Set<() => void>();
  const visibility: Visibility = {
    hidden: () => hidden,
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
  const set = (value: boolean) => {
    hidden = value;
    for (const listener of listeners) listener();
  };
  return { visibility, hide: () => set(true), show: () => set(false), listeners };
}

/** A request answering `latencyMs` after it starts, with its own sequence number. */
function endpoint(latencyMs: number) {
  let calls = 0;
  const run = vi.fn(() => {
    const call = ++calls;
    return new Promise<number>((resolve) => setTimeout(() => resolve(call), latencyMs));
  });
  return run;
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("poll", () => {
  it("asks at once, then the interval after each answer", async () => {
    const run = endpoint(1_000);
    const results: number[] = [];
    poll(run, (r) => results.push(r), 5_000, page().visibility);

    expect(run).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1_000);
    expect(results).toEqual([1]);
    await vi.advanceTimersByTimeAsync(4_999);
    expect(run).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);
    expect(run).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(1_000);
    expect(results).toEqual([1, 2]);
  });

  it("never sends a request while another one is pending", async () => {
    const run = endpoint(12_000);
    const results: number[] = [];
    poll(run, (r) => results.push(r), 5_000, page().visibility);

    await vi.advanceTimersByTimeAsync(11_999);
    expect(run).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1 + 5_000 + 12_000);
    expect(results).toEqual([1, 2]);
    expect(run).toHaveBeenCalledTimes(2);
  });

  it("delivers nothing and asks no more once stopped", async () => {
    const run = endpoint(1_000);
    const results: number[] = [];
    const stop = poll(run, (r) => results.push(r), 5_000, page().visibility);

    stop();
    await vi.advanceTimersByTimeAsync(60_000);
    expect(results).toEqual([]);
    expect(run).toHaveBeenCalledTimes(1);
  });

  it("stops listening to the page once stopped", () => {
    const { visibility, listeners } = page();
    const stop = poll(endpoint(1_000), () => {}, 5_000, visibility);

    expect(listeners.size).toBe(1);
    stop();
    expect(listeners.size).toBe(0);
  });

  it("pauses while the page is hidden and asks at once when it shows again", async () => {
    const run = endpoint(1_000);
    const tab = page();
    poll(run, () => {}, 5_000, tab.visibility);

    await vi.advanceTimersByTimeAsync(2_000);
    tab.hide();
    await vi.advanceTimersByTimeAsync(60_000);
    expect(run).toHaveBeenCalledTimes(1);

    tab.show();
    expect(run).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(1_000 + 5_000);
    expect(run).toHaveBeenCalledTimes(3);
  });

  it("does not schedule after an answer that arrives while the page is hidden", async () => {
    const run = endpoint(1_000);
    const results: number[] = [];
    const tab = page();
    poll(run, (r) => results.push(r), 5_000, tab.visibility);

    tab.hide();
    await vi.advanceTimersByTimeAsync(60_000);
    expect(results).toEqual([1]);
    expect(run).toHaveBeenCalledTimes(1);
  });

  it("does not double a pending request when the page shows again", async () => {
    const run = endpoint(3_000);
    const tab = page();
    poll(run, () => {}, 5_000, tab.visibility);

    tab.hide();
    tab.show();
    expect(run).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(3_000 + 5_000);
    expect(run).toHaveBeenCalledTimes(2);
  });

  it("waits for a page that starts hidden", async () => {
    const run = endpoint(1_000);
    const tab = page(true);
    poll(run, () => {}, 5_000, tab.visibility);

    await vi.advanceTimersByTimeAsync(60_000);
    expect(run).not.toHaveBeenCalled();
    tab.show();
    expect(run).toHaveBeenCalledTimes(1);
  });
});
