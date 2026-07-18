import { Helmet } from "react-helmet-async";
import { useLanguage } from "@/context/LanguageContext";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Link, useLocation } from "wouter";
import { ArrowLeft, Calculator } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SEOHead } from "@/components/SEOHead";
import { getPageSEO } from "@/lib/seo-config";

interface RelatedTool {
  href: string;
  name: string;
}

interface CalculatorLayoutProps {
  title: string;
  description: string;
  children: React.ReactNode;
  result?: React.ReactNode;
  howToUse?: string[];
  formula?: React.ReactNode;
  example?: React.ReactNode;
  faq?: { q: string; a: string }[];
  relatedTools?: RelatedTool[];
}

export function CalculatorLayout({
  title,
  description,
  children,
  result,
  howToUse,
  formula,
  example,
  faq,
  relatedTools,
}: CalculatorLayoutProps) {
  const { t } = useLanguage();
  const [location] = useLocation();
  const seo = getPageSEO(location);

  return (
    <AppLayout>
      <SEOHead title={seo.title} description={seo.description} path={location.replace(/\/$/, "") || "/"} structuredData={seo.structuredData} />
      {faq && faq.length > 0 && (
        <Helmet>
          <script type="application/ld+json">
            {JSON.stringify({
              "@context": "https://schema.org",
              "@type": "FAQPage",
              mainEntity: faq.map((item) => ({
                "@type": "Question",
                name: item.q,
                acceptedAnswer: { "@type": "Answer", text: item.a },
              })),
            })}
          </script>
        </Helmet>
      )}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back */}
        <Link href="/calculators" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4" />
          {t("calc.hub.title")}
        </Link>

        <div className="flex items-center gap-3 mb-2">
          <Calculator className="w-6 h-6 text-primary" />
          <h1 className="text-2xl font-bold">{title}</h1>
        </div>
        <p className="text-muted-foreground mb-8">{description}</p>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Input */}
          <div className="space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">{title}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {children}
              </CardContent>
            </Card>
          </div>

          {/* Result */}
          <div className="space-y-4">
            {result && (
              <Card className="border-primary/20 bg-primary/5">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base text-primary">{t("calc.result")}</CardTitle>
                </CardHeader>
                <CardContent>
                  {result}
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Formula, example, FAQ */}
        <div className="mt-10 space-y-8">
          {howToUse && howToUse.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold mb-3">{t("calc.how_to_use")}</h2>
              <ol className="list-decimal ms-5 space-y-1.5 text-sm text-muted-foreground" data-testid="how-to-use-list">
                {howToUse.map((step, i) => (
                  <li key={i}>{step}</li>
                ))}
              </ol>
            </div>
          )}
          {formula && (
            <div>
              <h2 className="text-lg font-semibold mb-3">{t("calc.formula")}</h2>
              <div className="prose prose-sm max-w-none text-muted-foreground">{formula}</div>
            </div>
          )}
          {example && (
            <div>
              <h2 className="text-lg font-semibold mb-3">{t("calc.example")}</h2>
              <div className="prose prose-sm max-w-none text-muted-foreground">{example}</div>
            </div>
          )}
          {faq && faq.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold mb-4">{t("calc.faq")}</h2>
              <div className="space-y-4">
                {faq.map((item, i) => (
                  <div key={i} className="border-b border-border pb-4">
                    <h3 className="font-medium mb-1">{item.q}</h3>
                    <p className="text-sm text-muted-foreground">{item.a}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
          {relatedTools && relatedTools.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold mb-4">{t("calc.related")}</h2>
              <div className="flex flex-wrap gap-2">
                {relatedTools.map((tool) => (
                  <Link key={tool.href} href={tool.href}>
                    <Button variant="outline" size="sm">{tool.name}</Button>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
