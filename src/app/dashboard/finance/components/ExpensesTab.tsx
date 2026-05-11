"use client";
import { useEffect, useRef, useState, useMemo } from "react";
import { z } from "zod";
import api from "@/lib/api";
import { toast$, financeToast } from "@/lib/toast";
import { expenseAmountSchema, roundCents, parseFinancialInput, currencySchema, exchangeRateSchema, calculateBaseAmount, type SupportedCurrency, BASE_CURRENCY } from "@/lib/finance-validation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { PageLoader } from "@/components/ui/loading";
import * as Dialog from "@radix-ui/react-dialog";
import { Plus, Trash2, X, Paperclip, FileDown, Pencil } from "lucide-react";
import { Expense, CATEGORY_LABELS, fmtCurrency, fmtDate, CURRENCY_NAMES, type SupportedCurrency as TSupportedCurrency, FinancePeriodFilters, buildPeriodQuery } from "./finance.types";
import { FilterBar } from "@/components/finance/FilterBar";
import { exportToExcel, fmtExcelCurrency, fmtExcelDate } from "@/lib/excel-export";

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20 MB

const expenseSchema = z.object({
  amount: expenseAmountSchema,
  currency: currencySchema,
  exchangeRate: exchangeRateSchema,
  category: z.enum(["salaries", "commissions", "ads", "bank_fees", "tools", "freelancers", "other"]),
  date: z.string().min(1, "Date is required"),
  description: z.string().min(3, "Description must be at least 3 characters"),
});

const CATEGORIES = Object.keys(CATEGORY_LABELS);

interface ExpensesTabProps {
  filters: FinancePeriodFilters;
}

