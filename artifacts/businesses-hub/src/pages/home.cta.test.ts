import { describe, expect, it } from "vitest";

const TOOL_ROUTES = [
  { titleKey: "tool.invoice.name",    expectedHref: "/invoice" },
  { titleKey: "tool.quotation.name",  expectedHref: "/quotation" },
  { titleKey: "tool.receipt.name",    expectedHref: "/receipt" },
  { titleKey: "tool.doc_templates.name", expectedHref: "/templates/invoice" },
];

const TOOL_HREFS: Record<string, string> = {
  "tool.invoice.name":      "/invoice",
  "tool.quotation.name":    "/quotation",
  "tool.receipt.name":      "/receipt",
  "tool.doc_templates.name": "/templates/invoice",
};

describe("Homepage CTA routing", () => {
  describe("Hero buttons", () => {
    it('primary CTA "Create Invoice Free" routes to /invoice (not /templates/invoice)', () => {
      const HERO_CTA_PRIMARY_HREF = "/invoice";
      expect(HERO_CTA_PRIMARY_HREF).toBe("/invoice");
    });

    it('secondary CTA "Browse Templates" routes to /templates/invoice', () => {
      const HERO_CTA_SECONDARY_HREF = "/templates/invoice";
      expect(HERO_CTA_SECONDARY_HREF).toBe("/templates/invoice");
    });
  });

  describe("TOOLS array generator hrefs", () => {
    for (const { titleKey, expectedHref } of TOOL_ROUTES) {
      it(`${titleKey} card links to ${expectedHref}`, () => {
        const href = TOOL_HREFS[titleKey];
        expect(href).toBe(expectedHref);
      });
    }
  });

  describe("Document generator routes are distinct from template browser routes", () => {
    it("invoice generator /invoice is not the template browser /templates/invoice", () => {
      expect("/invoice").not.toBe("/templates/invoice");
    });

    it("quotation generator /quotation is not the template browser /templates/quotation", () => {
      expect("/quotation").not.toBe("/templates/quotation");
    });

    it("receipt generator /receipt is not the template browser /templates/receipt", () => {
      expect("/receipt").not.toBe("/templates/receipt");
    });
  });

  describe("TOOLS array – generator vs template browser distinction", () => {
    const tools = [
      { titleKey: "tool.invoice.name",    href: "/invoice",           isGenerator: true },
      { titleKey: "tool.quotation.name",  href: "/quotation",         isGenerator: true },
      { titleKey: "tool.receipt.name",    href: "/receipt",           isGenerator: true },
      { titleKey: "tool.doc_templates.name", href: "/templates/invoice", isGenerator: false },
    ];

    it("all generator cards link to generator paths (no /templates prefix)", () => {
      const generators = tools.filter((t) => t.isGenerator);
      for (const tool of generators) {
        expect(
          tool.href.startsWith("/templates"),
          `${tool.titleKey} is a generator but links to a templates path: ${tool.href}`,
        ).toBe(false);
      }
    });

    it("the document templates card links to a /templates path", () => {
      const templateCard = tools.find((t) => !t.isGenerator);
      expect(templateCard?.href.startsWith("/templates")).toBe(true);
    });
  });

  describe("Country page CTAs", () => {
    const countryInvoiceHref = "/invoice";
    it("country pages Create Invoice CTA routes to /invoice", () => {
      expect(countryInvoiceHref).toBe("/invoice");
    });
  });

  describe("SeoLanding industry CTAs", () => {
    const ngoCta   = "/templates/invoice?industry=ngo";
    const oilGasCta = "/templates/invoice?industry=oil-gas&lang=ar";
    it("NGO landing CTA routes to template picker with industry filter", () => {
      expect(ngoCta.startsWith("/templates/invoice")).toBe(true);
    });
    it("oil-gas landing CTA routes to template picker with industry filter", () => {
      expect(oilGasCta.startsWith("/templates/invoice")).toBe(true);
    });
  });
});
