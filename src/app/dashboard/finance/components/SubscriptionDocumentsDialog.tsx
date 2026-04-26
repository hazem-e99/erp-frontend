"use client";

import { useEffect, useRef, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X, Upload, Trash2, Download, FileText, Loader2 } from "lucide-react";
import api from "@/lib/api";
import { toast$ } from "@/lib/toast";
import { Button } from "@/components/ui/button";
import {
  ALLOWED_DOCUMENT_ACCEPT,
  MAX_DOCUMENT_BYTES,
  MAX_DOCUMENTS_PER_SUBSCRIPTION,
  isAllowedMime,
  formatFileSize,
  type SubscriptionDocumentMeta,
} from "@/lib/subscription-documents";

interface Props {
  subscriptionId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type ViewerKind = "pdf" | "image" | "text" | "docx" | "unsupported";

interface ViewerState {
  kind: ViewerKind;
  blobUrl?: string;       // for pdf, image
  text?: string;          // for text/csv
  html?: string;          // for docx (mammoth output)
  message?: string;       // for unsupported
}

function viewerKindFor(mime: string): ViewerKind {
  if (mime === "application/pdf") return "pdf";
  if (mime.startsWith("image/")) return "image";
  if (mime === "text/plain" || mime === "text/csv") return "text";
  if (mime === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") return "docx";
  return "unsupported";
}

export default function SubscriptionDocumentsDialog({ subscriptionId, open, onOpenChange }: Props) {
  const [docs, setDocs] = useState<SubscriptionDocumentMeta[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selected, setSelected] = useState<SubscriptionDocumentMeta | null>(null);
  const [viewer, setViewer] = useState<ViewerState | null>(null);
  const [viewerLoading, setViewerLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const objectUrlRef = useRef<string | null>(null);
  const downloadUrlRef = useRef<string | null>(null);

  // Fetch document list when dialog opens
  useEffect(() => {
    if (!open || !subscriptionId) {
      setDocs([]);
      setSelected(null);
      setViewer(null);
      return;
    }
    setLoading(true);
    api
      .get(`/finance/subscriptions/${subscriptionId}/documents`)
      .then((res) => {
        const list = (res.data as SubscriptionDocumentMeta[]) ?? [];
        setDocs(list);
        if (list.length > 0) setSelected(list[0]);
      })
      .catch((e) => toast$.apiError(e))
      .finally(() => setLoading(false));
  }, [open, subscriptionId]);

  // Load the selected doc and prepare the appropriate viewer
  useEffect(() => {
    if (!selected || !subscriptionId) {
      setViewer(null);
      return;
    }
    let cancelled = false;
    setViewerLoading(true);

    const kind = viewerKindFor(selected.mimeType);

    api
      .get(`/finance/subscriptions/${subscriptionId}/documents/${selected._id}`, {
        responseType: "blob",
      })
      .then(async (res) => {
        if (cancelled) return;

        // Always make a download URL available so the Download button works for every type.
        const blob = new Blob([res.data], { type: selected.mimeType });
        if (downloadUrlRef.current) URL.revokeObjectURL(downloadUrlRef.current);
        downloadUrlRef.current = URL.createObjectURL(blob);

        if (objectUrlRef.current) {
          URL.revokeObjectURL(objectUrlRef.current);
          objectUrlRef.current = null;
        }

        if (kind === "pdf" || kind === "image") {
          objectUrlRef.current = URL.createObjectURL(blob);
          setViewer({ kind, blobUrl: objectUrlRef.current });
        } else if (kind === "text") {
          const text = await blob.text();
          setViewer({ kind, text });
        } else if (kind === "docx") {
          // Dynamic import keeps mammoth out of the initial bundle.
          const mammothModule: any = await import("mammoth");
          const mammoth = mammothModule.default ?? mammothModule;
          const arrayBuffer = await blob.arrayBuffer();
          const result = await mammoth.convertToHtml({ arrayBuffer });
          if (cancelled) return;
          setViewer({ kind, html: result.value });
        } else {
          setViewer({
            kind: "unsupported",
            message: "Preview is not available for this file type. Use the Download button to open it locally.",
          });
        }
      })
      .catch((e) => {
        if (cancelled) return;
        toast$.apiError(e);
        setViewer({
          kind: "unsupported",
          message: "Failed to load this document. Try downloading it instead.",
        });
      })
      .finally(() => {
        if (!cancelled) setViewerLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [selected, subscriptionId]);

  // Clean up object URLs on unmount
  useEffect(() => {
    return () => {
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
      if (downloadUrlRef.current) URL.revokeObjectURL(downloadUrlRef.current);
      objectUrlRef.current = null;
      downloadUrlRef.current = null;
    };
  }, []);

  const handleUpload = async () => {
    if (!subscriptionId) return;
    const files = fileInputRef.current?.files;
    if (!files || files.length === 0) return;

    // Client-side validation
    if (docs.length + files.length > MAX_DOCUMENTS_PER_SUBSCRIPTION) {
      toast$.error(
        `A subscription can have at most ${MAX_DOCUMENTS_PER_SUBSCRIPTION} documents.`,
        `Currently ${docs.length} attached, attempted to add ${files.length}.`,
      );
      return;
    }
    for (const f of Array.from(files)) {
      if (!isAllowedMime(f.type)) {
        toast$.error(`File type not allowed: ${f.name}`, `Type: ${f.type || "unknown"}`);
        return;
      }
      if (f.size > MAX_DOCUMENT_BYTES) {
        toast$.error(`${f.name} exceeds 20 MB`, `Size: ${formatFileSize(f.size)}`);
        return;
      }
    }

    const fd = new FormData();
    Array.from(files).forEach((f) => fd.append("files", f));

    setUploading(true);
    try {
      const res = await api.post(
        `/finance/subscriptions/${subscriptionId}/documents`,
        fd,
        { headers: { "Content-Type": "multipart/form-data" } },
      );
      const updated = (res.data?.documents as SubscriptionDocumentMeta[]) ?? [];
      setDocs(updated);
      // Select the most recently uploaded doc
      if (updated.length > 0) setSelected(updated[updated.length - 1]);
      if (fileInputRef.current) fileInputRef.current.value = "";
      toast$.success(`${res.data?.added ?? files.length} document(s) uploaded`);
    } catch (e: any) {
      toast$.apiError(e);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (doc: SubscriptionDocumentMeta) => {
    if (!subscriptionId) return;
    if (!confirm(`Delete "${doc.originalName}"? This cannot be undone.`)) return;
    try {
      await api.delete(`/finance/subscriptions/${subscriptionId}/documents/${doc._id}`);
      const remaining = docs.filter((d) => d._id !== doc._id);
      setDocs(remaining);
      if (selected?._id === doc._id) {
        setSelected(remaining[0] ?? null);
      }
      toast$.success("Document deleted");
    } catch (e: any) {
      toast$.apiError(e);
    }
  };

  const handleDownload = () => {
    if (!downloadUrlRef.current || !selected) return;
    const a = document.createElement("a");
    a.href = downloadUrlRef.current;
    a.download = selected.originalName;
    a.click();
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
        <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-5xl bg-card border border-border rounded-xl shadow-xl max-h-[92vh] flex flex-col">
          <div className="flex items-center justify-between p-5 border-b border-border">
            <Dialog.Title className="text-base font-semibold">
              Subscription Documents
              {docs.length > 0 && (
                <span className="ml-2 text-xs text-muted-foreground font-normal">
                  ({docs.length} of {MAX_DOCUMENTS_PER_SUBSCRIPTION})
                </span>
              )}
            </Dialog.Title>
            <Dialog.Close asChild>
              <Button variant="ghost" size="icon"><X className="w-4 h-4" /></Button>
            </Dialog.Close>
          </div>

          <div className="flex-1 grid grid-cols-1 md:grid-cols-[280px_1fr] min-h-0">
            {/* Sidebar — document list + uploader */}
            <div className="border-r border-border flex flex-col min-h-0">
              <div className="flex-1 overflow-y-auto p-3 space-y-1">
                {loading && (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                  </div>
                )}
                {!loading && docs.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-8 px-3">
                    No documents yet. Upload one to get started.
                  </p>
                )}
                {docs.map((d) => (
                  <div
                    key={d._id}
                    role="button"
                    tabIndex={0}
                    onClick={() => setSelected(d)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setSelected(d);
                      }
                    }}
                    className={`w-full text-left px-3 py-2 rounded-md text-xs flex items-start gap-2 transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${
                      selected?._id === d._id
                        ? "bg-primary/10 border border-primary/30"
                        : "hover:bg-muted/50 border border-transparent"
                    }`}
                  >
                    <FileText className="w-4 h-4 mt-0.5 shrink-0 text-muted-foreground" />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate" title={d.originalName}>
                        {d.originalName}
                      </div>
                      <div className="text-muted-foreground mt-0.5">
                        {formatFileSize(d.sizeBytes)}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(d);
                      }}
                      className="text-muted-foreground hover:text-destructive transition-colors"
                      aria-label="Delete document"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>

              {/* Uploader */}
              <div className="border-t border-border p-3 space-y-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept={ALLOWED_DOCUMENT_ACCEPT}
                  className="block w-full text-xs file:mr-2 file:px-2 file:py-1 file:text-xs file:rounded file:border-0 file:bg-muted file:text-foreground hover:file:bg-muted/80"
                  disabled={uploading || docs.length >= MAX_DOCUMENTS_PER_SUBSCRIPTION}
                />
                <Button
                  type="button"
                  size="sm"
                  className="w-full"
                  disabled={uploading || docs.length >= MAX_DOCUMENTS_PER_SUBSCRIPTION}
                  onClick={handleUpload}
                >
                  {uploading ? (
                    <><Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> Uploading…</>
                  ) : (
                    <><Upload className="w-3.5 h-3.5 mr-1" /> Upload</>
                  )}
                </Button>
                <p className="text-[10px] text-muted-foreground text-center">
                  Max 20 MB per file · PDF, DOCX, XLSX, PPTX, images, TXT, CSV
                </p>
              </div>
            </div>

            {/* Viewer */}
            <div className="flex flex-col min-h-0 bg-muted/20">
              {selected && (
                <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-card">
                  <div className="text-xs truncate" title={selected.originalName}>
                    <span className="font-medium">{selected.originalName}</span>
                    <span className="text-muted-foreground ml-2">
                      {formatFileSize(selected.sizeBytes)}
                    </span>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={handleDownload}
                    disabled={!downloadUrlRef.current}
                  >
                    <Download className="w-3.5 h-3.5 mr-1" /> Download
                  </Button>
                </div>
              )}
              <div className="flex-1 min-h-0 overflow-auto bg-white">
                {viewerLoading && (
                  <div className="flex items-center justify-center h-full bg-muted/20">
                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                  </div>
                )}
                {!viewerLoading && viewer?.kind === "pdf" && viewer.blobUrl && (
                  <iframe
                    src={viewer.blobUrl}
                    className="w-full h-full min-h-[60vh] border-0"
                    title={selected?.originalName ?? "PDF"}
                  />
                )}
                {!viewerLoading && viewer?.kind === "image" && viewer.blobUrl && (
                  <div className="flex items-center justify-center min-h-[60vh] p-4 bg-muted/30">
                    <img
                      src={viewer.blobUrl}
                      alt={selected?.originalName ?? "Image"}
                      className="max-w-full max-h-full object-contain"
                    />
                  </div>
                )}
                {!viewerLoading && viewer?.kind === "text" && viewer.text !== undefined && (
                  <pre className="text-xs p-4 whitespace-pre-wrap font-mono text-foreground bg-white min-h-full">
                    {viewer.text}
                  </pre>
                )}
                {!viewerLoading && viewer?.kind === "docx" && viewer.html !== undefined && (
                  <div
                    className="docx-preview p-6 prose prose-sm max-w-none bg-white text-foreground min-h-full"
                    dangerouslySetInnerHTML={{ __html: viewer.html }}
                  />
                )}
                {!viewerLoading && viewer?.kind === "unsupported" && (
                  <div className="flex flex-col items-center justify-center h-full text-center p-8 bg-muted/20 gap-3">
                    <FileText className="w-10 h-10 text-muted-foreground" />
                    <p className="text-xs text-muted-foreground max-w-xs">
                      {viewer.message ?? "Preview not available."}
                    </p>
                    <Button type="button" size="sm" onClick={handleDownload}>
                      <Download className="w-3.5 h-3.5 mr-1" /> Download to view
                    </Button>
                  </div>
                )}
                {!viewerLoading && !viewer && !loading && (
                  <div className="flex items-center justify-center h-full text-xs text-muted-foreground p-8 text-center bg-muted/20">
                    {docs.length === 0
                      ? "Upload a document to preview it here."
                      : "Select a document on the left to preview."}
                  </div>
                )}
              </div>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
