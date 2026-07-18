import { useCallback, useEffect, useRef, useState } from "react";
import { navigate } from "wouter/use-browser-location";

/**
 * Warns the user before they leave the page while the form has unsaved
 * changes.
 *
 * - Tab close / refresh: native `beforeunload` prompt (browser requirement).
 * - In-app link clicks and browser back button: intercepted and surfaced via
 *   the returned `dialog` state so the page can render a styled
 *   `UnsavedChangesDialog` with Stay / Leave (and optionally Save & leave).
 *
 * `snapshot` is a serialized representation of the form state. The hook keeps
 * a "clean" baseline snapshot; the form is dirty whenever the current snapshot
 * differs from the baseline. Call `markClean()` after a successful save or a
 * programmatic restore so the freshly-set state becomes the new baseline.
 */
export function useUnsavedChangesWarning(snapshot: string) {
  const baselineRef = useRef<string | null>(null);
  const rebaselineRef = useRef(false);
  if (baselineRef.current === null || rebaselineRef.current) {
    baselineRef.current = snapshot;
    rebaselineRef.current = false;
  }
  const isDirty = snapshot !== baselineRef.current;

  const dirtyRef = useRef(isDirty);
  dirtyRef.current = isDirty;
  const guardPushedRef = useRef(false);

  const [dialogOpen, setDialogOpen] = useState(false);
  // Action to perform when the user chooses to leave.
  const pendingLeaveRef = useRef<(() => void) | null>(null);

  /** Rebaseline on the next render (after pending setState calls apply). */
  const markClean = useCallback(() => {
    rebaselineRef.current = true;
  }, []);

  // Push a duplicate history entry once the form becomes dirty so we can
  // intercept the browser back button without wouter unmounting us first.
  useEffect(() => {
    if (isDirty && !guardPushedRef.current) {
      try {
        window.history.pushState({ bhUnsavedGuard: true }, "", window.location.href);
        guardPushedRef.current = true;
      } catch { /* noop */ }
    }
  }, [isDirty]);

  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!dirtyRef.current) return;
      e.preventDefault();
      e.returnValue = "";
    };

    // Capture-phase click interception for internal <a> navigation (wouter
    // Links render anchors and skip navigation when defaultPrevented).
    const onClickCapture = (e: MouseEvent) => {
      if (!dirtyRef.current) return;
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const target = e.target as Element | null;
      const anchor = target?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!anchor) return;
      if (anchor.target && anchor.target !== "_self") return;
      const href = anchor.getAttribute("href") || "";
      if (href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) return;
      let url: URL;
      try {
        url = new URL(href, window.location.href);
      } catch {
        return;
      }
      if (url.origin !== window.location.origin) return;
      if (url.pathname === window.location.pathname) return;
      // Block the navigation and ask via the styled dialog instead.
      e.preventDefault();
      e.stopPropagation();
      const dest = url.pathname + url.search + url.hash;
      pendingLeaveRef.current = () => navigate(dest);
      setDialogOpen(true);
    };

    const onPopState = () => {
      if (!guardPushedRef.current) return;
      guardPushedRef.current = false;
      if (!dirtyRef.current) {
        // Clean: consume the guard entry and continue back.
        window.history.back();
        return;
      }
      // Dirty: restore the guard entry so we stay put while the dialog is
      // open, and go back two entries (guard + original) if the user leaves.
      try {
        window.history.pushState({ bhUnsavedGuard: true }, "", window.location.href);
        guardPushedRef.current = true;
      } catch { /* noop */ }
      pendingLeaveRef.current = () => {
        guardPushedRef.current = false;
        window.history.go(-2);
      };
      setDialogOpen(true);
    };

    window.addEventListener("beforeunload", onBeforeUnload);
    document.addEventListener("click", onClickCapture, true);
    window.addEventListener("popstate", onPopState);
    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
      document.removeEventListener("click", onClickCapture, true);
      window.removeEventListener("popstate", onPopState);
    };
  }, []);

  const stay = useCallback(() => {
    pendingLeaveRef.current = null;
    setDialogOpen(false);
  }, []);

  const leave = useCallback(() => {
    const action = pendingLeaveRef.current;
    pendingLeaveRef.current = null;
    setDialogOpen(false);
    if (action) action();
  }, []);

  /**
   * For programmatic navigation (button onClick → navigate) that bypasses the
   * anchor-click interception: runs `action` immediately when clean, otherwise
   * opens the dialog and runs it only if the user chooses to leave.
   */
  const requestLeave = useCallback((action: () => void) => {
    if (!dirtyRef.current) {
      action();
      return;
    }
    pendingLeaveRef.current = action;
    setDialogOpen(true);
  }, []);

  return {
    isDirty,
    markClean,
    requestLeave,
    dialog: { open: dialogOpen, stay, leave },
  };
}
