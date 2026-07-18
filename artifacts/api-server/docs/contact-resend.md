# Resending failed contact-form emails

When SendGrid fails during a contact-form submission, the message is still
stored in `contact_messages` with `mail_status` of `failed` (both emails
failed) or `partial` (one of the two failed), and the team is alerted via the
failure webhook / logs. Until a full admin inbox UI exists, use the admin
resend endpoint below to recover.

## Endpoint

```
POST /api/admin/contact-messages/:id/resend
```

- Requires an admin auth token (`Authorization: Bearer <token>`).
- Re-sends both the visitor auto-reply and the team notification using the
  stored submission (same templates as the original send).
- Updates `mail_status` to `sent`, `partial`, or `failed` based on the result.
- If the resend also fails (fully or partially), the failure flows through
  the same `notifyContactFailure` fallback channel (structured error log +
  `CONTACT_FAILURE_WEBHOOK_URL` webhook if configured).
- Rows already marked `sent` are rejected with `409 already_sent` so the
  visitor isn't accidentally double-emailed. Pass `{"force": true}` in the
  JSON body to resend anyway.
- `pending` rows can also be resent (a crash between insert and send can
  leave a row stuck at `pending`).

## Responses

- `200` — at least one leg succeeded; body includes `mailStatus`
  (`sent` or `partial`), `userMailOk`, `teamMailOk`.
- `502` — both legs failed again (`mailStatus: "failed"`).
- `409` — row is already `sent` and `force` was not set.
- `404` — no row with that id.

## Finding failed messages

```bash
BASE="https://xuvilo.com"   # or your dev URL
ADMIN_TOKEN="..."           # admin auth token

# List failed / partial submissions
curl -s "$BASE/api/admin/contact-messages?status=failed" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq '.items[] | {id, email, subject, mailStatus}'
curl -s "$BASE/api/admin/contact-messages?status=partial" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq '.items[] | {id, email, subject, mailStatus}'
```

## Resending

```bash
ID="<message id from the list above>"

curl -s -X POST "$BASE/api/admin/contact-messages/$ID/resend" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" | jq

# Force a resend even if the row is already marked "sent"
curl -s -X POST "$BASE/api/admin/contact-messages/$ID/resend" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"force": true}' | jq
```

## Bulk retry helper

```bash
# Retry every currently-failed submission
for ID in $(curl -s "$BASE/api/admin/contact-messages?status=failed" \
    -H "Authorization: Bearer $ADMIN_TOKEN" | jq -r '.items[].id'); do
  echo "Resending $ID"
  curl -s -X POST "$BASE/api/admin/contact-messages/$ID/resend" \
    -H "Authorization: Bearer $ADMIN_TOKEN" \
    -H "Content-Type: application/json" | jq -c '{id, mailStatus, userMailOk, teamMailOk}'
done
```
