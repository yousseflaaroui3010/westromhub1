import DOMPurify from 'dompurify';

// Recommendation text is model output. The API already reduces it to these
// tags; the browser enforces the same allowlist so either layer alone is
// enough. No attributes at all: no links, images, styles or handlers.
const CONFIG = {
  ALLOWED_TAGS: ['strong', 'b', 'em', 'i', 'p', 'ul', 'ol', 'li', 'br'],
  ALLOWED_ATTR: [] as string[],
};

export function sanitizeRecommendation(html: string): string {
  return DOMPurify.sanitize(html, CONFIG);
}
