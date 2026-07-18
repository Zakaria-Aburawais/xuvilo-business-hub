import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { useEffect, useRef, lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HelmetProvider } from "react-helmet-async";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { LanguageProvider } from "@/context/LanguageContext";
import { ThemeProvider } from "@/context/ThemeContext";
import { TemplateProvider } from "@/context/TemplateContext";
import { TrackerProvider } from "@/context/TrackerContext";
import { InvoiceTrackProvider } from "@/context/InvoiceTrackContext";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { ConsentProvider } from "@/context/ConsentContext";
import FloatingTracker from "@/components/tracker/FloatingTracker";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import {
  isPopNavigation,
  clearPopNavigation,
  readScrollPosition,
  setPendingRestore,
} from "@/lib/scrollMemory";
import { CookieConsentBanner } from "@/components/CookieConsentBanner";
import { AnalyticsTracker } from "@/components/AnalyticsTracker";
import { getCountryBySlug } from "@/data/countries";

// ---------------------------------------------------------------------------
// Route-level code splitting.
//
// Every page below is loaded with React.lazy so each route ships as its own
// chunk and the initial bundle only contains the app shell (providers,
// router, layout primitives). This is the single biggest lever for cutting
// the JavaScript a first page view has to download + execute. A <Suspense>
// boundary around <Router /> renders a lightweight branded loader while the
// matched route's chunk is fetched.
// ---------------------------------------------------------------------------
const HomePage = lazy(() => import("@/pages/Home"));
const InvoicePage = lazy(() => import("@/pages/Invoice"));
const QuotationPage = lazy(() => import("@/pages/Quotation"));
const ReceiptPage = lazy(() => import("@/pages/Receipt"));
const CalculatorsHubPage = lazy(() => import("@/pages/CalculatorsHub"));
const PricingPage = lazy(() => import("@/pages/Pricing"));
const LoginPage = lazy(() => import("@/pages/Login"));
const SignupPage = lazy(() => import("@/pages/Signup"));
const ForgotPasswordPage = lazy(() => import("@/pages/ForgotPassword"));
const ResetPasswordPage = lazy(() => import("@/pages/ResetPassword"));
const DashboardPage = lazy(() => import("@/pages/Dashboard"));
const SettingsPage = lazy(() => import("@/pages/Settings"));
const CompanySettingsPage = lazy(() => import("@/pages/CompanySettings"));
const PrivacyPage = lazy(() => import("@/pages/Privacy"));
const TermsPage = lazy(() => import("@/pages/Terms"));
const TemplatePickerPage = lazy(() => import("@/pages/TemplatePicker"));
const ClientsPage = lazy(() => import("@/pages/Clients"));
const DocumentsPage = lazy(() => import("@/pages/Documents"));
const RfqIntelligencePage = lazy(() => import("@/pages/rfq/RfqIntelligence"));
const QuoteBuilderPage = lazy(() => import("@/pages/rfq/QuoteBuilder"));
const SuppliersPage = lazy(() => import("@/pages/rfq/Suppliers"));
const RfqHistoryPage = lazy(() => import("@/pages/rfq/RfqHistory"));

const ArabicInvoiceLanding = lazy(() =>
  import("@/pages/SeoLanding").then((m) => ({ default: m.ArabicInvoiceLanding })),
);
const ZatcaSaudiLanding = lazy(() =>
  import("@/pages/SeoLanding").then((m) => ({ default: m.ZatcaSaudiLanding })),
);
const LibyaInvoiceLanding = lazy(() =>
  import("@/pages/SeoLanding").then((m) => ({ default: m.LibyaInvoiceLanding })),
);
const NgoInvoiceLanding = lazy(() =>
  import("@/pages/SeoLanding").then((m) => ({ default: m.NgoInvoiceLanding })),
);
const OilGasInvoiceLanding = lazy(() =>
  import("@/pages/SeoLanding").then((m) => ({ default: m.OilGasInvoiceLanding })),
);
const ArabicTaxInvoiceLanding = lazy(() =>
  import("@/pages/SeoLanding").then((m) => ({ default: m.ArabicTaxInvoiceLanding })),
);
const ArabicQuotationLanding = lazy(() =>
  import("@/pages/SeoLanding").then((m) => ({ default: m.ArabicQuotationLanding })),
);

