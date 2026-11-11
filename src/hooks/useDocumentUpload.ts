import { useCallback, useRef, useState } from 'react';
import { mimeTypeOf, readFileAsBase64 } from '../lib/fileUtils';

// 7 MB raw = ~9.4 MB of base64, inside the API (10.5 MB) and nginx (10 MB) caps.
const MAX_FILE_SIZE = 7 * 1024 * 1024;

// Types the server-side document reader accepts. PDFs are sent as-is.
const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
  'application/pdf',
]);
const ALLOWED_TYPES_LABEL = 'PDF or a photo (JPEG, PNG, WebP or HEIC)';

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
      // HEIC photos from iPhones often arrive with an empty file.type.
      const type = mimeTypeOf(file);
      if (!ALLOWED_MIME_TYPES.has(type)) {
        onError(`Unsupported file type "${type || 'unknown'}". Please upload a ${ALLOWED_TYPES_LABEL}.`);
        return;
      }
      if (file.size > MAX_FILE_SIZE) {
        onError('File is too large. Please upload a file smaller than 7 MB.');
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
