import { Router, type IRouter } from "express";
import { requireRole } from "../lib/auth";
import { rateLimit } from "../lib/rateLimit";
import { getGa4Config, runGa4Report } from "../lib/ga4Analytics";

/**
 * Admin analytics dashboard proxy.
 *
 * Pulls top-line counts for the documented custom GA4 event catalogue
 * (see businesses-hub src/lib/analytics.ts JSDoc) from the GA4 Data API,
 * server-side, so the property id and service-account key never reach
 * the browser.
 *
 * Event names must mirror the catalogue exactly:
 *   pdf_download, stamp_export, business_card_export,
 *   ai_writer_generated, signup_completed
 */

const CATALOGUE_EVENTS = [
  "pdf_download",
  "stamp_export",
  "business_card_export",
  "ai_writer_generated",
  "signup_completed",
] as const;

type RangeKey = "week" | "month";

const RANGE_TO_START: Record<RangeKey, string> = {
  week: "7daysAgo",
  month: "30daysAgo",
};

interface BreakdownRow {
  value: string;
  count: number;
}

interface AnalyticsResponse {
  configured: boolean;
  generatedAt: string;
  range: RangeKey;
  totals: Array<{ event: string; count: number }>;
  breakdowns: {
    pdfDownloadsByTool: BreakdownRow[];
    aiWriterByPurpose: BreakdownRow[];
    signupsByLanguage: BreakdownRow[];
  };
  breakdownErrors: string[];
  error?: string;
}

function emptyResponse(range: RangeKey, error?: string): AnalyticsResponse {
  return {
    configured: false,
    generatedAt: new Date().toISOString(),
    range,
    totals: CATALOGUE_EVENTS.map((event) => ({ event, count: 0 })),
    breakdowns: {
      pdfDownloadsByTool: [],
      aiWriterByPurpose: [],
      signupsByLanguage: [],
    },
    breakdownErrors: [],
    ...(error ? { error } : {}),
  };
}

function eventNameFilter(eventName: string): unknown {
  return {
    filter: {
      fieldName: "eventName",
      stringFilter: { matchType: "EXACT", value: eventName },
    },
  };
}

const router: IRouter = Router();

router.get(
  "/admin/analytics",
  rateLimit({ windowMs: 60_000, max: 30, prefix: "admin:analytics" }),
  requireRole("admin"),
  async (req, res) => {
    const range: RangeKey = req.query.range === "month" ? "month" : "week";
    const config = getGa4Config();
    if (!config) {
      // Graceful degradation: GA4 isn't configured. Return a 200 with
      // configured:false so the dashboard can show setup guidance.
      res.json(emptyResponse(range));
      return;
    }

    const dateRanges = [{ startDate: RANGE_TO_START[range], endDate: "today" }];

    let totals: AnalyticsResponse["totals"];
    try {
      const rows = await runGa4Report(config, {
        dateRanges,
        dimensions: [{ name: "eventName" }],
        metrics: [{ name: "eventCount" }],
        dimensionFilter: {
          filter: {
            fieldName: "eventName",
            inListFilter: { values: [...CATALOGUE_EVENTS] },
          },
        },
        limit: "50",
      });
      const byName = new Map<string, number>();
      for (const row of rows) {
        const name = row.dimensionValues[0]?.value ?? "";
        const count = Number(row.metricValues[0]?.value ?? 0);
        if (Number.isFinite(count)) byName.set(name, count);
      }
      totals = CATALOGUE_EVENTS.map((event) => ({
        event,
        count: byName.get(event) ?? 0,
      }));
    } catch (err) {
      req.log.error({ err }, "GA4 totals report failed");
      const resp = emptyResponse(range, "ga4_request_failed");
      resp.configured = true;
      res.status(502).json(resp);
      return;
    }

    // Breakdowns use event-scoped custom dimensions, which require manual
    // registration in the GA4 admin UI. If a dimension isn't registered the
    // API returns 400 — degrade per-breakdown instead of failing the page.
    const breakdownErrors: string[] = [];

    async function breakdown(
      label: string,
      dimensionName: string,
      eventName: string,
    ): Promise<BreakdownRow[]> {
      try {
        const rows = await runGa4Report(config!, {
          dateRanges,
          dimensions: [{ name: dimensionName }],
          metrics: [{ name: "eventCount" }],
          dimensionFilter: eventNameFilter(eventName),
          limit: "25",
        });
        return rows
          .map((row) => ({
            value: row.dimensionValues[0]?.value ?? "(not set)",
            count: Number(row.metricValues[0]?.value ?? 0),
          }))
          .filter((r) => Number.isFinite(r.count))
          .sort((a, b) => b.count - a.count);
      } catch (err) {
        req.log.warn({ err, label }, "GA4 breakdown report failed");
        breakdownErrors.push(label);
        return [];
      }
    }

    const [pdfDownloadsByTool, aiWriterByPurpose, signupsByLanguage] =
      await Promise.all([
        breakdown("pdfDownloadsByTool", "customEvent:tool", "pdf_download"),
        breakdown("aiWriterByPurpose", "customEvent:purpose", "ai_writer_generated"),
        breakdown("signupsByLanguage", "customEvent:language", "signup_completed"),
      ]);

    const response: AnalyticsResponse = {
      configured: true,
      generatedAt: new Date().toISOString(),
      range,
      totals,
      breakdowns: { pdfDownloadsByTool, aiWriterByPurpose, signupsByLanguage },
      breakdownErrors,
    };
    res.json(response);
  },
);

export default router;