const ProfitMarginPage = lazy(() => import("@/pages/calculators/ProfitMargin"));
const DiscountPage = lazy(() => import("@/pages/calculators/Discount"));
const VATPage = lazy(() => import("@/pages/calculators/VAT"));
const CurrencyPage = lazy(() => import("@/pages/calculators/Currency"));
const ShippingCBMPage = lazy(() => import("@/pages/calculators/ShippingCBM"));
const OvertimePage = lazy(() => import("@/pages/calculators/Overtime"));
const LeaveBalancePage = lazy(() => import("@/pages/calculators/LeaveBalance"));
const ImportCostPage = lazy(() => import("@/pages/calculators/ImportCost"));
const BreakEvenPage = lazy(() => import("@/pages/calculators/BreakEven"));
const MarkupMarginPage = lazy(() => import("@/pages/calculators/MarkupMargin"));
const LoanPage = lazy(() => import("@/pages/calculators/Loan"));
const InvoiceAgingPage = lazy(() => import("@/pages/calculators/InvoiceAging"));
const SalaryCostPage = lazy(() => import("@/pages/calculators/SalaryCost"));
const FreightCBWPage = lazy(() => import("@/pages/calculators/FreightCBW"));
const StampMakerPage = lazy(() => import("@/pages/tools/StampMaker"));
const TempEmailPage = lazy(() => import("@/pages/tools/TempEmail"));
const AiWriterPage = lazy(() => import("@/pages/AiWriter"));
const TrackerPage = lazy(() => import("@/pages/tools/Tracker"));
const BusinessCardPage = lazy(() => import("@/pages/tools/BusinessCard"));
const CompanyProfilePage = lazy(() => import("@/pages/tools/CompanyProfile"));
const NotFound = lazy(() => import("@/pages/not-found"));
const CountryPage = lazy(() => import("@/pages/country/CountryPage"));
const CountriesPage = lazy(() => import("@/pages/Countries"));
const InvoiceTrackPage = lazy(() => import("@/pages/InvoiceTrack"));
const BlogPage = lazy(() => import("@/pages/Blog"));
const BlogPostPage = lazy(() => import("@/pages/BlogPost"));
const AboutPage = lazy(() => import("@/pages/About"));
const ContactPage = lazy(() => import("@/pages/Contact"));
const DisclaimerPage = lazy(() => import("@/pages/Disclaimer"));
const FAQPage = lazy(() => import("@/pages/FAQ"));
const HowItWorksPage = lazy(() => import("@/pages/HowItWorks"));
const InvoiceGuidePage = lazy(() => import("@/pages/InvoiceGuide"));
const QuotationGuidePage = lazy(() => import("@/pages/QuotationGuide"));
const ReceiptGuidePage = lazy(() => import("@/pages/ReceiptGuide"));
const BusinessCalculatorsGuidePage = lazy(() => import("@/pages/BusinessCalculatorsGuide"));
const AdminContactMessagesPage = lazy(() => import("@/pages/admin/ContactMessages"));
const AdminNewsletterSubscribersPage = lazy(() => import("@/pages/admin/Subscribers"));
const AdminTestimonialsPage = lazy(() => import("@/pages/admin/Testimonials"));
const AdminAnalyticsPage = lazy(() => import("@/pages/admin/Analytics"));
const UnsubscribePage = lazy(() => import("@/pages/Unsubscribe"));
const AuthorPage = lazy(() => import("@/pages/AuthorPage"));
const EditorialPolicyPage = lazy(() => import("@/pages/EditorialPolicy"));

/**
 * Branded full-screen loader shown while a route's chunk downloads. It mirrors
 * the inline #js-loading overlay in index.html so there is no visual flash when
 * main.tsx removes that overlay after first paint. Uses the same bouncing-logo
 * animation, bilingual caption, and reduced-motion behaviour.
 */
