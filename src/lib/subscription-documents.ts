/**
 * Subscription document upload constraints. Files are stored on Google Drive via
 * the existing Backup module's GoogleDriveStorage driver.
 *
 * MIME-type filtering was removed — the backend now accepts any file type and
 * only enforces the size cap below.
 */
export const ALLOWED_DOCUMENT_ACCEPT = "*/*";

export const MAX_DOCUMENT_BYTES = 20 * 1024 * 1024;
export const MAX_DOCUMENTS_PER_SUBSCRIPTION = 10;

export interface SubscriptionDocumentMeta {
  _id: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  uploadedAt: string;
}

/**
 * Kept for backwards compatibility with existing callers — now always returns true
 * since MIME-type filtering has been removed.
 */
export function isAllowedMime(_mime: string): boolean {
  return true;
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

