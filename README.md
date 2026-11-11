# Westrom Hub (wgcassetguide.com)

Property tax and insurance analysis tools for Texas rental owners, plus the
static rental-analysis (`/analysis`) and guarantees (`/guarantees`) pages.

## Architecture

- **Frontend**: Vite + React, served by nginx (`Dockerfile.frontend`,
  `nginx.conf.template`). nginx is also the trust boundary: it derives the real
  client IP, rate-limits per IP and proxies `/api/*` to the API.
- **API**: Hono on Node 22 (`api/`). Recommendations are templated from the
  rule engine; county property lookup; and the
  lead-form gateway in front of the n8n pipeline (`wgc-lead-pipeline` repo).
- **Document reader**: `extractor/` (Python, Docling + layout rules), a
  private service the API calls for `/api/extract-*`. No AI anywhere; see
  [`extractor/README.md`](extractor/README.md).
- **Security model and deploy steps**: [`docs/SECURITY.md`](docs/SECURITY.md).

## Run locally

```bash
cp .env.example api/.env   # no API keys needed for document reading
docker compose up --build  # http://localhost (frontend + api + extractor)
```

Without Docker: `cd api && npm install && npm run dev`, then in another shell
`npm install && npm run dev` (http://localhost:3000; Vite proxies `/api`).

## Checks

```bash
npm run lint && npm test && npm run build
cd api && npm run lint && npm test
```