const PL_R1 = "M16 10 Q14 8 17 8 L23 8 Q26 8 26 11 L29 50 Q29 58 22 60 Q14 60 14 53 Q14 50 17 50 Q20 50 20 52 L20 53 L19 13 Q19 11 17 11 Z";
const PL_R2 = "M30 10 Q28 8 31 8 L37 8 Q40 8 40 11 L43 56 Q43 65 35 66 Q26 66 26 58 Q26 55 29 55 Q32 55 32 57 L32 58 L33 13 Q33 11 31 11 Z";
const PL_R3 = "M44 10 Q42 8 45 8 L51 8 Q54 8 54 11 L57 48 Q57 56 50 58 Q42 58 42 51 Q42 48 45 48 Q48 48 48 50 L48 51 L47 13 Q47 11 45 11 Z";

/* Floating-silk animation: each ribbon hangs from its top edge and sways
   gently like a strip of silk in a breeze; the SVG turbulence filter adds a
   slow cloth-like ripple. Mirrors the inline loader in index.html. */
const PL_CSS = `
.pl-r{transform-box:fill-box;transform-origin:50% 6%;will-change:transform}
@keyframes pl-sway1{
  0%,100%{transform:rotate(-2.6deg) skewX(-1.8deg) translateY(0)}
  33%{transform:rotate(2deg) skewX(2.4deg) translateY(-1.8px)}
  66%{transform:rotate(-.9deg) skewX(-2.6deg) translateY(-.7px)}
}
@keyframes pl-sway2{
  0%,100%{transform:rotate(2.3deg) skewX(1.9deg) translateY(-.9px)}
  33%{transform:rotate(-2.1deg) skewX(-2.4deg) translateY(0)}
  66%{transform:rotate(1.1deg) skewX(2.6deg) translateY(-2px)}
}
@keyframes pl-sway3{
  0%,100%{transform:rotate(-1.9deg) skewX(2.2deg) translateY(-1.4px)}
  33%{transform:rotate(2.5deg) skewX(-2deg) translateY(-.4px)}
  66%{transform:rotate(-1.2deg) skewX(1.6deg) translateY(-2.2px)}
}
@keyframes pl-float{
  0%,100%{transform:translateY(0) rotate(-1.2deg)}
  50%{transform:translateY(-7px) rotate(1.4deg)}
}
.pl-r.a1{animation:pl-sway1 4.6s ease-in-out infinite}
.pl-r.a2{animation:pl-sway2 5.6s ease-in-out -1.3s infinite}
.pl-r.a3{animation:pl-sway3 4.1s ease-in-out -2.2s infinite}
.pl-svg{animation:pl-float 6.5s ease-in-out infinite}
@keyframes pl-pulse{0%,100%{opacity:.6}50%{opacity:1}}
@media(prefers-reduced-motion:reduce){
  .pl-r.a1,.pl-r.a2,.pl-r.a3{animation:none}
  .pl-cloth{filter:none}
  .pl-svg{animation:pl-pulse 2.4s ease-in-out infinite}
}
`;

