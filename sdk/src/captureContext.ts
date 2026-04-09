// sdk/src/captureContext.ts
import { getContext, runWithContext } from "./context";
import type { CorrelationContext } from "./types";

/**
 * Snapshot the current CorrelationContext so it can be restored
 * later across async boundaries (e.g. event emitters, setTimeout,
 * or callback-based APIs that lose ALS context).
 *
 * Usage:
 *   const captured = captureContext();
 *   someEmitter.on("data", () => {
 *     captured.run(() => {
 *       // context is restored here
 *       track("handleData", async () => { ... });
 *     });
 *   });
 */
export function captureContext(): { run<T>(fn: () => T): T } {
  const snapshot = getContext();

  return {
    run<T>(fn: () => T): T {
      if (snapshot) {
        return runWithContext(snapshot, fn);
      }
      // No context to restore — just run fn
      return fn();
    },
  };
}
