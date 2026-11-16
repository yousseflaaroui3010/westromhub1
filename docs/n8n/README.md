# n8n: portal sign-in code (WF-5)

The owner portal (`/portfolio`) signs people in with a 6-digit code. The API
decides who may get one, then asks n8n to email it, like the lead pipeline's
other emails (Brevo, `BREVO_API_KEY` and `MAIL_FROM` on the n8n service).

`wf5-portal-code.json` is that workflow. It lives here because the API calls
it; the other workflows are in `wgc-lead-pipeline/n8n/workflows`.

**Installed 2026-11-16** in Westrom's n8n (main-production-bf72.up.railway.app)
as workflow `aUgppmCsVqF8UaXY`, published, webhook `d043c102d78e/portal-code`,
credential **X-WGC-Gateway** (the Header Auth credential WF-1 uses). A call
without the gateway header answers 403.

To import it again elsewhere:

1. n8n → Workflows → Import from file → `wf5-portal-code.json`.
2. Open **POST /portal-code**: Credential = the Header Auth credential WF-1 uses
   (named **X-WGC-Gateway** in Westrom's n8n). Check the path is `<hook id>/portal-code`
   with the same hook id as WF-1's `<hook id>/lead`.
3. **Publish** (top right). The API calls
   `N8N_LEAD_WEBHOOK_BASE + /portal-code` with `X-WGC-Gateway`.

Executions that succeed are not saved (`saveDataSuccessExecution: none`), so
codes do not sit in n8n's execution history.
