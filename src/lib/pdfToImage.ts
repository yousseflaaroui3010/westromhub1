/**
 * Converts a PDF file to a base64-encoded PNG for use with vision providers.
 *
 * Renders up to MAX_PAGES pages and stitches them vertically onto a single canvas
 * so models can read content that spans multiple pages (e.g. appraisal values on
 * page 2). Single-page documents hit a fast path with no stitching overhead.
 *
 * pdfjs-dist is dynamically imported so it only loads when a PDF is uploaded.
 */

const SCALE = 2.0;    // 2× gives vision models a sharp image to read
const MAX_PAGES = 2;  // covers virtually all Texas appraisal notices

export async function pdfPageToBase64(file: File): Promise<string> {
  const pdfjsLib = await import('pdfjs-dist');

  // Point the worker at the bundled copy Vite resolves at build time
  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url,
  ).toString();

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

  const pagesToRender = Math.min(pdf.numPages, MAX_PAGES);

  // Render each page to its own off-screen canvas to capture per-page dimensions.
  const pageCanvases: HTMLCanvasElement[] = [];
  for (let pageNum = 1; pageNum <= pagesToRender; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const viewport = page.getViewport({ scale: SCALE });
    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D context unavailable');
    await page.render({ canvasContext: ctx, viewport }).promise;
    pageCanvases.push(canvas);
  }

  // Fast path: single-page document — return directly without stitching.
  if (pageCanvases.length === 1) {
    return pageCanvases[0].toDataURL('image/png').split(',')[1];
  }

  // Multi-page: stitch pages vertically onto one master canvas so the vision
  // model sees the full document in a single image without multiple API calls.
  const masterWidth = Math.max(...pageCanvases.map(c => c.width));
  const masterHeight = pageCanvases.reduce((sum, c) => sum + c.height, 0);

  const master = document.createElement('canvas');
  master.width = masterWidth;
  master.height = masterHeight;

  const masterCtx = master.getContext('2d');
  if (!masterCtx) throw new Error('Canvas 2D context unavailable');

  let yOffset = 0;
  for (const pageCanvas of pageCanvases) {
    masterCtx.drawImage(pageCanvas, 0, yOffset);
    yOffset += pageCanvas.height;
  }

  return master.toDataURL('image/png').split(',')[1];
}
