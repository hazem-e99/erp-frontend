/**
 * Subscription document upload constraints. MUST mirror the backend whitelist
 * in subscriptions.service.ts (ALLOWED_DOCUMENT_MIME / MAX_DOCUMENT_BYTES /
 * MAX_DOCUMENTS_PER_SUBSCRIPTION). Files are stored on Google Drive via the
 * existing Backup module's GoogleDriveStorage driver.
 */
export const ALLOWED_DOCUMENT_MIME = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // .docx
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",       // .xlsx
  "application/vnd.openxmlformats-officedocument.presentationml.presentation", // .pptx
  "image/png",
  "image/jpeg",
  "image/webp",
  "text/plain",
  "text/csv",
] as const;

export const ALLOWED_DOCUMENT_ACCEPT = ALLOWED_DOCUMENT_MIME.join(",");

export const MAX_DOCUMENT_BYTES = 20 * 1024 * 1024;
export const MAX_DOCUMENTS_PER_SUBSCRIPTION = 10;

export interface SubscriptionDocumentMeta {
  _id: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  uploadedAt: string;
}

export function isAllowedMime(mime: string): boolean {
  return (ALLOWED_DOCUMENT_MIME as readonly string[]).includes(mime);
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

