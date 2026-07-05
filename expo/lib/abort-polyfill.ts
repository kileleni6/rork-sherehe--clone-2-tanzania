/**
 * Monkey-patches the global AbortController so that every `abort()` call
 * always carries a reason.  Without this, React Native's Hermes engine
 * throws `"signal is aborted without reason"` whenever anything accesses
 * `signal.reason` on an unreasoned abort — and the Supabase JS client
 * (GoTrue / realtime) creates AbortControllers internally without passing
 * a reason.
 *
 * Import this file as early as possible — before any module that might
 * instantiate an AbortController.
 */

const NativeAbortController: typeof AbortController =
  (globalThis as Record<string, unknown>).AbortController as typeof AbortController;

if (NativeAbortController) {
  const PATCHED = "__sherehe_abort_patched__";

  if (!(globalThis as Record<string, unknown>)[PATCHED]) {
    (globalThis as Record<string, unknown>)[PATCHED] = true;

    const PatchedController = class extends NativeAbortController {
      abort(reason?: unknown): void {
        super.abort(
          reason ?? new DOMException("The operation was aborted.", "AbortError"),
        );
      }
    };

    // Preserve static properties (e.g. AbortSignal subclasses may reference it)
    Object.setPrototypeOf(PatchedController, NativeAbortController);

    Object.defineProperty(globalThis, "AbortController", {
      value: PatchedController,
      writable: true,
      configurable: true,
    });
  }
}
