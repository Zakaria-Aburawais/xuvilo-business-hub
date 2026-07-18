import { Link } from "wouter";
import { useLanguage } from "@/context/LanguageContext";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowRight, TrendingUp, Tag, Receipt, Globe, Package, Clock, CalendarDays, Ship, BarChart3, Repeat2, Banknote, AlertCircle, UserCheck, Truck } from "lucide-react";

const CALCULATORS = [
  { slug: "profit-margin", icon: TrendingUp, titleKey: "calc.profit_margin.name", descKey: "calc.profit_margin.desc", color: "text-blue-600", bg: "bg-blue-50 dark:bg-blue-950" },
  { slug: "discount", icon: Tag, titleKey: "calc.discount.name", descKey: "calc.discount.desc", color: "text-purple-600", bg: "bg-purple-50 dark:bg-purple-950" },
  { slug: "vat-tax", icon: Receipt, titleKey: "calc.vat.name", descKey: "calc.vat.desc", color: "text-green-600", bg: "bg-green-50 dark:bg-green-950" },
  { slug: "currency-exchange", icon: Globe, titleKey: "calc.currency.name", descKey: "calc.currency.desc", color: "text-cyan-600", bg: "bg-cyan-50 dark:bg-cyan-950" },
  { slug: "shipping-cbm", icon: Package, titleKey: "calc.cbm.name", descKey: "calc.cbm.desc", color: "text-orange-600", bg: "bg-orange-50 dark:bg-orange-950" },
  { slug: "overtime", icon: Clock, titleKey: "calc.overtime.name", descKey: "calc.overtime.desc", color: "text-yellow-600", bg: "bg-yellow-50 dark:bg-yellow-950" },
  { slug: "leave-balance", icon: CalendarDays, titleKey: "calc.leave.name", descKey: "calc.leave.desc", color: "text-pink-600", bg: "bg-pink-50 dark:bg-pink-950" },
  { slug: "import-cost",   icon: Ship,      titleKey: "calc.import_cost.name",   descKey: "calc.import_cost.desc",   color: "text-indigo-600", bg: "bg-indigo-50 dark:bg-indigo-950" },
  { slug: "break-even",    icon: BarChart3, titleKey: "calc.break_even.name",    descKey: "calc.break_even.desc",    color: "text-teal-600",   bg: "bg-teal-50 dark:bg-teal-950" },
  { slug: "markup-margin", icon: Repeat2,   titleKey: "calc.markup_margin.name", descKey: "calc.markup_margin.desc", color: "text-rose-600",   bg: "bg-rose-50 dark:bg-rose-950" },
  { slug: "loan",          icon: Banknote,  titleKey: "calc.loan.name",          descKey: "calc.loan.desc",          color: "text-emerald-600", bg: "bg-emerald-50 dark:bg-emerald-950" },
  { slug: "invoice-aging", icon: AlertCircle, titleKey: "calc.invoice_aging.name", descKey: "calc.invoice_aging.desc", color: "text-red-600",  bg: "bg-red-50 dark:bg-red-950" },
  { slug: "salary-cost",  icon: UserCheck,  titleKey: "calc.salary_cost.name",   descKey: "calc.salary_cost.desc",   color: "text-violet-600", bg: "bg-violet-50 dark:bg-violet-950" },
  { slug: "freight-cbw",  icon: Truck,      titleKey: "calc.freight_cbw.name",   descKey: "calc.freight_cbw.desc",   color: "text-amber-600",  bg: "bg-amber-50 dark:bg-amber-950" },
];

export default function CalculatorsHubPage() {
  const { t } = useLanguage();

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-12">
          <h1 className="text-3xl font-bold mb-3" data-testid="calc-hub-title">{t("calc.hub.title")}</h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">{t("calc.hub.subtitle")}</p>
          <div className="mt-3 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-primary/10 text-primary rounded-full font-medium">
              {t("calc.hub.available").replace("{n}", String(CALCULATORS.length))}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {CALCULATORS.map(({ slug, icon: Icon, titleKey, descKey, color, bg }) => (
            <Link key={slug} href={`/calculators/${slug}`}>
              <Card
                className="group cursor-pointer hover:shadow-lg hover:border-primary/30 hover:-translate-y-0.5 transition-all duration-200 h-full"
                data-testid={`calc-card-${slug}`}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center`}>
                      <Icon className={`w-5 h-5 ${color}`} />
                    </div>
                    <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                  </div>
                  <CardTitle className="text-sm font-semibold">{t(titleKey)}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-xs">{t(descKey)}</CardDescription>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </AppLayout>
  );
}
