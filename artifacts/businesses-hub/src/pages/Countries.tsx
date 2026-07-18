import { Link } from "wouter";
import { AppLayout } from "@/components/layout/AppLayout";
import { SEOHead } from "@/components/SEOHead";
import { countries, TIER_LABELS } from "@/data/countries";

export default function CountriesPage() {
  const tiers = [1, 2, 3] as const;

  return (
    <AppLayout>
      <SEOHead
        title="Invoice Generator by Country — 55+ Countries | Xuvilo"
        description="Free invoice generators for 55+ countries with local currency, VAT/tax rates, and compliance notes. Arabic, English, and more. Instant PDF export."
        path="/countries"
      />

      {/* Hero */}
      <section className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-900 dark:to-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-6xl mx-auto px-4 py-14 text-center">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 dark:text-white mb-3">
            Invoice Generator by Country
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto mb-6">
            Professional invoice generators pre-configured for {countries.length}+ countries — correct currency, local tax rate, Arabic &amp; English support.
          </p>
          <div className="flex justify-center gap-4 text-sm text-gray-500 dark:text-gray-400">
            <span>✓ {countries.length} countries</span>
            <span>✓ Local currencies &amp; VAT</span>
            <span>✓ Free PDF export</span>
            <span>✓ No sign-up required</span>
          </div>
        </div>
      </section>

      {/* Country grid by tier */}
      <div className="max-w-6xl mx-auto px-4 py-12 space-y-14">
        {tiers.map((tier) => {
          const tierCountries = countries.filter((c) => c.tier === tier);
          return (
            <section key={tier}>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-3">
                <span className="bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 text-xs font-bold px-2.5 py-1 rounded-full uppercase">
                  Tier {tier}
                </span>
                {TIER_LABELS[tier]}
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {tierCountries.map((country) => (
                  <Link
                    key={country.slug}
                    href={`/invoice-generator-${country.slug}`}
                    className="group flex items-center gap-4 p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl hover:border-blue-400 dark:hover:border-blue-500 hover:shadow-md transition-all"
                  >
                    <span className="text-3xl flex-shrink-0">{country.flag}</span>
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 text-sm truncate">
                        {country.nameEn}
                      </div>
                      {country.nameAr && (
                        <div className="text-gray-400 dark:text-gray-500 text-xs" dir="rtl">{country.nameAr}</div>
                      )}
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs font-mono text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-1.5 py-0.5 rounded">
                          {country.currency}
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {country.vatRate > 0 ? `${country.vatRate}% ${country.vatName}` : country.vatName}
                        </span>
                        {country.zatcaCompliant && (
                          <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">ZATCA</span>
                        )}
                      </div>
                    </div>
                    <span className="text-gray-400 group-hover:text-blue-500 flex-shrink-0">→</span>
                  </Link>
                ))}
              </div>
            </section>
          );
        })}
      </div>

      {/* Bottom CTA */}
      <section className="bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
        <div className="max-w-4xl mx-auto px-4 py-12 text-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
            Don't see your country?
          </h2>
          <p className="text-gray-600 dark:text-gray-300 mb-6">
            The main invoice generator supports 176+ currencies and works for any country worldwide.
          </p>
          <Link
            href="/invoice"
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 py-3 rounded-xl transition-colors"
          >
            Open Invoice Generator →
          </Link>
        </div>
      </section>
    </AppLayout>
  );
}
