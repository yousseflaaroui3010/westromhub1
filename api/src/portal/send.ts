// Sends a portal sign-in code through n8n (the "WF-5 Portal sign-in code"
// workflow, docs/n8n/wf5-portal-code.json), which emails it with Brevo like
// the lead pipeline's other emails. Same base URL and gateway secret as the
// lead form (N8N_LEAD_WEBHOOK_BASE, app_secret n8n_gateway_secret).

type Secret = string | (() => Promise<string | undefined>) | undefined;

export function n8nCodeSender(baseUrl: string, secret: Secret, fetchImpl: typeof fetch = fetch) {
  return async (to: { email: string; name: string | null }, code: string): Promise<void> => {
    const key = typeof secret === 'function' ? await secret() : secret;
    if (!key || key.length < 32) throw new Error('gateway secret unavailable');
    const res = await fetchImpl(`${baseUrl}/portal-code`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-WGC-Gateway': key },
      body: JSON.stringify({ email: to.email, name: to.name, code, minutes: 10 }),
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) throw new Error(`n8n answered HTTP ${res.status}`);
  };
}
