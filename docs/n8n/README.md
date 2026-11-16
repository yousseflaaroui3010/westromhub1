# n8n: portal sign-in code (WF-5)

The owner portal (`/portfolio`) signs people in with a 6-digit code. The API
decides who may get one, then asks n8n to email it, like the lead pipeline's
other emails (Brevo, `BREVO_API_KEY` and `MAIL_FROM` on the n8n service).

`wf5-portal-code.json` is that workflow. It lives here because the API calls
it; the other workflows are in `wgc-lead-pipeline/n8n/workflows`.

Import it once:

1. n8n → Workflows → Import from file → `wf5-portal-code.json`.
2. Open **POST /portal-code**: Credential = **WGC gateway** (the Header Auth
   credential WF-0 and WF-1 use). Check the path is `<hook id>/portal-code`
   with the same hook id as WF-1's `<hook id>/lead`.
3. **Publish** (top right). The API calls
   `N8N_LEAD_WEBHOOK_BASE + /portal-code` with `X-WGC-Gateway`.

Executions that succeed are not saved (`saveDataSuccessExecution: none`), so
codes do not sit in n8n's execution history.
