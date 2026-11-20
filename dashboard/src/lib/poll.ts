/** Whether the page is shown, and a way to hear when that changes; `browserVisibility` in the browser. */
export type Visibility = {
  hidden: () => boolean;
  subscribe: (listener: () => void) => () => void;
};

export const browserVisibility: Visibility = {
  hidden: () => document.hidden,
  subscribe: (listener) => {
    document.addEventListener("visibilitychange", listener);
    return () => document.removeEventListener("visibilitychange", listener);
  },
};

/**
 * Calls `run` now, then `intervalMs` after each answer: one request at a time, so answers
 * arrive in order and an old one never replaces a newer one. Paused while the page is
 * hidden, asks again at once when it shows. `run` must not reject. Returns `stop`, after
 * which no answer is delivered.
 */
export function poll<R>(
  run: () => Promise<R>,
  onResult: (result: R) => void,
  intervalMs: number,
  visibility: Visibility,
): () => void {
  let stopped = false;
  let pending = false;
  let timer: ReturnType<typeof setTimeout> | undefined;

  const ask = async () => {
    timer = undefined;
    pending = true;
    const result = await run();
    pending = false;
    if (stopped) return;
    onResult(result);
    if (!visibility.hidden()) timer = setTimeout(ask, intervalMs);
  };

  const onVisibility = () => {
    if (visibility.hidden()) {
      clearTimeout(timer);
      timer = undefined;
    } else if (!pending && timer === undefined) {
      void ask();
    }
  };

  const unsubscribe = visibility.subscribe(onVisibility);
  if (!visibility.hidden()) void ask();

  return () => {
    stopped = true;
    clearTimeout(timer);
    unsubscribe();
  };
}
