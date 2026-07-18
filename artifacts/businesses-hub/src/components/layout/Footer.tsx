import { Link } from "wouter";
import { useLanguage } from "@/context/LanguageContext";
import { useConsent } from "@/context/ConsentContext";
import { AnimatedLogo } from "@/components/AnimatedLogo";
import { CountryFlag } from "@/components/CountryFlag";


export function Footer() {
  const { t, lang } = useLanguage();
  const { reopen: reopenConsentBanner } = useConsent();
  const isAR = lang === "ar";

  return (
    <footer className="bg-white dark:bg-gray-950 border-t border-gray-200 dark:border-gray-800 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-14 pb-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">

          {/* Brand */}
          <div className="lg:col-span-1">
            <Link href="/" className="inline-flex items-center mb-4" aria-label={t("nav.brand")}>
              <AnimatedLogo showWordmark />
            </Link>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-5 leading-relaxed">
              {isAR
                ? "أدوات أعمال مجانية للمستقلين والشركات الصغيرة حول العالم."
                : "Free business tools for freelancers and SMEs around the world."}
            </p>

            {/* GCC flags */}
            <div className="flex flex-wrap gap-2 mb-5" aria-label={isAR ? "دول مجلس التعاون الخليجي" : "GCC countries"}>
              {["sa", "ae", "kw", "qa", "bh", "om"].map(code => (
                <CountryFlag key={code} code={code} size="md" lang={isAR ? "ar" : "en"} />
              ))}
            </div>

          </div>

          {/* Product */}
          <div>
            <h4 className="font-semibold text-sm text-gray-900 dark:text-white mb-4">
              {isAR ? "المنتج" : "Product"}
            </h4>
            <ul className="space-y-2.5">
              {[
                { href: "/invoice",    label: isAR ? "مولّد الفواتير" : "Invoice Generator" },
                { href: "/quotation",  label: isAR ? "عروض الأسعار" : "Quotation Generator" },
                { href: "/receipt",    label: isAR ? "الإيصالات" : "Receipt Generator" },
                { href: "/templates/invoice", label: isAR ? "القوالب" : "Templates" },
              ].map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="text-sm text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>

            <h4 className="font-semibold text-sm text-gray-900 dark:text-white mt-6 mb-4">
              {isAR ? "مولدات مجانية" : "Free Generators"}
            </h4>
            <ul className="space-y-2.5">
              {[
                { href: "/arabic-invoice-generator",   label: isAR ? "مولد الفواتير العربية" : "Arabic Invoice Generator" },
                { href: "/zatca-invoice-saudi",        label: isAR ? "فاتورة ZATCA السعودية" : "ZATCA Invoice (Saudi)" },
                { href: "/quotation-generator-arabic", label: isAR ? "عرض سعر عربي" : "Arabic Quotation Generator" },
                { href: "/ngo-invoice-template",       label: isAR ? "قالب فاتورة المنظمات" : "NGO Invoice Template" },
                { href: "/oil-gas-invoice-arabic",     label: isAR ? "فاتورة النفط والغاز" : "Oil & Gas Invoice" },
                { href: "/فاتورة-ضريبية",              label: isAR ? "فاتورة ضريبية" : "Tax Invoice (Arabic)" },
              ].map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="text-sm text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Tools */}
          <div>
            <h4 className="font-semibold text-sm text-gray-900 dark:text-white mb-4">
              {isAR ? "الأدوات" : "Tools"}
            </h4>
            <ul className="space-y-2.5">
              {[
                { href: "/calculators",         label: isAR ? "الحاسبات (14)" : "Calculators (14)" },
                { href: "/tools/stamp-maker",   label: isAR ? "صانع الأختام" : "Stamp Maker" },
                { href: "/tools/tracker",       label: isAR ? "متتبع المستندات" : "Document Tracker" },
                { href: "/tools/temp-email",    label: isAR ? "البريد المؤقت" : "Temp Email" },
                { href: "/calculators/currency-exchange", label: isAR ? "تحويل العملات" : "Currency Converter" },
              ].map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="text-sm text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Company */}
          <div>
            <h4 className="font-semibold text-sm text-gray-900 dark:text-white mb-4">
              {isAR ? "الشركة" : "Company"}
            </h4>
            <ul className="space-y-2.5">
              {[
                { href: "/",                label: isAR ? "الرئيسية" : "Home" },
                { href: "/about",           label: isAR ? "من نحن" : "About Us" },
                { href: "/how-it-works",    label: isAR ? "كيف تعمل" : "How It Works" },
                { href: "/pricing",         label: isAR ? "الأسعار" : "Pricing" },
                { href: "/blog",            label: isAR ? "المدونة" : "Blog" },
                { href: "/faq",             label: isAR ? "الأسئلة الشائعة" : "FAQ" },
                { href: "/contact",         label: isAR ? "تواصل معنا" : "Contact Us" },
              ].map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="text-sm text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>

            <h4 className="font-semibold text-sm text-gray-900 dark:text-white mt-6 mb-4">
              {isAR ? "أدلة" : "Guides"}
            </h4>
            <ul className="space-y-2.5">
              {[
                { href: "/invoice-guide",               label: isAR ? "دليل الفاتورة" : "Invoice Guide" },
                { href: "/quotation-guide",             label: isAR ? "دليل عرض السعر" : "Quotation Guide" },
                { href: "/receipt-guide",               label: isAR ? "دليل الإيصال" : "Receipt Guide" },
                { href: "/business-calculators-guide", label: isAR ? "دليل الحاسبات" : "Calculators Guide" },
              ].map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="text-sm text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>

            <h4 className="font-semibold text-sm text-gray-900 dark:text-white mt-6 mb-4">
              {isAR ? "قانوني" : "Legal"}
            </h4>
            <ul className="space-y-2.5">
              {[
                { href: "/privacy", label: isAR ? "سياسة الخصوصية" : "Privacy Policy" },
                { href: "/terms",          label: isAR ? "شروط الاستخدام" : "Terms of Use" },
                { href: "/disclaimer",     label: isAR ? "إخلاء المسؤولية" : "Disclaimer" },
              ].map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="text-sm text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>

            <div className="mt-5">
              <div className="text-xs font-medium text-gray-400 dark:text-gray-500 mb-2">
                {isAR ? "العملات المدعومة" : "Supported Currencies"}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {["SAR", "AED", "KWD", "QAR", "USD", "EUR", "+170"].map(code => (
                  <span key={code} className="text-xs px-2 py-0.5 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-full text-gray-500 dark:text-gray-400">{code}</span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-10 pt-6 border-t border-gray-100 dark:border-gray-800 flex flex-col sm:flex-row justify-between items-center gap-3">
          <span className="text-sm text-gray-400 dark:text-gray-500">
            © {new Date().getFullYear()} Xuvilo. {isAR ? "جميع الحقوق محفوظة." : "All rights reserved."}
          </span>
          <div className="flex items-center gap-4 flex-wrap justify-center">
            <Link href="/privacy" className="text-sm text-gray-400 dark:text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
              {isAR ? "الخصوصية" : "Privacy"}
            </Link>
            <Link href="/terms" className="text-sm text-gray-400 dark:text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
              {isAR ? "الشروط" : "Terms"}
            </Link>
            <Link href="/disclaimer" className="text-sm text-gray-400 dark:text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
              {isAR ? "إخلاء المسؤولية" : "Disclaimer"}
            </Link>
            <Link href="/contact" className="text-sm text-gray-400 dark:text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
              {isAR ? "تواصل" : "Contact"}
            </Link>
            <button
              type="button"
              onClick={reopenConsentBanner}
              data-testid="footer-cookie-settings"
              className="text-sm text-gray-400 dark:text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
            >
              {isAR ? "إعدادات ملفات تعريف الارتباط" : "Cookie settings"}
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
}
