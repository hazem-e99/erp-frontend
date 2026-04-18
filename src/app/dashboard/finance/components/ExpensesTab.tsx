"use client";
import { useEffect, useRef, useState, useMemo } from "react";
import { z } from "zod";
import api from "@/lib/api";
import { toast$, financeToast } from "@/lib/toast";
import { expenseAmountSchema, roundCents, parseFinancialInput } from "@/lib/finance-validation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { PageLoader } from "@/components/ui/loading";
import * as Dialog from "@radix-ui/react-dialog";
import { Plus, Trash2, X, Paperclip, FileDown } from "lucide-react";
import { Expense, CATEGORY_LABELS, fmtCurrency, fmtDate } from "./finance.types";
import { FilterBar } from "@/components/finance/FilterBar";
import { exportToExcel, fmtExcelCurrency, fmtExcelDate } from "@/lib/excel-export";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

const expenseSchema = z.object({
  amount: expenseAmountSchema,
  category: z.enum(["salaries", "ads", "bank_fees", "tools", "freelancers", "other"]),
  date: z.string().min(1, "Date is required"),
  description: z.string().min(3, "Description must be at least 3 characters"),
});

const CATEGORIES = Object.keys(CATEGORY_LABELS);

export default function ExpensesTab() {
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
  const LIMIT = 25;

  const [form, setForm] = useState({
    amount: "",
    category: "other",
    date: new Date().toISOString().slice(0, 10),
    description: "",
  });

  const [filters, setFilters] = useState<Record<string, any>>({});

  const fetch = async () => {
    setLoading(true);
    try {
      const res = await api.get("/finance/expenses", { params: { page, limit: LIMIT } });
      setExpenses(res.data.data ?? []);
      setTotal(res.data.total ?? 0);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { fetch(); }, [page]);

  // Fetch pending salaries when category is "salaries"
  useEffect(() => {
    if (form.category === "salaries") {
      api.get("/payroll/pending-expenses-amount")
        .then(res => {
          const amount = res.data.total || 0;
          setPendingSalaries(amount);
          if (amount > 0 && !form.amount) {
            setForm(f => ({ ...f, amount: String(amount) }));
          }
        })
        .catch(e => console.error("Failed to fetch pending salaries:", e));
    }
  }, [form.category]);

  const setField = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();

    const parsedAmount = parseFinancialInput(form.amount);
    const parsed = expenseSchema.safeParse({
      ...form,
      amount: isNaN(parsedAmount) ? undefined : parsedAmount,
    });
    if (!parsed.success) {
      const errs: Record<string, string> = {};
      parsed.error.issues.forEach((issue) => { errs[issue.path[0] as string] = issue.message; });
      setFieldErrors(errs);
      return;
    }
    setFieldErrors({});

    // File validation
    const file = fileRef.current?.files?.[0];
    if (file) {
      if (!ALLOWED_TYPES.includes(file.type)) {
        toast$.warning("Only JPEG, PNG, WebP and PDF files are allowed.");
        return;
      }
      if (file.size > MAX_FILE_SIZE) {
        toast$.warning("File must be under 5 MB.");
        return;
      }
    }

    setSaving(true);
    try {
      const fd = new FormData();
      // Send normalized amount — prevents float artefacts reaching the backend
      fd.append("amount", String(roundCents(parsedAmount)));
      fd.append("category", form.category);
      fd.append("date", form.date);
      fd.append("description", form.description);
      if (file) fd.append("attachment", file);
      await api.post("/finance/expenses", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setOpen(false);
      setForm({ amount: "", category: "other", date: new Date().toISOString().slice(0, 10), description: "" });
      setFileName("");
      if (fileRef.current) fileRef.current.value = "";
      fetch();
      financeToast.expenseAdded();
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

      // Date range filter
      if (filters.dateFrom && new Date(expense.date) < new Date(filters.dateFrom)) {
        return false;
      }
      if (filters.dateTo && new Date(expense.date) > new Date(filters.dateTo)) {
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

  // Export to Excel function
  const handleExport = async () => {
    await exportToExcel({
      filename: 'Expenses_Report',
      sheetName: 'Expenses',
      title: 'Expenses Report',
      columns: [
        { header: 'Amount', key: 'amount', width: 15, format: fmtExcelCurrency },
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

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {filteredExpenses.length} {filteredExpenses.length === total ? 'total' : `of ${total}`} expenses
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
          <Dialog.Root open={open} onOpenChange={setOpen}>
          <Dialog.Trigger asChild>
            <Button size="sm"><Plus className="w-4 h-4 mr-1" />Add Expense</Button>
          </Dialog.Trigger>
          <Dialog.Portal>
            <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
            <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md bg-card border border-border rounded-xl shadow-xl p-6 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-5">
                <Dialog.Title className="text-base font-semibold">Add Expense</Dialog.Title>
                <Dialog.Close asChild>
                  <Button variant="ghost" size="icon"><X className="w-4 h-4" /></Button>
                </Dialog.Close>
              </div>
              <form onSubmit={handleCreate} className="space-y-4">
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Amount ($)</label>
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
                    className="flex items-center gap-2 text-xs text-muted-foreground border border-dashed border-border rounded-md px-3 py-2 hover:border-primary/50 transition-colors w-full"
                  >
                    <Paperclip className="w-3.5 h-3.5" />
                    {fileName || "Upload receipt (PDF / image, max 5MB)"}
                  </button>
                  <input
                    ref={fileRef}
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png,.webp"
                    className="hidden"
                    onChange={(e) => setFileName(e.target.files?.[0]?.name ?? "")}
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <Dialog.Close asChild>
                    <Button type="button" variant="ghost" className="flex-1">Cancel</Button>
                  </Dialog.Close>
                  <Button type="submit" className="flex-1" disabled={saving}>
                    {saving ? "Saving..." : "Add Expense"}
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
                <th className="px-4 py-3 font-medium">Amount</th>
                <th className="px-4 py-3 font-medium">Category</th>
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium">Description</th>
                <th className="px-4 py-3 font-medium">Receipt</th>
                <th className="px-4 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredExpenses.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">No expenses recorded</td>
                </tr>
              )}
              {filteredExpenses.map((exp) => (
                <tr key={exp._id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 font-medium text-destructive">{fmtCurrency(exp.amount)}</td>
                  <td className="px-4 py-3">
                    <Badge variant="secondary" className="text-xs">{CATEGORY_LABELS[exp.category] ?? exp.category}</Badge>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{fmtDate(exp.date)}</td>
                  <td className="px-4 py-3 max-w-xs truncate">{exp.description}</td>
                  <td className="px-4 py-3">
                    {exp.attachmentUrl ? (
                      <a
                        href={`${process.env.NEXT_PUBLIC_API_URL?.replace("/api", "")}${exp.attachmentUrl}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary text-xs hover:underline flex items-center gap-1"
                      >
                        <Paperclip className="w-3 h-3" /> View
                      </a>
                    ) : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="w-7 h-7 text-muted-foreground hover:text-destructive"
                      onClick={() => handleDelete(exp._id)}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {total > LIMIT && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border text-sm">
            <span className="text-muted-foreground">
              {(page - 1) * LIMIT + 1}–{Math.min(page * LIMIT, total)} of {total}
            </span>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
              <Button variant="ghost" size="sm" disabled={page * LIMIT >= total} onClick={() => setPage((p) => p + 1)}>Next</Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
