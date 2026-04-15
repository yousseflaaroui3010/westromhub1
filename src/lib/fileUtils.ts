export async function readFileAsBase64(file: File): Promise<{ base64: string; mimeType: string }> {
  if (file.type === 'application/pdf') {
    const { pdfPageToBase64 } = await import('./pdfToImage');
    const base64 = await pdfPageToBase64(file);
    return { base64, mimeType: 'image/png' };
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result;
      if (typeof result !== 'string') {
        reject(new Error('Unexpected FileReader result type'));
        return;
      }
      resolve({ base64: result.split(',')[1], mimeType: file.type });
    };
    reader.onerror = () => reject(reader.error ?? new Error('FileReader error'));
    reader.readAsDataURL(file);
  });
}
