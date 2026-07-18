import { useEffect, useRef } from "react";

// Cloudflare Turnstile widget wrapper. Loads the Turnstile script once on
// demand, renders a widget into a host <div>, and surfaces token lifecycle
// events (token issued / token expired / challenge errored) to the parent
// via callback props.
//
// Why Turnstile (and not a visible CAPTCHA)?
//   - Most real visitors solve it invisibly (no checkbox, no puzzle), so the
//     contact form stays low-friction.
//   - Free for all traffic volumes.
//   - Privacy-friendly (no tracking cookies for the visitor).
//
// Rendering is gated by the caller (Contact.tsx) on the presence of the
// `VITE_TURNSTILE_SITE_KEY` env var. When the key is unset (e.g. local dev,
// or before keys are provisioned), the component is simply not mounted and
// the form posts without a token — the API treats the missing token as
// "Turnstile not enforced" so the form keeps working.

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: HTMLElement | string,
        options: {
          sitekey: string;
          callback?: (token: string) => void;
          "error-callback"?: () => void;
          "expired-callback"?: () => void;
          "timeout-callback"?: () => void;
          theme?: "light" | "dark" | "auto";
          size?: "normal" | "flexible" | "compact";
          appearance?: "always" | "execute" | "interaction-only";
          language?: string;
        },
      ) => string;
      reset: (widgetId?: string) => void;
      remove: (widgetId?: string) => void;
    };
  }
}

const SCRIPT_SRC =
  "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
const SCRIPT_ID = "cf-turnstile-script";

let scriptPromise: Promise<void> | null = null;

function loadTurnstileScript(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.turnstile) return Promise.resolve();
  if (scriptPromise) return scriptPromise;

  scriptPromise = new Promise<void>((resolve, reject) => {
    const existing = document.getElementById(
      SCRIPT_ID,
    ) as HTMLScriptElement | null;
    if (existing) {
      // Another mount started loading it; wait for that load.
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("turnstile_script_error")));
      return;
    }
    const script = document.createElement("script");
    script.id = SCRIPT_ID;
    script.src = SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => {
      scriptPromise = null;
      reject(new Error("turnstile_script_error"));
    };
    document.head.appendChild(script);
  });

  return scriptPromise;
}

export interface TurnstileProps {
  siteKey: string;
  onToken: (token: string) => void;
  onExpire?: () => void;
  onError?: () => void;
  theme?: "light" | "dark" | "auto";
  language?: string;
  className?: string;
}

export function Turnstile({
  siteKey,
  onToken,
  onExpire,
  onError,
  theme = "auto",
  language,
  className,
}: TurnstileProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const widgetIdRef = useRef<string | null>(null);

  // We deliberately depend only on `siteKey`/`language`/`theme`. The callback
  // refs are captured in refs so re-rendering the parent (which always passes
  // new function identities for `onToken` etc.) doesn't tear down and
  // re-create the widget on every keystroke.
  const onTokenRef = useRef(onToken);
  const onExpireRef = useRef(onExpire);
  const onErrorRef = useRef(onError);
  useEffect(() => {
    onTokenRef.current = onToken;
    onExpireRef.current = onExpire;
    onErrorRef.current = onError;
  }, [onToken, onExpire, onError]);

  useEffect(() => {
    let cancelled = false;
    loadTurnstileScript()
      .then(() => {
        if (cancelled) return;
        if (!hostRef.current || !window.turnstile) return;
        widgetIdRef.current = window.turnstile.render(hostRef.current, {
          sitekey: siteKey,
          theme,
          ...(language ? { language } : {}),
          callback: (token: string) => onTokenRef.current(token),
          "expired-callback": () => onExpireRef.current?.(),
          "error-callback": () => onErrorRef.current?.(),
        });
      })
      .catch(() => {
        // Script failed to load (network blocked, ad blocker, offline).
        // Surface as an error so the parent can decide whether to enforce.
        onErrorRef.current?.();
      });

    return () => {
      cancelled = true;
      if (widgetIdRef.current && window.turnstile) {
        try {
          window.turnstile.remove(widgetIdRef.current);
        } catch {
          // ignore — widget may already be gone
        }
        widgetIdRef.current = null;
      }
    };
  }, [siteKey, theme, language]);

  return (
    <div
      ref={hostRef}
      className={className}
      data-testid="turnstile-widget"
    />
  );
}
