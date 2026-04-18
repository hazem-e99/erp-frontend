"use client";
import { useEffect, useState, useMemo } from "react";
import { z } from "zod";
import api from "@/lib/api";
import { toast$, financeToast } from "@/lib/toast";
import {
  subscriptionAmountSchema,
  validateInstallmentRows,
  roundCents,
  parseFinancialInput,
  type InstallmentRowError,
  currencySchema,
  exchangeRateSchema,
  calculateBaseAmount,
  type SupportedCurrency,
  BASE_CURRENCY,
} from "@/lib/finance-validation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { PageLoader } from "@/components/ui/loading";
import * as Dialog from "@radix-ui/react-dialog";
import { Plus, X, ChevronRight, FileDown } from "lucide-react";
import {
  Subscription, PLAN_LABELS, STATUS_VARIANT, fmtCurrency, fmtDate,
  CURRENCY_NAMES, type SupportedCurrency as TSupportedCurrency,
} from "./finance.types";
import { FilterBar } from "@/components/finance/FilterBar";
import { exportToExcel, fmtExcelCurrency, fmtExcelDate } from "@/lib/excel-export";

const subscriptionSchema = z.object({
  clientId: z.string().min(1, "Please select a client"),
  planType: z.enum(["monthly", "quarterly", "semi_annual"]),
  startDate: z.string().min(1, "Start date is required"),
  installmentPlan: z.enum(["full", "split_2", "custom"]),
  description: z.string().min(3, "Description must be at least 3 characters"),
  totalPrice: subscriptionAmountSchema.optional(),
  currency: currencySchema,
  exchangeRate: exchangeRateSchema,
}).superRefine((data, ctx) => {
  if (data.installmentPlan === "full") {
    if (data.totalPrice === undefined || data.totalPrice === null) {
      ctx.addIssue({ code: "custom", path: ["totalPrice"], message: "Total price is required" });
    }
    // subscriptionAmountSchema covers > 0, ≤ 1M, 2-decimal checks already
  }
});

const PLAN_MONTHS = { monthly: 1, quarterly: 3, semi_annual: 6 };

const emptyForm = {
  clientId: "",
  clientName: "",
  planType: "monthly",
  totalPrice: "",
  currency: BASE_CURRENCY as string,
  exchangeRate: "1",
  startDate: "",
  installmentPlan: "full",
  description: "",
};

