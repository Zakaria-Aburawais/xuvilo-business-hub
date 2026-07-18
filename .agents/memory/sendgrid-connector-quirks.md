---
name: SendGrid connector quirks
description: Connectors API name-filter bug and SendGrid account credit limit affecting email sends
---

# SendGrid connector quirks

## Connectors API `connector_names` filter stopped matching (July 2026)
`GET /api/v2/connection?connector_names=sendgrid` returns 0 items even when the
SendGrid connection exists and is bound to this Repl. The unfiltered list
(`/api/v2/connection?include_secrets=true`) returns it fine with `api_key` and
`from_email` in `settings`.

**Why:** platform-side filter regression/behavior change; connection re-binding
(`addIntegration` + `proposeIntegration`) does NOT fix it.

**How to apply:** credential lookups against the connectors API should fetch the
unfiltered list and select by `connector_name`. If the filter starts working
again, restoring it is preferable (avoids pulling other connections' secrets
into process memory).

## SendGrid account credit limit
SendGrid rejects sends with HTTP 401 and body error "Maximum credits exceeded"
when the account's plan credits are exhausted — it looks like an auth failure
but is a billing/quota limit. Not fixable in code; the account owner must
upgrade the plan or wait for the credit reset.

**Confirmed July 17, 2026:** `/v3/user/credits` shows `total: 0, remain: 0,
is_hard_limit: true` and `/v3/user/account` shows `type: "free"` — the account
attached to the Replit SendGrid connection has ZERO daily credits (free-trial
sending allowance ended entirely). Waiting for a daily reset will NOT help;
the owner must pick a paid/free plan with credits in the SendGrid dashboard or
connect a different account. This is why SendGrid Email Logs show zero emails.

## Domain authentication (July 18, 2026)
Authenticated domain for xuvilo.com created in SendGrid (automatic_security,
default) but NOT yet valid — the owner must add 3 CNAMEs at the DNS host
(em8507, s1._domainkey, s2._domainkey → *.u106058649.wl150.sendgrid.net).
Re-validate with `pnpm --filter @workspace/scripts run validate-sendgrid-domain`.
The connector's from_email is a gmail.com address; `SENDGRID_FROM_EMAIL`
(shared env var, set to no-reply@xuvilo.com) now overrides it even when the
API key comes from the connector. `_dmarc.xuvilo.com` exists (`v=DMARC1;
p=none;`, no rua reporting).

## Testing sends without bounces
Use `@sink.sendgrid.net` recipient addresses for E2E send tests — SendGrid's
sink domain accepts and discards mail, avoiding bounce-rate damage.

## Newsletter send-status tracking
`newsletter_subscribers` has NO send-status column; welcome-email outcomes are
recorded only in server logs (the success log line includes the SendGrid
response statusCode). The contact form's `mail_status` column is a separate,
unrelated mechanism.
