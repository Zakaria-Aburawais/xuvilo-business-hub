// Triggers SendGrid domain-authentication validation for xuvilo.com after the
// DNS CNAME records have been added at the domain registrar.
//
// Usage: pnpm --filter @workspace/scripts run validate-sendgrid-domain
//
// Credential resolution mirrors artifacts/api-server/src/lib/sendgrid.ts:
// SENDGRID_API_KEY env var first, then the Replit SendGrid connector.

const DOMAIN = "xuvilo.com";

interface ConnectionItem {
  connector_name?: string;
  settings?: { api_key?: string };
}

async function getApiKey(): Promise<string> {
  const direct = process.env["SENDGRID_API_KEY"];
  if (direct) return direct;

  const hostname = process.env["REPLIT_CONNECTORS_HOSTNAME"];
  const xReplitToken = process.env["REPL_IDENTITY"]
    ? "repl " + process.env["REPL_IDENTITY"]
    : process.env["WEB_REPL_RENEWAL"]
      ? "depl " + process.env["WEB_REPL_RENEWAL"]
      : null;
  if (hostname && xReplitToken) {
    const res = await fetch(
      `https://${hostname}/api/v2/connection?include_secrets=true`,
      { headers: { Accept: "application/json", "X-Replit-Token": xReplitToken } },
    );
    if (res.ok) {
      const data = (await res.json()) as { items?: ConnectionItem[] };
      const item = data.items?.find((i) => i.connector_name === "sendgrid");
      if (item?.settings?.api_key) return item.settings.api_key;
    }
  }
  throw new Error("SendGrid API key not found (env var or Replit connector).");
}

async function main(): Promise<void> {
  const apiKey = await getApiKey();
  const headers = {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
  };

  const listRes = await fetch("https://api.sendgrid.com/v3/whitelabel/domains", {
    headers,
  });
  if (!listRes.ok) {
    throw new Error(`Failed to list authenticated domains: ${listRes.status}`);
  }
  const domains = (await listRes.json()) as Array<{
    id: number;
    domain: string;
    valid: boolean;
    dns: Record<string, { host: string; data: string; type: string; valid: boolean }>;
  }>;
  const entry = domains.find((d) => d.domain === DOMAIN);
  if (!entry) {
    throw new Error(
      `No authenticated domain found for ${DOMAIN}. Create it in SendGrid first.`,
    );
  }

  console.log(`Domain ${DOMAIN} (id ${entry.id}) — currently valid: ${entry.valid}`);

  const valRes = await fetch(
    `https://api.sendgrid.com/v3/whitelabel/domains/${entry.id}/validate`,
    { method: "POST", headers },
  );
  const result = (await valRes.json()) as {
    valid?: boolean;
    validation_results?: Record<string, { valid: boolean; reason?: string | null }>;
  };
  console.log(`Validation attempt: ${result.valid ? "SUCCESS" : "NOT YET VALID"}`);
  for (const [record, r] of Object.entries(result.validation_results ?? {})) {
    console.log(`  ${record}: ${r.valid ? "OK" : `FAILED${r.reason ? ` — ${r.reason}` : ""}`}`);
  }
  if (!result.valid) {
    console.log("\nRequired DNS CNAME records:");
    for (const rec of Object.values(entry.dns)) {
      console.log(`  ${rec.host}  CNAME  ${rec.data}  (currently ${rec.valid ? "found" : "missing"})`);
    }
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