function PageLoader() {
  let caption = "Preparing your business tools\u2026";
  let dir: "rtl" | undefined;
  try {
    const stored = localStorage.getItem("bh_lang");
    if (stored === "ar" || (!stored && (navigator.language || "").toLowerCase().startsWith("ar"))) {
      caption = "\u062C\u0627\u0631\u064D \u062A\u062C\u0647\u064A\u0632 \u0623\u062F\u0648\u0627\u062A \u0623\u0639\u0645\u0627\u0644\u0643\u2026";
      dir = "rtl";
    }
  } catch (_) { /* localStorage unavailable */ }

  return (
    <div
      aria-hidden="true"
      role="presentation"
      style={{
        position: "fixed", inset: 0, zIndex: 2147483646,
        background: "linear-gradient(135deg,#ffffff 0%,#eff6ff 55%,#e0e7ff 100%)",
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        overflow: "hidden",
      }}
    >
      <style>{PL_CSS}</style>
      <svg
        className="pl-svg"
        width={110} height={110}
        viewBox="0 0 100 100"
        style={{ overflow: "visible", display: "block" }}
      >
        <defs>
          <linearGradient id="pl-g1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#1e1b4b"/>
            <stop offset="55%" stopColor="#1e40af"/>
            <stop offset="100%" stopColor="#2563eb"/>
          </linearGradient>
          <linearGradient id="pl-g2" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#2563eb"/>
            <stop offset="100%" stopColor="#60a5fa"/>
          </linearGradient>
          <linearGradient id="pl-g3" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#7dd3fc"/>
            <stop offset="100%" stopColor="#bae6fd"/>
          </linearGradient>
          <filter id="pl-silk" x="-30%" y="-30%" width="160%" height="160%">
            <feTurbulence type="fractalNoise" baseFrequency="0.012 0.05" numOctaves={2} seed={4} result="n">
              <animate attributeName="baseFrequency" dur="8s"
                       values="0.012 0.05;0.018 0.072;0.012 0.05" repeatCount="indefinite"/>
            </feTurbulence>
            <feDisplacementMap in="SourceGraphic" in2="n" scale={5}
                               xChannelSelector="R" yChannelSelector="G"/>
          </filter>
        </defs>
        <g className="pl-cloth" filter="url(#pl-silk)" transform="translate(50 50) scale(1.389) translate(-35.5 -37)">
          <g className="pl-r a1"><path d={PL_R1} fill="url(#pl-g1)"/></g>
          <g className="pl-r a2"><path d={PL_R2} fill="url(#pl-g2)"/></g>
          <g className="pl-r a3"><path d={PL_R3} fill="url(#pl-g3)"/></g>
        </g>
      </svg>
      <div style={{ marginTop: 20, textAlign: "center" }}>
        <div style={{
          fontFamily: "'Inter',system-ui,-apple-system,sans-serif",
          fontSize: 36, fontWeight: 700,
          color: "#1e40af", letterSpacing: "-.02em", lineHeight: 1.1,
        }}>Xuvilo</div>
        <div style={{
          fontFamily: "'Inter',system-ui,sans-serif",
          fontSize: 9.5, fontWeight: 500, letterSpacing: ".26em",
          color: "#6b7280", marginTop: 4, textTransform: "uppercase",
        }}>Business Hub</div>
      </div>
      <p
        dir={dir}
        style={{
          marginTop: 32,
          fontFamily: "'Inter',system-ui,-apple-system,sans-serif",
          fontSize: 12, fontWeight: 500,
          color: "#6366f1", margin: "32px 0 0",
          whiteSpace: "nowrap", userSelect: "none",
          opacity: 0.85, letterSpacing: "0.01em",
        }}
      >
        {caption}
      </p>
    </div>
  );
}

function CountryRoute({ slug }: { slug?: string }) {
  const country = getCountryBySlug(slug ?? "");
  return country ? <CountryPage country={country} /> : <NotFound />;
}

/** Permanent client-side redirect — replaces history so Back doesn't loop. */
function Redirect({ to }: { to: string }) {
  const [, navigate] = useLocation();
  useEffect(() => {
    navigate(to, { replace: true });
  }, [to, navigate]);
  return null;
}

const queryClient = new QueryClient();

