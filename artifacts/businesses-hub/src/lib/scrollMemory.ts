let popNavigation = false;

if (typeof window !== "undefined") {
  window.addEventListener("popstate", () => {
    popNavigation = true;
  });
}

export function isPopNavigation(): boolean {
  return popNavigation;
}

export function clearPopNavigation(): void {
  popNavigation = false;
}

let pendingRestoreKey: string | null = null;

export function setPendingRestore(key: string): void {
  pendingRestoreKey = key;
}

export function consumePendingRestore(key: string): number | null {
  if (pendingRestoreKey !== key) return null;
  pendingRestoreKey = null;
  return readScrollPosition(key);
}

const KEY_PREFIX = "scroll-pos:";

export function saveScrollPosition(key: string, y: number): void {
  try {
    sessionStorage.setItem(KEY_PREFIX + key, String(y));
  } catch {
    /* sessionStorage unavailable */
  }
}

export function readScrollPosition(key: string): number | null {
  try {
    const raw = sessionStorage.getItem(KEY_PREFIX + key);
    if (raw === null) return null;
    const y = Number(raw);
    return Number.isFinite(y) ? y : null;
  } catch {
    return null;
  }
}
