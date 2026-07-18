import { Link } from "wouter";
import { AppLayout } from "@/components/layout/AppLayout";
import { useLanguage } from "@/context/LanguageContext";
import { FileText, FileCheck2, Receipt, Calculator, Home, Search } from "lucide-react";

export default function NotFound() {
  const { lang } = useLanguage();
  const isAR = lang === "ar";

  const popular = [
    { href: "/invoice",     label: isAR ? "إنشاء فاتورة" : "Create an invoice",   icon: FileText },
    { href: "/quotation",   label: isAR ? "إنشاء عرض سعر" : "Create a quotation", icon: FileCheck2 },
    { href: "/receipt",     label: isAR ? "إنشاء إيصال" : "Create a receipt",     icon: Receipt },
    { href: "/calculators", label: isAR ? "الحاسبات" : "Business calculators",    icon: Calculator },
  ];

  return (
    <AppLayout>
      <div className="min-h-[60vh] w-full flex items-center justify-center px-4 py-16">
        <div className="w-full max-w-2xl text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-blue-50 dark:bg-blue-950 mb-6">
            <Search className="w-10 h-10 text-blue-600 dark:text-blue-400" aria-hidden="true" />
          </div>

          <p className="text-xs font-bold tracking-[0.2em] text-blue-600 dark:text-blue-400 mb-2">404</p>
          <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-slate-100 mb-3">
            {isAR ? "لم نعثر على هذه الصفحة" : "We couldn't find that page"}
          </h1>
          <p className="text-base text-slate-600 dark:text-slate-400 mb-10 max-w-lg mx-auto">
            {isAR
              ? "ربما تم نقل الصفحة أو أن الرابط قديم. جرّب أحد الأدوات الشائعة أو ارجع إلى الصفحة الرئيسية."
              : "The page may have moved or the link is out of date. Try one of the popular tools below, or head back home."}
          </p>

          <div className={`grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8 ${isAR ? "text-right" : "text-left"}`}>
            {popular.map((p) => (
              <Link
                key={p.href}
                href={p.href}
                className="flex items-center gap-3 p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-blue-300 dark:hover:border-blue-700 hover:shadow-md transition group"
              >
                <span className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-950 flex items-center justify-center text-blue-600 dark:text-blue-400 group-hover:bg-blue-100 dark:group-hover:bg-blue-900 transition">
                  <p.icon className="w-5 h-5" />
                </span>
                <span className="text-sm font-medium text-slate-800 dark:text-slate-200">{p.label}</span>
              </Link>
            ))}
          </div>

          <Link
            href="/"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm transition"
          >
            <Home className="w-4 h-4" />
            {isAR ? "العودة إلى الصفحة الرئيسية" : "Back to home"}
          </Link>
        </div>
      </div>
    </AppLayout>
  );
}