function ScrollToTop() {
  const [location] = useLocation();
  useEffect(() => {
    // On back/forward navigation to /blog, let the blog page restore its
    // saved scroll position instead of forcing the window to the top.
    const skip =
      isPopNavigation() &&
      location === "/blog" &&
      readScrollPosition("/blog") !== null;
    clearPopNavigation();
    if (skip) {
      setPendingRestore("/blog");
    } else {
      window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    }
  }, [location]);
  return null;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={HomePage} />
      <Route path="/invoice" component={InvoicePage} />
      <Route path="/quotation" component={QuotationPage} />
      <Route path="/receipt" component={ReceiptPage} />
      <Route path="/templates" component={() => { const [,nav] = useLocation(); useEffect(() => { nav("/templates/invoice"); }, []); return null; }} />
      <Route path="/templates/:type" component={TemplatePickerPage} />
      <Route path="/calculators" component={CalculatorsHubPage} />
      <Route path="/calculators/profit-margin" component={ProfitMarginPage} />
      <Route path="/calculators/discount" component={DiscountPage} />
      <Route path="/calculators/vat-tax" component={VATPage} />
      <Route path="/calculators/currency-exchange" component={CurrencyPage} />
      <Route path="/calculators/shipping-cbm" component={ShippingCBMPage} />
      <Route path="/calculators/overtime" component={OvertimePage} />
      <Route path="/calculators/leave-balance" component={LeaveBalancePage} />
      <Route path="/calculators/import-cost" component={ImportCostPage} />
      <Route path="/calculators/break-even" component={BreakEvenPage} />
      <Route path="/calculators/markup-margin" component={MarkupMarginPage} />
      <Route path="/calculators/loan" component={LoanPage} />
      <Route path="/calculators/invoice-aging" component={InvoiceAgingPage} />
      <Route path="/calculators/salary-cost" component={SalaryCostPage} />
      <Route path="/calculators/freight-cbw" component={FreightCBWPage} />
      <Route path="/pricing" component={PricingPage} />
      <Route path="/login" component={LoginPage} />
      <Route path="/signup" component={SignupPage} />
      <Route path="/forgot-password" component={ForgotPasswordPage} />
      <Route path="/reset-password" component={ResetPasswordPage} />
      <Route path="/dashboard" component={DashboardPage} />
      <Route path="/documents" component={DocumentsPage} />
      <Route path="/clients" component={ClientsPage} />
      <Route path="/rfq" component={RfqIntelligencePage} />
      <Route path="/rfq/suppliers" component={SuppliersPage} />
      <Route path="/rfq/history" component={RfqHistoryPage} />
      <Route path="/rfq/quote/new" component={QuoteBuilderPage} />
      <Route path="/rfq/quote/:id" component={QuoteBuilderPage} />
      <Route path="/settings" component={SettingsPage} />
      <Route path="/settings/company" component={CompanySettingsPage} />
      <Route path="/privacy" component={PrivacyPage} />
      <Route path="/privacy-policy"><Redirect to="/privacy" /></Route>
      <Route path="/terms" component={TermsPage} />
      <Route path="/terms-of-use"><Redirect to="/terms" /></Route>
      <Route path="/about" component={AboutPage} />
      <Route path="/author/xuvilo-team" component={AuthorPage} />
      <Route path="/author/:id" component={AuthorPage} />
      <Route path="/contact" component={ContactPage} />
      <Route path="/disclaimer" component={DisclaimerPage} />
      <Route path="/editorial-policy" component={EditorialPolicyPage} />
      <Route path="/faq" component={FAQPage} />
      <Route path="/how-it-works" component={HowItWorksPage} />
      <Route path="/invoice-guide" component={InvoiceGuidePage} />
      <Route path="/quotation-guide" component={QuotationGuidePage} />
      <Route path="/receipt-guide" component={ReceiptGuidePage} />
      <Route path="/business-calculators-guide" component={BusinessCalculatorsGuidePage} />
      <Route path="/admin/contact-messages" component={AdminContactMessagesPage} />
      <Route path="/admin/newsletter-subscribers" component={AdminNewsletterSubscribersPage} />
      <Route path="/admin/testimonials" component={AdminTestimonialsPage} />
      <Route path="/admin/analytics" component={AdminAnalyticsPage} />
      <Route path="/unsubscribe" component={UnsubscribePage} />
      <Route path="/tools/stamp-maker" component={StampMakerPage} />
      <Route path="/tools/temp-email" component={TempEmailPage} />
      <Route path="/ai-writer" component={AiWriterPage} />
      <Route path="/tools/tracker" component={TrackerPage} />
      <Route path="/tools/business-card" component={BusinessCardPage} />
      <Route path="/tools/company-profile" component={CompanyProfilePage} />
      <Route path="/tracker" component={TrackerPage} />
      <Route path="/invoice/track/:id" component={InvoiceTrackPage} />

      {/* Legacy / friendly-slug redirects so old links never 404. */}
      <Route path="/document-tracker"><Redirect to="/tools/tracker" /></Route>
      <Route path="/invoice-tracker"><Redirect to="/tools/tracker" /></Route>
      <Route path="/company-profile"><Redirect to="/tools/company-profile" /></Route>
      <Route path="/business-card"><Redirect to="/tools/business-card" /></Route>
      <Route path="/stamp-maker"><Redirect to="/tools/stamp-maker" /></Route>
      <Route path="/temp-email"><Redirect to="/tools/temp-email" /></Route>
      <Route path="/calculator"><Redirect to="/calculators" /></Route>
      <Route path="/home"><Redirect to="/" /></Route>
      <Route path="/index"><Redirect to="/" /></Route>
      <Route path="/blog" component={BlogPage} />
      <Route path="/blog/:slug" component={BlogPostPage} />
      <Route path="/countries" component={CountriesPage} />

      {/* FEATURE 10 — SEO landing pages */}
      <Route path="/arabic-invoice-generator" component={ArabicInvoiceLanding} />
      <Route path="/zatca-invoice-saudi" component={ZatcaSaudiLanding} />
      <Route path="/invoice-generator-libya" component={LibyaInvoiceLanding} />
      <Route path="/ngo-invoice-template" component={NgoInvoiceLanding} />
      <Route path="/oil-gas-invoice-arabic" component={OilGasInvoiceLanding} />
      <Route path="/quotation-generator-arabic" component={ArabicQuotationLanding} />
      {/* Arabic-only canonical URL: encoded percent path also handled */}
      <Route path="/فاتورة-ضريبية" component={ArabicTaxInvoiceLanding} />
      <Route path="/%D9%81%D8%A7%D8%AA%D9%88%D8%B1%D8%A9-%D8%B6%D8%B1%D9%8A%D8%A8%D9%8A%D8%A9" component={ArabicTaxInvoiceLanding} />

      {/* FEATURE 5 — Industry template direct URLs (redirect into template picker) */}
      <Route path="/templates/oil-gas-invoice"><Redirect to="/templates/invoice?industry=oil-gas&lang=en" /></Route>
      <Route path="/templates/oil-gas-invoice-arabic"><Redirect to="/templates/invoice?industry=oil-gas&lang=ar" /></Route>
      <Route path="/templates/ngo-invoice"><Redirect to="/templates/invoice?industry=ngo&lang=en" /></Route>
      <Route path="/templates/ngo-invoice-arabic"><Redirect to="/templates/invoice?industry=ngo&lang=ar" /></Route>
      <Route path="/templates/construction-invoice"><Redirect to="/templates/invoice?industry=construction" /></Route>
      <Route path="/templates/restaurant-invoice"><Redirect to="/templates/invoice?industry=food" /></Route>
      <Route path="/templates/retail-receipt"><Redirect to="/templates/receipt?industry=retail" /></Route>
      <Route path="/templates/medical-invoice"><Redirect to="/templates/invoice?industry=medical" /></Route>

      <Route path={/^\/invoice-generator-(?<slug>[^/]+)$/}>
        {(params: Record<string, string | undefined>) => <CountryRoute slug={params?.slug} />}
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function AppInner() {
  const { user } = useAuth();
  return (
    <InvoiceTrackProvider>
    <TrackerProvider userEmail={user?.email}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <ScrollToTop />
          <AnalyticsTracker />
          <Suspense fallback={<PageLoader />}>
            <Router />
          </Suspense>
          <FloatingTracker />
          <CookieConsentBanner />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </TrackerProvider>
    </InvoiceTrackProvider>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <HelmetProvider>
        <QueryClientProvider client={queryClient}>
          <ThemeProvider>
            <LanguageProvider>
              <TemplateProvider>
                <AuthProvider>
                  <ConsentProvider>
                    <AppInner />
                  </ConsentProvider>
                </AuthProvider>
              </TemplateProvider>
            </LanguageProvider>
          </ThemeProvider>
        </QueryClientProvider>
      </HelmetProvider>
    </ErrorBoundary>
  );
}

export default App;