export default function ExpensesTab({ filters: periodFilters }: ExpensesTabProps) {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [page, setPage] = useState(1);
  const fileRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState("");
  const [pendingSalaries, setPendingSalaries] = useState<number>(0);
  const [receiptPreview, setReceiptPreview] = useState<{ url: string; name: string } | null>(null);
  const [receiptError, setReceiptError] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [existingAttachmentUrl, setExistingAttachmentUrl] = useState<string>("");
  const [stagedFile, setStagedFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string>("");
  const LIMIT = 25;
  const FILE_BASE = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api").replace(/\/api\/?$/, "");
  const periodQuery = useMemo(
    () => buildPeriodQuery(periodFilters),
    [periodFilters.preset, periodFilters.month, periodFilters.year, periodFilters.startDate, periodFilters.endDate],
  );

  const [form, setForm] = useState({
    amount: "",
    currency: BASE_CURRENCY as string,
    exchangeRate: "1",
    category: "other",
    date: new Date().toISOString().slice(0, 10),
    description: "",
  });

  const [filters, setFilters] = useState<Record<string, any>>({});

  const fetch = async () => {
    setLoading(true);
    try {
      // Pull the whole period so totals + filters work over all rows.
      // Client-side pagination is applied below.
      const res = await api.get("/finance/expenses", { params: { page: 1, limit: 5000, ...periodQuery } });
      setExpenses(res.data.data ?? []);
      setTotal(res.data.total ?? 0);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { fetch(); }, [periodQuery]);

  // Reset to page 1 whenever filters or the underlying dataset change.
  useEffect(() => { setPage(1); }, [filters, expenses]);

  // Fetch pending salaries when category is "salaries"
  useEffect(() => {
    if (form.category === "salaries") {
      api.get("/payroll/pending-expenses-amount", { params: periodQuery })
        .then(res => {
          const amount = res.data.total || 0;
          setPendingSalaries(amount);
          if (amount > 0 && !form.amount) {
            setForm(f => ({ ...f, amount: String(amount) }));
          }
        })
        .catch(e => console.error("Failed to fetch pending salaries:", e));
    }
  }, [form.category, periodQuery]);

  const setField = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  /**
   * Validates a selected file. Runs sync size check immediately and, for image
   * MIME types, performs an async decode to catch corrupted images. Stores the
   * file in `stagedFile` when valid; otherwise sets `fileError` and clears it.
   */
  const validateAndStageFile = (file: File | null) => {
    setFileError("");
    setStagedFile(null);
    setFileName("");

    if (!file) return;

    if (file.size === 0) {
      setFileError("File is empty (0 bytes). Please choose a different file.");
      if (fileRef.current) fileRef.current.value = "";
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      setFileError(`File is ${(file.size / (1024 * 1024)).toFixed(2)} MB — exceeds the 20 MB limit.`);
      if (fileRef.current) fileRef.current.value = "";
      return;
    }

    setFileName(file.name);

    // For images, verify the bytes actually decode as a valid image so we never
    // store a corrupted upload.
    if (file.type.startsWith("image/")) {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        URL.revokeObjectURL(url);
        setStagedFile(file);
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        setFileError("This image appears to be corrupted or not a valid image file.");
        setFileName("");
        setStagedFile(null);
        if (fileRef.current) fileRef.current.value = "";
      };
      img.src = url;
      return;
    }

    setStagedFile(file);
  };

  const resetForm = () => {
    setForm({
      amount: "",
      currency: BASE_CURRENCY as string,
      exchangeRate: "1",
      category: "other",
      date: new Date().toISOString().slice(0, 10),
      description: "",
    });
    setFileName("");
    setStagedFile(null);
    setFileError("");
    setExistingAttachmentUrl("");
    setEditingId(null);
    setFieldErrors({});
    if (fileRef.current) fileRef.current.value = "";
  };

  const openEdit = (exp: Expense) => {
    resetForm();
    setEditingId(exp._id);
    setForm({
      amount: String(exp.amount),
      currency: exp.currency ?? (BASE_CURRENCY as string),
      exchangeRate: String(exp.exchangeRate ?? 1),
      category: exp.category,
      date: new Date(exp.date).toISOString().slice(0, 10),
      description: exp.description ?? "",
    });
    setExistingAttachmentUrl(exp.attachmentUrl ?? "");
    setOpen(true);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();

    // Refuse to submit while there's an active file error — the user must fix it first.
    if (fileError) {
      toast$.warning(fileError);
      return;
    }

    const parsedAmount = parseFinancialInput(form.amount);
    const parsedExchangeRate = parseFinancialInput(form.exchangeRate);
    const parsed = expenseSchema.safeParse({
      ...form,
      amount: isNaN(parsedAmount) ? undefined : parsedAmount,
      exchangeRate: parsedExchangeRate,
    });
    if (!parsed.success) {
      const errs: Record<string, string> = {};
      parsed.error.issues.forEach((issue) => { errs[issue.path[0] as string] = issue.message; });
      setFieldErrors(errs);
      return;
    }
    setFieldErrors({});

    setSaving(true);
    try {
      const fd = new FormData();
      // Send normalized amount — prevents float artefacts reaching the backend
      fd.append("amount", String(roundCents(parsedAmount)));
      fd.append("currency", form.currency);
      fd.append("exchangeRate", String(Math.round(parsedExchangeRate * 10000) / 10000));
      fd.append("category", form.category);
      fd.append("date", form.date);
      fd.append("description", form.description);
      if (stagedFile) fd.append("attachment", stagedFile);

      if (editingId) {
        await api.put(`/finance/expenses/${editingId}`, fd, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        toast$.success("Expense updated");
      } else {
        await api.post("/finance/expenses", fd, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        financeToast.expenseAdded();
      }

      setOpen(false);
      resetForm();
      fetch();
    } catch (e) {
      toast$.apiError(e);
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this expense?")) return;
    try {
      await api.delete(`/finance/expenses/${id}`);
      fetch();
      financeToast.expenseDeleted();
    } catch (e) {
      toast$.apiError(e);
    }
  };

  // Filter expenses based on active filters
  const filteredExpenses = useMemo(() => {
    return expenses.filter((expense) => {
      // Category filter
      if (filters.category && expense.category !== filters.category) {
        return false;
      }

      // Date range filter (compare as UTC date strings to avoid timezone drift)
      if (filters.dateFrom && new Date(expense.date).toISOString().slice(0, 10) < filters.dateFrom) {
        return false;
      }
      if (filters.dateTo && new Date(expense.date).toISOString().slice(0, 10) > filters.dateTo) {
        return false;
      }

      // Amount range filter
      if (filters.amountMin && expense.amount < parseFloat(filters.amountMin)) {
        return false;
      }
      if (filters.amountMax && expense.amount > parseFloat(filters.amountMax)) {
        return false;
      }

      // Description filter
      if (filters.description && !expense.description.toLowerCase().includes(filters.description.toLowerCase())) {
        return false;
      }

      return true;
    });
  }, [expenses, filters]);

  const totalExpenses = useMemo(
    () => filteredExpenses.reduce((sum, expense) => sum + (expense.baseAmount ?? expense.amount ?? 0), 0),
    [filteredExpenses],
  );

  // Client-side pagination over filtered results — keeps the summary card consistent.
  const pagedExpenses = useMemo(
    () => filteredExpenses.slice((page - 1) * LIMIT, page * LIMIT),
    [filteredExpenses, page],
  );
  const filteredCount = filteredExpenses.length;

  // Export to Excel function
  const handleExport = async () => {
    await exportToExcel({
      filename: 'Expenses_Report',
      sheetName: 'Expenses',
      title: 'Expenses Report',
      columns: [
        { header: 'Currency', key: 'currency', width: 10, format: (v) => v || BASE_CURRENCY },
        { header: 'Amount (Orig)', key: 'amount', width: 15, format: fmtExcelCurrency },
        { header: 'Exchange Rate', key: 'exchangeRate', width: 15, format: (v) => (v ?? 1).toFixed(4) },
        { header: 'Amount (Base)', key: 'baseAmount', width: 15, format: (v, row) => fmtExcelCurrency(v ?? row.amount) },
        { header: 'Category', key: 'category', width: 15, format: (v) => CATEGORY_LABELS[v] || v },
        { header: 'Date', key: 'date', width: 15, format: fmtExcelDate },
        { header: 'Description', key: 'description', width: 40 },
        { header: 'Has Receipt', key: 'attachmentUrl', width: 12, format: (v) => v ? 'Yes' : 'No' },
      ],
      data: filteredExpenses,
    });
  };

  if (loading) return <PageLoader />;

  return (
    <div className="space-y-4">
      {/* Filter Bar */}
      <FilterBar
        fields={[
          {
            key: 'category',
            label: 'Category',
            type: 'select',
            options: Object.entries(CATEGORY_LABELS).map(([value, label]) => ({ label, value })),
          },
          { key: 'date', label: 'Expense Date', type: 'dateRange' },
          { key: 'amountMin', label: 'Min Amount', type: 'number', placeholder: 'Min amount...' },
          { key: 'amountMax', label: 'Max Amount', type: 'number', placeholder: 'Max amount...' },
          { key: 'description', label: 'Description', type: 'text', placeholder: 'Search description...' },
        ]}
        onFilterChange={setFilters}
        onClear={() => setFilters({})}
      />

      <Card className="bg-linear-to-br from-primary-light to-background border-primary/20">
        <CardContent className="p-4">
          <div className="text-xs text-muted-foreground">Total Expenses (Filtered)</div>
          <div className="text-2xl font-semibold text-foreground">{fmtCurrency(totalExpenses)}</div>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {filteredCount} {filteredCount === total ? 'total' : `of ${total}`} expenses
        </p>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={handleExport}
            disabled={filteredExpenses.length === 0}
          >
            <FileDown className="w-4 h-4 mr-1" />
            Export to Excel
          </Button>
          <Dialog.Root open={open} onOpenChange={(o) => { setOpen(o); if (!o) resetForm(); }}>
          <Dialog.Trigger asChild>
            <Button size="sm" onClick={() => resetForm()}><Plus className="w-4 h-4 mr-1" />Add Expense</Button>
          </Dialog.Trigger>
          <Dialog.Portal>
            <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
            <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md bg-card border border-border rounded-xl shadow-xl p-6 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-5">
                <Dialog.Title className="text-base font-semibold">{editingId ? "Edit Expense" : "Add Expense"}</Dialog.Title>
                <Dialog.Close asChild>
                  <Button variant="ghost" size="icon"><X className="w-4 h-4" /></Button>
                </Dialog.Close>
              </div>
              <form onSubmit={handleCreate} className="space-y-4">
                {/* Currency & Exchange Rate */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Currency</label>
                    <select
                      className={`w-full h-9 rounded-md border bg-background px-3 text-sm ${
                        fieldErrors.currency ? "border-destructive" : "border-input"
                      }`}
                      value={form.currency}
                      onChange={(e) => {
                        setField("currency", e.target.value);
                        // Reset exchange rate to 1 if selecting base currency
                        if (e.target.value === BASE_CURRENCY) {
                          setField("exchangeRate", "1");
                        }
                        if (e.target.value) setFieldErrors((fe) => ({ ...fe, currency: "" }));
                      }}
                    >
                      {Object.entries(CURRENCY_NAMES).map(([code, name]) => (
                        <option key={code} value={code}>{code} - {name}</option>
                      ))}
                    </select>
                    {fieldErrors.currency && <p className="text-xs text-destructive mt-1">{fieldErrors.currency}</p>}
                  </div>

                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                      Exchange Rate (to {BASE_CURRENCY})
                    </label>
                    <Input
                      type="number"
                      min="0.0001"
                      step="0.0001"
                      placeholder="1.0000"
                      value={form.exchangeRate}
                      disabled={form.currency === BASE_CURRENCY}
                      className={fieldErrors.exchangeRate ? "border-destructive" : ""}
                      onChange={(e) => {
                        setField("exchangeRate", e.target.value);
                        if (e.target.value) setFieldErrors((fe) => ({ ...fe, exchangeRate: "" }));
                      }}
                      onBlur={(e) => {
                        const n = parseFinancialInput(e.target.value);
                        if (!isNaN(n) && n > 0) {
                          // Round to 4 decimals
                          setField("exchangeRate", (Math.round(n * 10000) / 10000).toFixed(4));
                        }
                      }}
                    />
                    {fieldErrors.exchangeRate && <p className="text-xs text-destructive mt-1">{fieldErrors.exchangeRate}</p>}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Amount ({form.currency})</label>
                  <Input
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={form.amount}
                    placeholder="0.00"
                    className={fieldErrors.amount ? "border-destructive" : ""}
                    onChange={(e) => {
                      setField("amount", e.target.value);
                      if (e.target.value) setFieldErrors((fe) => ({ ...fe, amount: "" }));
                    }}
                    onBlur={(e) => {
                      const n = parseFinancialInput(e.target.value);
                      if (!isNaN(n) && n > 0) setField("amount", roundCents(n).toFixed(2));
                    }}
                  />
                  {fieldErrors.amount && <p className="text-xs text-destructive mt-1">{fieldErrors.amount}</p>}
                  {form.currency !== BASE_CURRENCY && form.amount && (() => {
                    const n = parseFinancialInput(form.amount);
                    const rate = parseFinancialInput(form.exchangeRate);
                    if (!isNaN(n) && !isNaN(rate) && n > 0 && rate > 0) {
                      return (
                        <p className="text-xs text-muted-foreground mt-1">
                          = {fmtCurrency(calculateBaseAmount(n, rate), BASE_CURRENCY)} in base currency
                        </p>
                      );
                    }
                  })()}
                  {form.category === "salaries" && pendingSalaries > 0 && (
                    <p className="text-xs text-primary mt-1">
                      💡 Auto-filled from paid payrolls: ${pendingSalaries.toLocaleString()}
                    </p>
                  )}
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Category</label>
                  <select className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm" value={form.category} onChange={(e) => setField("category", e.target.value)}>
                    {CATEGORIES.map((c) => <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Date</label>
                  <Input type="date" value={form.date} required onChange={(e) => setField("date", e.target.value)} />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Description</label>
                  <Input
                    value={form.description}
                    placeholder="What was this expense for?"
                    className={fieldErrors.description ? "border-destructive" : ""}
                    onChange={(e) => {
                      setField("description", e.target.value);
                      if (e.target.value.length >= 3) setFieldErrors((fe) => ({ ...fe, description: "" }));
                    }}
                  />
                  {fieldErrors.description && <p className="text-xs text-destructive mt-1">{fieldErrors.description}</p>}
                </div>
                {/* Attachment */}
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Attachment</label>
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    className={`flex items-center gap-2 text-xs border border-dashed rounded-md px-3 py-2 transition-colors w-full ${
                      fileError
                        ? "border-destructive text-destructive hover:border-destructive/70"
                        : "border-border text-muted-foreground hover:border-primary/50"
                    }`}
                  >
                    <Paperclip className="w-3.5 h-3.5" />
                    {fileName || (editingId && existingAttachmentUrl ? "Replace existing receipt (any file, max 20MB)" : "Upload receipt (any file, max 20MB)")}
                  </button>
                  <input
                    ref={fileRef}
                    type="file"
                    className="hidden"
                    onChange={(e) => validateAndStageFile(e.target.files?.[0] ?? null)}
                  />
                  {fileError && (
                    <p className="text-xs text-destructive mt-1">{fileError}</p>
                  )}
                  {!fileError && stagedFile && (
                    <p className="text-xs text-success mt-1">
                      ✓ {stagedFile.name} ({(stagedFile.size / 1024).toFixed(1)} KB) — ready to upload
                    </p>
                  )}
                  {!fileError && !stagedFile && editingId && existingAttachmentUrl && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Current receipt will be kept. Choose a new file to replace it.
                    </p>
                  )}
                </div>

                <div className="flex gap-3 pt-2">
                  <Dialog.Close asChild>
                    <Button type="button" variant="ghost" className="flex-1">Cancel</Button>
                  </Dialog.Close>
                  <Button type="submit" className="flex-1" disabled={saving || !!fileError}>
                    {saving ? "Saving..." : editingId ? "Save Changes" : "Add Expense"}
                  </Button>
                </div>
              </form>
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>
        </div>
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted-foreground">
                <th className="px-4 py-3 font-medium">Amount (Orig.)</th>
                <th className="px-4 py-3 font-medium">Amount (Base)</th>
                <th className="px-4 py-3 font-medium">Category</th>
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium">Description</th>
                <th className="px-4 py-3 font-medium">Receipt</th>
                <th className="px-4 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {pagedExpenses.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">No expenses recorded</td>
                </tr>
              )}
              {pagedExpenses.map((exp) => (
                <tr key={exp._id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3">
                    <div className="font-medium text-destructive">{fmtCurrency(exp.amount, exp.currency ?? BASE_CURRENCY)}</div>
                    {exp.currency && exp.currency !== BASE_CURRENCY && (
                      <div className="text-xs text-muted-foreground">@ {(exp.exchangeRate ?? 1).toFixed(4)}</div>
                    )}
                  </td>
                  <td className="px-4 py-3 font-medium text-destructive">{fmtCurrency(exp.baseAmount ?? exp.amount, BASE_CURRENCY)}</td>
                  <td className="px-4 py-3">
                    <Badge variant="secondary" className="text-xs">{CATEGORY_LABELS[exp.category] ?? exp.category}</Badge>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{fmtDate(exp.date)}</td>
                  <td className="px-4 py-3 max-w-xs truncate">{exp.description}</td>
                  <td className="px-4 py-3">
                    {exp.attachmentUrl ? (
                      <button
                        type="button"
                        onClick={() => {
                          const url = exp.attachmentUrl as string;
                          setReceiptError(false);
                          setReceiptPreview({
                            url: `${FILE_BASE}${url}`,
                            name: url.split("/").pop() ?? "receipt",
                          });
                        }}
                        className="text-primary text-xs hover:underline flex items-center gap-1"
                      >
                        <Paperclip className="w-3 h-3" /> View
                      </button>
                    ) : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="w-7 h-7 text-muted-foreground hover:text-primary"
                        onClick={() => openEdit(exp)}
                        title="Edit expense"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="w-7 h-7 text-muted-foreground hover:text-destructive"
                        onClick={() => handleDelete(exp._id)}
                        title="Delete expense"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredCount > LIMIT && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border text-sm">
            <span className="text-muted-foreground">
              {(page - 1) * LIMIT + 1}–{Math.min(page * LIMIT, filteredCount)} of {filteredCount}
            </span>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
              <Button variant="ghost" size="sm" disabled={page * LIMIT >= filteredCount} onClick={() => setPage((p) => p + 1)}>Next</Button>
            </div>
          </div>
        )}
      </Card>

      {/* Receipt preview dialog */}
      <Dialog.Root open={!!receiptPreview} onOpenChange={(o) => { if (!o) { setReceiptPreview(null); setReceiptError(false); } }}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/70 z-50" />
          <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-3xl bg-card border border-border rounded-xl shadow-xl p-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-3">
              <Dialog.Title className="text-sm font-semibold flex items-center gap-2">
                <Paperclip className="w-4 h-4" />
                {receiptPreview?.name}
              </Dialog.Title>
              <div className="flex items-center gap-2">
                {receiptPreview && !receiptError && (
                  <a
                    href={receiptPreview.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-primary hover:underline"
                  >
                    Open in new tab
                  </a>
                )}
                <Dialog.Close asChild>
                  <Button variant="ghost" size="icon"><X className="w-4 h-4" /></Button>
                </Dialog.Close>
              </div>
            </div>
            {receiptPreview && (
              receiptError ? (
                <div className="py-12 text-center space-y-2">
                  <p className="text-sm font-medium text-destructive">Receipt file no longer available</p>
                  <p className="text-xs text-muted-foreground">
                    The file was deleted from the server. The expense record still exists, but the attached receipt is missing.
                  </p>
                </div>
              ) : receiptPreview.url.toLowerCase().endsWith(".pdf") ? (
                <iframe
                  src={receiptPreview.url}
                  className="w-full h-[70vh] rounded border border-border"
                  onError={() => setReceiptError(true)}
                />
              ) : (
                <img
                  src={receiptPreview.url}
                  alt="receipt"
                  className="w-full max-h-[75vh] object-contain rounded border border-border bg-muted/20"
                  onError={() => setReceiptError(true)}
                />
              )
            )}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}
