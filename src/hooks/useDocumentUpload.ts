import { useCallback, useRef, useState } from 'react';
import { readFileAsBase64 } from '../lib/fileUtils';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

// Allowlist of MIME types the vision pipeline can process.
// PDFs are converted to image/png client-side (pdfToImage.ts) — keep application/pdf here
// so drag-and-drop of PDFs passes this check before conversion.
const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
  'application/pdf',
]);
const ALLOWED_TYPES_LABEL = 'PDF, JPEG, PNG, or WebP';

interface UseDocumentUploadOptions {
  /** Whether the parent component is currently running its own async operation. */
  isAnalyzing: boolean;
  /** Called once the file has been read and base64-encoded. Handle AI extraction here. */
  onFileProcessed: (base64: string, mimeType: string) => Promise<void>;
  /** Called on any upload-level error (file too large, read failure, etc.). */
  onError: (message: string) => void;
}

interface UseDocumentUploadReturn {
  isExtracting: boolean;
  isDragging: boolean;
  setIsDragging: React.Dispatch<React.SetStateAction<boolean>>;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  handleFileChange: (e: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
  handleDrop: (e: React.DragEvent) => Promise<void>;
}

/**
 * Shared upload logic for TaxAnalysis and InsuranceAnalysis.
 * Handles: drag state, file-size guard, base64 conversion, busy guard.
 * The caller owns the AI extraction logic via onFileProcessed.
 */
export function useDocumentUpload({
  isAnalyzing,
  onFileProcessed,
  onError,
}: UseDocumentUploadOptions): UseDocumentUploadReturn {
  const [isExtracting, setIsExtracting] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFile = useCallback(
    async (file: File) => {
      if (!ALLOWED_MIME_TYPES.has(file.type)) {
        onError(`Unsupported file type "${file.type || 'unknown'}". Please upload a ${ALLOWED_TYPES_LABEL}.`);
        return;
      }
      if (file.size > MAX_FILE_SIZE) {
        onError('File is too large. Please upload a file smaller than 10 MB.');
        return;
      }
      setIsExtracting(true);
      try {
        const { base64, mimeType } = await readFileAsBase64(file);
        await onFileProcessed(base64, mimeType);
      } catch {
        onError('An error occurred while processing the file.');
      } finally {
        setIsExtracting(false);
      }
    },
    [onFileProcessed, onError],
  );

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      if (isExtracting || isAnalyzing) return;
      const file = e.target.files?.[0];
      if (file) {
        await processFile(file);
      }
      // Clear the input value so the same file can be selected again
      e.target.value = '';
    },
    [isExtracting, isAnalyzing, processFile],
  );

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      if (isExtracting || isAnalyzing) return;
      const file = e.dataTransfer.files[0];
      if (file) await processFile(file);
    },
    [isExtracting, isAnalyzing, processFile],
  );

  return { isExtracting, isDragging, setIsDragging, fileInputRef, handleFileChange, handleDrop };
}
