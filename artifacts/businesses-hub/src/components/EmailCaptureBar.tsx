import { useState, type FormEvent } from "react";
import { Mail, CheckCircle2, Loader2 } from "lucide-react";
import {
  useSubscribeNewsletter,
  type NewsletterSubscribeResponse,
} from "@workspace/api-client-react";
import { ApiError } from "@workspace/api-client-react";
import { useLanguage } from "@/context/LanguageContext";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function EmailCaptureBar() {
  const { t, lang } = useLanguage();

  const [email, setEmail] = useState("");
  const [website, setWebsite] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState<
    null | "subscribed" | "resubscribed"
  >(null);

  const mutation = useSubscribeNewsletter({
    mutation: {
      // The server collapses newly-inserted and already-active outcomes to
      // the same `subscribed` status to prevent email-existence enumeration.
      // The one case it DOES distinguish is `resubscribed` — a previously
      // unsubscribed user opting back in — so we surface a welcome-back
      // message instead of the generic success copy.
      onSuccess: (data: NewsletterSubscribeResponse) => {
        setSubmitted(data.status === "resubscribed" ? "resubscribed" : "subscribed");
        setError(null);
        setEmail("");
      },
      onError: (err) => {
        if (err instanceof ApiError && err.status === 400) {
          setError(t("home.email_capture.error.invalid"));
          return;
        }
        setError(t("home.email_capture.error.generic"));
      },
    },
  });

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed) {
      setError(t("home.email_capture.error.required"));
      return;
    }
    if (!EMAIL_RE.test(trimmed)) {
      setError(t("home.email_capture.error.invalid"));
      return;
    }
    setError(null);
    mutation.mutate({
      data: {
        email: trimmed,
        source: "homepage",
        // Picks the welcome email's language (English or Arabic) to match
        // the language the visitor is browsing the site in.
        lang,
        // Honeypot — real visitors leave this empty (the input is hidden
        // off-screen and `tabindex="-1"` so it can't be reached by tab).
        // Bots that auto-fill every field will land on this and the server
        // will silently drop the submission.
        website,
      },
    });
  };

  return (
    <section
      className="border-b border-gray-200 dark:border-gray-800 bg-gradient-to-r from-blue-50 via-white to-violet-50 dark:from-blue-950/40 dark:via-gray-950 dark:to-violet-950/40"
      data-testid="home-email-capture-section"
      aria-labelledby="home-email-capture-heading"
    >
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-12">
        <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm p-6 md:p-8">
          <div className="flex flex-col md:flex-row md:items-center md:gap-8">
            <div className="md:flex-1 text-center md:text-start mb-5 md:mb-0">
              <div className="inline-flex items-center gap-2 mb-2 text-blue-600 dark:text-blue-400">
                <Mail className="w-4 h-4" />
                <span className="text-xs font-semibold uppercase tracking-wider">
                  {t("home.email_capture.eyebrow")}
                </span>
              </div>
              <h2
                id="home-email-capture-heading"
                className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white leading-snug"
              >
                {t("home.email_capture.heading")}
              </h2>
            </div>

            <div className="md:flex-1">
              {submitted ? (
                <div
                  className="flex items-start gap-3 p-4 rounded-xl bg-green-50 dark:bg-green-950/40 border border-green-200 dark:border-green-800"
                  role="status"
                  data-testid="email-capture-success"
                  data-status={submitted}
                >
                  <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-green-800 dark:text-green-200">
                      {submitted === "resubscribed"
                        ? t("home.email_capture.resubscribed.title")
                        : t("home.email_capture.success.title")}
                    </p>
                    <p className="text-xs text-green-700 dark:text-green-300 mt-0.5">
                      {submitted === "resubscribed"
                        ? t("home.email_capture.resubscribed.body")
                        : t("home.email_capture.success.body")}
                    </p>
                  </div>
                </div>
              ) : (
                <form
                  onSubmit={onSubmit}
                  noValidate
                  data-testid="email-capture-form"
                  className="space-y-2"
                >
                  {/* Honeypot. Hidden from sighted users and assistive tech,
                      but visible to naive bots that auto-fill every input.
                      Position-absolute (not display:none) so headless
                      browsers that skip non-rendered fields still see it. */}
                  <div
                    aria-hidden="true"
                    style={{
                      position: "absolute",
                      left: "-10000px",
                      top: "auto",
                      width: 1,
                      height: 1,
                      overflow: "hidden",
                    }}
                  >
                    <label htmlFor="email-capture-website">
                      {t("home.email_capture.honeypot_label")}
                    </label>
                    <input
                      id="email-capture-website"
                      type="text"
                      name="website"
                      tabIndex={-1}
                      autoComplete="off"
                      value={website}
                      onChange={(e) => setWebsite(e.target.value)}
                      data-testid="email-capture-honeypot"
                    />
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <label htmlFor="email-capture-input" className="sr-only">
                      {t("home.email_capture.email_label")}
                    </label>
                    <input
                      id="email-capture-input"
                      type="email"
                      inputMode="email"
                      autoComplete="email"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        if (error) setError(null);
                      }}
                      placeholder={t("home.email_capture.email_placeholder")}
                      disabled={mutation.isPending}
                      aria-invalid={error ? "true" : "false"}
                      aria-describedby={
                        error
                          ? "email-capture-error"
                          : "email-capture-helper"
                      }
                      data-testid="email-capture-input"
                      className={`flex-1 min-w-0 px-4 py-3 text-sm bg-white dark:bg-gray-950 border rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 placeholder-gray-400 dark:placeholder-gray-500 text-gray-700 dark:text-gray-200 transition-all disabled:opacity-60 ${
                        error
                          ? "border-red-300 dark:border-red-700 focus:border-red-400"
                          : "border-gray-200 dark:border-gray-700 focus:border-blue-400 dark:focus:border-blue-500"
                      }`}
                    />
                    <button
                      type="submit"
                      disabled={mutation.isPending}
                      data-testid="email-capture-submit"
                      className="inline-flex items-center justify-center gap-2 px-6 py-3 text-sm font-semibold bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-700 hover:to-violet-700 text-white rounded-xl shadow-sm transition-all disabled:opacity-70 disabled:cursor-not-allowed whitespace-nowrap"
                    >
                      {mutation.isPending && (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      )}
                      {t("home.email_capture.submit")}
                    </button>
                  </div>
                  {error ? (
                    <p
                      id="email-capture-error"
                      role="alert"
                      data-testid="email-capture-error"
                      className="text-xs text-red-600 dark:text-red-400"
                    >
                      {error}
                    </p>
                  ) : (
                    <p
                      id="email-capture-helper"
                      className="text-xs text-gray-500 dark:text-gray-400"
                    >
                      {t("home.email_capture.helper")}
                    </p>
                  )}
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default EmailCaptureBar;