export default function SubscriptionsTab() {
  const [subs, setSubs] = useState<Subscription[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [cancelId, setCancelId] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ ...emptyForm });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [rowErrors, setRowErrors] = useState<Record<number, InstallmentRowError>>({});
  const [rowTotalError, setRowTotalError] = useState<string | null>(null);
  const [clients, setClients] = useState<any[]>([]);
  const [filters, setFilters] = useState<Record<string, any>>({});
  // Per-installment rows: each has amount + dueDate (used for split_2 and custom)
  const [installmentRows, setInstallmentRows] = useState<{ amount: string; dueDate: string }[]>(
    [{ amount: "", dueDate: "" }, { amount: "", dueDate: "" }]
  );

  const addRow = () => setInstallmentRows((r) => [...r, { amount: "", dueDate: "" }]);
  const removeRow = (i: number) => setInstallmentRows((r) => r.filter((_, idx) => idx !== i));
  const setRowField = (i: number, field: "amount" | "dueDate", v: string) =>
    setInstallmentRows((r) => r.map((row, idx) => idx === i ? { ...row, [field]: v } : row));
  const rowsTotal = installmentRows.reduce((s, r) => s + (parseFloat(r.amount) || 0), 0);
  const showRows = form.installmentPlan === "split_2" || form.installmentPlan === "custom";

  const fetch = async () => {
    setLoading(true);
    try {
      const res = await api.get("/finance/subscriptions", { params: { limit: 50 } });
      setSubs(res.data.data ?? []);
      setTotal(res.data.total ?? 0);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => {
    fetch();
    api.get("/clients", { params: { limit: 200 } })
      .then((r) => setClients(r.data.data ?? []))
      .catch(() => {});
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();

    // Zod validation for main fields
    const rawPrice = form.totalPrice ? parseFinancialInput(form.totalPrice) : undefined;
    const rawExchangeRate = parseFinancialInput(form.exchangeRate);
    const parsed = subscriptionSchema.safeParse({
      ...form,
      totalPrice: rawPrice,
      exchangeRate: rawExchangeRate,
    });
    if (!parsed.success) {
      const errs: Record<string, string> = {};
      parsed.error.issues.forEach((issue) => { errs[issue.path[0] as string] = issue.message; });
      setFieldErrors(errs);
      return;
    }
    setFieldErrors({});

    // Installment row validation
    if (showRows) {
      const { rowErrors: rErrs, totalAmountError } = validateInstallmentRows(installmentRows);
      setRowErrors(rErrs);
      setRowTotalError(totalAmountError);
      if (Object.keys(rErrs).length > 0 || totalAmountError) return;
    } else {
      setRowErrors({});
      setRowTotalError(null);
    }

    setSaving(true);
    try {
      const payload: Record<string, any> = {
        clientId: form.clientId,
        clientName: form.clientName,
        planType: form.planType,
        currency: form.currency,
        exchangeRate: roundCents(rawExchangeRate * 100) / 100, // Round to 4 decimals
        startDate: form.startDate,
        installmentPlan: form.installmentPlan,
        description: form.description,
      };

      if (showRows) {
        payload.installmentItems = installmentRows.map((r) => ({
          // round before sending to prevent float artefacts
          amount: roundCents(parseFinancialInput(r.amount)),
          dueDate: r.dueDate,
        }));
      } else {
        payload.totalPrice = roundCents(rawPrice!);
      }

      await api.post("/finance/subscriptions", payload);
      setOpen(false);
      setForm({ ...emptyForm });
      setInstallmentRows([{ amount: "", dueDate: "" }, { amount: "", dueDate: "" }]);
      fetch();
      financeToast.subscriptionCreated();
    } catch (e: any) {
      toast$.apiError(e);
    }
    setSaving(false);
  };

  const handleCancel = async () => {
    if (!cancelId) return;
    setSaving(true);
    try {
      await api.patch(`/finance/subscriptions/${cancelId}/cancel`, { reason: cancelReason });
      setCancelId(null);
      setCancelReason("");
      fetch();
      financeToast.subscriptionCancelled();
    } catch (e: any) {
      toast$.apiError(e);
    }
    setSaving(false);
  };

  const setField = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  // Filter subscriptions based on active filters
  const filteredSubs = useMemo(() => {
    return subs.filter((sub) => {
      // Customer name filter
      if (filters.customer && !sub.clientName.toLowerCase().includes(filters.customer.toLowerCase())) {
        return false;
      }

      // Plan type filter
      if (filters.planType && sub.planType !== filters.planType) {
        return false;
      }

      // Status filter
      if (filters.status && sub.status !== filters.status) {
        return false;
      }

      // Date range filter
      if (filters.dateFrom && new Date(sub.startDate) < new Date(filters.dateFrom)) {
        return false;
      }
      if (filters.dateTo && new Date(sub.startDate) > new Date(filters.dateTo)) {
        return false;
      }

      return true;
    });
  }, [subs, filters]);

  // Export to Excel function
  const handleExport = async () => {
    await exportToExcel({
      filename: 'Subscriptions_Report',
      sheetName: 'Subscriptions',
      title: 'Subscriptions Report',
      columns: [
        { header: 'Customer', key: 'clientName', width: 20 },
        { header: 'Plan', key: 'planType', width: 15, format: (v) => PLAN_LABELS[v] || v },
        { header: 'Installments', key: 'installments', width: 15, format: (_, row) => `${row.paidInstallmentsCount || 0}/${row.totalInstallmentsCount || 0}` },
        { header: 'Currency', key: 'currency', width: 10, format: (v) => v || BASE_CURRENCY },
        { header: 'Total Price (Orig)', key: 'totalPrice', width: 18, format: fmtExcelCurrency },
        { header: 'Exchange Rate', key: 'exchangeRate', width: 15, format: (v) => (v ?? 1).toFixed(4) },
        { header: 'Total Price (Base)', key: 'baseTotalPrice', width: 18, format: (v, row) => fmtExcelCurrency(v ?? row.totalPrice) },
        { header: 'Paid Amount (Base)', key: 'paidAmount', width: 18, format: (v) => fmtExcelCurrency(v ?? 0) },
        { header: 'Remaining (Base)', key: 'remaining', width: 18, format: (_, row) => fmtExcelCurrency((row.baseTotalPrice ?? row.totalPrice) - (row.paidAmount ?? 0)) },
        { header: 'Start Date', key: 'startDate', width: 15, format: fmtExcelDate },
        { header: 'End Date', key: 'endDate', width: 15, format: fmtExcelDate },
        { header: 'Status', key: 'status', width: 12 },
      ],
      data: filteredSubs.map(s => ({
        ...s,
        installments: `${s.paidInstallmentsCount || 0}/${s.totalInstallmentsCount || 0}`,
        remaining: (s.baseTotalPrice ?? s.totalPrice) - (s.paidAmount ?? 0),
      })),
    });
  };

  if (loading) return <PageLoader />;

  return (
    <div className="space-y-4">
      {/* Filter Bar */}
      <FilterBar
        fields={[
          { key: 'customer', label: 'Customer', type: 'text', placeholder: 'Search by name...' },
          {
            key: 'planType',
            label: 'Plan Type',
            type: 'select',
            options: [
              { label: 'Monthly', value: 'monthly' },
              { label: 'Quarterly', value: 'quarterly' },
              { label: 'Semi-Annual', value: 'semi_annual' },
            ],
          },
          {
            key: 'status',
            label: 'Status',
            type: 'select',
            options: [
              { label: 'Pending', value: 'pending' },
              { label: 'Active', value: 'active' },
              { label: 'Completed', value: 'completed' },
              { label: 'Cancelled', value: 'cancelled' },
            ],
          },
          { key: 'date', label: 'Start Date', type: 'dateRange' },
        ]}
        onFilterChange={setFilters}
        onClear={() => setFilters({})}
      />

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {filteredSubs.length} {filteredSubs.length === total ? 'total' : `of ${total}`} subscriptions
        </p>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={handleExport}
            disabled={filteredSubs.length === 0}
          >
            <FileDown className="w-4 h-4 mr-1" />
            Export to Excel
          </Button>
          <Dialog.Root open={open} onOpenChange={setOpen}>
            <Dialog.Trigger asChild>
              <Button size="sm"><Plus className="w-4 h-4 mr-1" />New Subscription</Button>
            </Dialog.Trigger>
          <Dialog.Portal>
            <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
            <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-lg bg-card border border-border rounded-xl shadow-xl p-6 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-5">
                <Dialog.Title className="text-base font-semibold">New Subscription</Dialog.Title>
                <Dialog.Close asChild>
                  <Button variant="ghost" size="icon"><X className="w-4 h-4" /></Button>
                </Dialog.Close>
              </div>
              <form onSubmit={handleCreate} className="space-y-4">
                {/* Client */}
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Client</label>
                  {clients.length > 0 ? (
                    <select
                      className={`w-full h-9 rounded-md border bg-background px-3 text-sm ${
                        fieldErrors.clientId ? "border-destructive" : "border-input"
                      }`}
                      value={form.clientId}
                      onChange={(e) => {
                        const c = clients.find((x) => x._id === e.target.value);
                        setForm((f) => ({ ...f, clientId: e.target.value, clientName: c?.name ?? c?.company ?? "" }));
                        if (e.target.value) setFieldErrors((fe) => ({ ...fe, clientId: "" }));
                      }}
                    >
                      <option value="">Select client...</option>
                      {clients.map((c) => (
                        <option key={c._id} value={c._id}>{c.name ?? c.company}</option>
                      ))}
                    </select>
                  ) : (
                    <Input
                      placeholder="Client name"
                      value={form.clientName}
                      onChange={(e) => setField("clientName", e.target.value)}
                    />
                  )}
                  {fieldErrors.clientId && <p className="text-xs text-destructive mt-1">{fieldErrors.clientId}</p>}
                </div>

                {/* Plan type */}
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Plan Type</label>
                  <select
                    className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
                    value={form.planType}
                    onChange={(e) => setField("planType", e.target.value)}
                  >
                    <option value="monthly">Monthly (1 month)</option>
                    <option value="quarterly">Quarterly (3 months)</option>
                    <option value="semi_annual">Semi-Annual (6 months)</option>
                  </select>
                </div>

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

                {/* Total price — only for full payment plan */}
                {!showRows && (
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                      Total Price ({form.currency})
                    </label>
                    <Input
                      type="number"
                      min="0.01"
                      step="0.01"
                      placeholder="0.00"
                      value={form.totalPrice}
                      className={fieldErrors.totalPrice ? "border-destructive" : ""}
                      onChange={(e) => {
                        setField("totalPrice", e.target.value);
                        if (e.target.value) setFieldErrors((fe) => ({ ...fe, totalPrice: "" }));
                      }}
                      onBlur={(e) => {
                        // Normalize to 2 decimal places on blur
                        const n = parseFinancialInput(e.target.value);
                        if (!isNaN(n) && n > 0) setField("totalPrice", roundCents(n).toFixed(2));
                      }}
                    />
                    {fieldErrors.totalPrice && <p className="text-xs text-destructive mt-1">{fieldErrors.totalPrice}</p>}
                    {form.totalPrice && form.currency !== BASE_CURRENCY && (() => {
                      const n = parseFinancialInput(form.totalPrice);
                      const rate = parseFinancialInput(form.exchangeRate);
                      if (!isNaN(n) && !isNaN(rate) && n > 0 && rate > 0) {
                        return (
                          <p className="text-xs text-muted-foreground mt-1">
                            = {fmtCurrency(calculateBaseAmount(n, rate), BASE_CURRENCY)} in base currency
                          </p>
                        );
                      }
                    })()}
                  </div>
                )}

                {/* Start date */}
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Start Date</label>
                  <Input
                    type="date"
                    value={form.startDate}
                    className={fieldErrors.startDate ? "border-destructive" : ""}
                    onChange={(e) => {
                      setField("startDate", e.target.value);
                      setFieldErrors((fe) => ({ ...fe, startDate: "" }));
                    }}
                  />
                  {fieldErrors.startDate && <p className="text-xs text-destructive mt-1">{fieldErrors.startDate}</p>}
                </div>

                {/* Installment plan */}
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Payment Plan</label>
                  <select
                    className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
                    value={form.installmentPlan}
                    onChange={(e) => {
                      setField("installmentPlan", e.target.value);
                      // Reset rows when switching plan type
                      if (e.target.value === "split_2") {
                        setInstallmentRows([{ amount: "", dueDate: "" }, { amount: "", dueDate: "" }]);
                      } else if (e.target.value === "custom") {
                        setInstallmentRows([{ amount: "", dueDate: "" }, { amount: "", dueDate: "" }]);
                      }
                    }}
                  >
                    <option value="full">Full (1 payment)</option>
                    <option value="split_2">Split (2 payments)</option>
                    <option value="custom">Custom installments</option>
                  </select>
                </div>

                {/* Installment rows for split_2 and custom */}
                {showRows && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-medium text-muted-foreground">Installments</label>
                      {form.installmentPlan === "custom" && (
                        <button
                          type="button"
                          onClick={addRow}
                          disabled={installmentRows.length >= 24}
                          className="flex items-center gap-1 text-xs text-primary hover:underline disabled:opacity-40"
                        >
                          <Plus className="w-3 h-3" /> Add installment
                        </button>
                      )}
                    </div>
                    <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                      {installmentRows.map((row, i) => (
                        <div key={i} className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground w-6 text-right shrink-0">#{i + 1}</span>
                            <Input
                              type="number"
                              min="0.01"
                              step="0.01"
                              placeholder={`Amount (${form.currency})`}
                              value={row.amount}
                              className={`flex-1 ${rowErrors[i]?.amount ? "border-destructive" : ""}`}
                              onChange={(e) => {
                                setRowField(i, "amount", e.target.value);
                                if (rowErrors[i]?.amount) setRowErrors((re) => { const n = { ...re }; delete n[i]?.amount; return n; });
                              }}
                              onBlur={(e) => {
                                const n = parseFinancialInput(e.target.value);
                                if (!isNaN(n) && n > 0) setRowField(i, "amount", roundCents(n).toFixed(2));
                              }}
                            />
                            <Input
                              type="date"
                              value={row.dueDate}
                              className={`flex-1 ${rowErrors[i]?.dueDate ? "border-destructive" : ""}`}
                              onChange={(e) => {
                                setRowField(i, "dueDate", e.target.value);
                                if (rowErrors[i]?.dueDate) setRowErrors((re) => { const n = { ...re }; delete n[i]?.dueDate; return n; });
                              }}
                            />
                            {form.installmentPlan === "custom" && installmentRows.length > 2 && (
                              <button
                                type="button"
                                onClick={() => removeRow(i)}
                                className="text-muted-foreground hover:text-destructive transition-colors shrink-0"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                          {rowErrors[i]?.amount && (
                            <p className="text-xs text-destructive pl-8">{rowErrors[i].amount}</p>
                          )}
                          {rowErrors[i]?.dueDate && (
                            <p className="text-xs text-destructive pl-8">{rowErrors[i].dueDate}</p>
                          )}
                        </div>
                      ))}
                    </div>
                    {rowsTotal > 0 && (
                      <div className={`rounded-md border px-3 py-2 text-xs space-y-1 ${
                        rowTotalError
                          ? "bg-destructive/10 border-destructive/30 text-destructive"
                          : "bg-primary/10 border-primary/20"
                      }`}>
                        <div className="flex justify-between items-center">
                          <span className="text-muted-foreground">{installmentRows.length} installments</span>
                          <span className="font-semibold">
                            Total: {fmtCurrency(rowsTotal, form.currency as TSupportedCurrency)}
                          </span>
                        </div>
                        {form.currency !== BASE_CURRENCY && (() => {
                          const rate = parseFinancialInput(form.exchangeRate);
                          if (!isNaN(rate) && rate > 0) {
                            return (
                              <div className="text-right text-muted-foreground">
                                = {fmtCurrency(calculateBaseAmount(rowsTotal, rate), BASE_CURRENCY)} in base currency
                              </div>
                            );
                          }
                        })()}
                        {rowTotalError && (
                          <div className="text-destructive">{rowTotalError}</div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Description */}
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Description</label>
                  <Input
                    placeholder="Service description..."
                    value={form.description}
                    className={fieldErrors.description ? "border-destructive" : ""}
                    onChange={(e) => {
                      setField("description", e.target.value);
                      if (e.target.value.length >= 3) setFieldErrors((fe) => ({ ...fe, description: "" }));
                    }}
                  />
                  {fieldErrors.description && <p className="text-xs text-destructive mt-1">{fieldErrors.description}</p>}
                </div>

                {/* Preview */}
                {(showRows ? rowsTotal > 0 : form.totalPrice) && form.planType && (
                  <div className="rounded-lg bg-muted/50 p-3 text-xs space-y-1 text-muted-foreground">
                    {(() => {
                      const months = PLAN_MONTHS[form.planType as keyof typeof PLAN_MONTHS];
                      const total = showRows ? rowsTotal : parseFloat(form.totalPrice || "0");
                      const count = form.installmentPlan === "full" ? 1 : installmentRows.length;
                      const rate = parseFinancialInput(form.exchangeRate);
                      const baseTotal = !isNaN(rate) && rate > 0 ? calculateBaseAmount(total, rate) : total;
                      return (
                        <>
                          <p>Duration: <strong>{months} month(s)</strong></p>
                          <p>Revenue recognition: <strong>{months}</strong> × {fmtCurrency(total / months, form.currency as TSupportedCurrency)}/mo</p>
                          <p>Installments: <strong>{count}</strong></p>
                          {total > 0 && (
                            <>
                              <p>Total contract value: <strong>{fmtCurrency(total, form.currency as TSupportedCurrency)}</strong></p>
                              {form.currency !== BASE_CURRENCY && (
                                <p>Base currency: <strong>{fmtCurrency(baseTotal, BASE_CURRENCY)}</strong></p>
                              )}
                            </>
                          )}
                        </>
                      );
                    })()}
                  </div>
                )}

                <div className="flex gap-3 pt-2">
                  <Dialog.Close asChild>
                    <Button type="button" variant="ghost" className="flex-1">Cancel</Button>
                  </Dialog.Close>
                  <Button type="submit" className="flex-1" disabled={saving}>
                    {saving ? "Creating..." : "Create Subscription"}
                  </Button>
                </div>
              </form>
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>
        </div>
      </div>

      {/* Table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted-foreground">
                <th className="px-4 py-3 font-medium">Customer</th>
                <th className="px-4 py-3 font-medium">Plan</th>
                <th className="px-4 py-3 font-medium">Installments</th>
                <th className="px-4 py-3 font-medium">Total (Orig.)</th>
                <th className="px-4 py-3 font-medium">Total (Base)</th>
                <th className="px-4 py-3 font-medium">Paid</th>
                <th className="px-4 py-3 font-medium">Remaining</th>
                <th className="px-4 py-3 font-medium">Start → End</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredSubs.length === 0 && (
                <tr>
                  <td colSpan={10} className="px-4 py-8 text-center text-muted-foreground">No subscriptions yet</td>
                </tr>
              )}
              {filteredSubs.map((s) => (
                <tr key={s._id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 font-medium">{s.clientName}</td>
                  <td className="px-4 py-3 text-muted-foreground">{PLAN_LABELS[s.planType]}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-medium text-primary">
                        {s.paidInstallmentsCount ?? 0}
                      </span>
                      <span className="text-xs text-muted-foreground">/</span>
                      <span className="text-xs font-medium text-muted-foreground">
                        {s.totalInstallmentsCount ?? 0}
                      </span>
                      {(s.paidInstallmentsCount ?? 0) === (s.totalInstallmentsCount ?? 0) && (s.totalInstallmentsCount ?? 0) > 0 && (
                        <Badge variant="secondary" className="ml-1 text-[10px] h-4 px-1.5 bg-emerald-100 text-emerald-700 border-emerald-200">
                          ✓
                        </Badge>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium">{fmtCurrency(s.totalPrice, s.currency ?? BASE_CURRENCY)}</div>
                    {s.currency && s.currency !== BASE_CURRENCY && (
                      <div className="text-xs text-muted-foreground">@ {(s.exchangeRate ?? 1).toFixed(4)}</div>
                    )}
                  </td>
                  <td className="px-4 py-3 font-medium">{fmtCurrency(s.baseTotalPrice ?? s.totalPrice, BASE_CURRENCY)}</td>
                  <td className="px-4 py-3 text-success">{fmtCurrency(s.paidAmount ?? 0, BASE_CURRENCY)}</td>
                  <td className="px-4 py-3 text-warning">{fmtCurrency((s.baseTotalPrice ?? s.totalPrice) - (s.paidAmount ?? 0), BASE_CURRENCY)}</td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">
                    {fmtDate(s.startDate)} <ChevronRight className="inline w-3 h-3" /> {fmtDate(s.endDate)}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={STATUS_VARIANT[s.status]}>{s.status}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    {(s.status === "pending" || s.status === "active") && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive text-xs h-7"
                        onClick={() => setCancelId(s._id)}
                      >
                        Cancel
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Cancel dialog */}
      <Dialog.Root open={!!cancelId} onOpenChange={(o) => { if (!o) setCancelId(null); }}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
          <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md bg-card border border-border rounded-xl shadow-xl p-6">
            <Dialog.Title className="text-base font-semibold mb-4">Cancel Subscription</Dialog.Title>
            <p className="text-sm text-muted-foreground mb-4">
              Pending revenue entries will be cancelled. This cannot be undone.
            </p>
            <Input
              placeholder="Reason for cancellation (optional)"
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
            />
            <div className="flex gap-3 mt-4">
              <Dialog.Close asChild>
                <Button variant="ghost" className="flex-1">Go back</Button>
              </Dialog.Close>
              <Button variant="ghost" className="flex-1 text-destructive hover:text-destructive border border-destructive/30" onClick={handleCancel} disabled={saving}>
                {saving ? "Cancelling..." : "Confirm Cancel"}
              </Button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}
