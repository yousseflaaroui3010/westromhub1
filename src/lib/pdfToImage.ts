/**
 * Converts the first page of a PDF file to a base64-encoded PNG string.
 * pdfjs-dist is dynamically imported so it only loads when a PDF is uploaded.
 */
export async function pdfPageToBase64(file: File): Promise<string> {
  const pdfjsLib = await import('pdfjs-dist');

  // Point the worker at the bundled copy Vite resolves at build time
  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url,
  ).toString();

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const page = await pdf.getPage(1);

  // 2× scale gives the model a clearer image to read
  const viewport = page.getViewport({ scale: 2.0 });
  const canvas = document.createElement('canvas');
  canvas.height = viewport.height;
  canvas.width = viewport.width;

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context unavailable');

  await page.render({ canvasContext: ctx, viewport }).promise;

  // Return raw base64 without the data URI prefix
  return canvas.toDataURL('image/png').split(',')[1];
}
