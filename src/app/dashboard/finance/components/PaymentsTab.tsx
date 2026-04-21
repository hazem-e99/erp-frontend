"use client";
import { useEffect, useState, useMemo } from "react";
import { z } from "zod";
import api from "@/lib/api";
import { toast$, financeToast } from "@/lib/toast";
import { paymentAmountSchema, roundCents, parseFinancialInput, currencySchema, exchangeRateSchema, calculateBaseAmount, type SupportedCurrency, BASE_CURRENCY } from "@/lib/finance-validation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { PageLoader } from "@/components/ui/loading";
import * as Dialog from "@radix-ui/react-dialog";
import { Plus, X, FileDown } from "lucide-react";
import { Payment, Installment, METHOD_LABELS, fmtCurrency, fmtDate, CURRENCY_NAMES, type SupportedCurrency as TSupportedCurrency, FinancePeriodFilters, buildPeriodQuery } from "./finance.types";
import { FilterBar } from "@/components/finance/FilterBar";
import { exportToExcel, fmtExcelCurrency, fmtExcelDate } from "@/lib/excel-export";

const paymentSchema = z.object({
  installmentId: z.string().min(1, "Please select an installment"),
  amount: paymentAmountSchema,
  currency: currencySchema,
  exchangeRate: exchangeRateSchema,
  paymentDate: z.string().min(1, "Payment date is required"),
  method: z.enum(["cash", "bank_transfer", "credit_card", "cheque", "online"]),
});

const METHODS = ["cash", "bank_transfer", "credit_card", "cheque", "online"];

interface PaymentsTabProps {
  filters: FinancePeriodFilters;
}

export default function PaymentsTab({ filters: periodFilters }: PaymentsTabProps) {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [clients, setClients] = useState<any[]>([]);
  const [clientInstallments, setClientInstallments] = useState<Installment[]>([]);
  const [loadingInstallments, setLoadingInstallments] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState("");
  const [page, setPage] = useState(1);
  const LIMIT = 25;
  const periodQuery = useMemo(
    () => buildPeriodQuery(periodFilters),
    [periodFilters.preset, periodFilters.month, periodFilters.year, periodFilters.startDate, periodFilters.endDate],
  );

  const [form, setForm] = useState({
    subscriptionId: "",
    installmentId: "",
    clientId: "",
    clientName: "",
    amount: "",
    currency: BASE_CURRENCY as string,
    exchangeRate: "1",
    paymentDate: new Date().toISOString().slice(0, 10),
    method: "bank_transfer",
    reference: "",
    notes: "",
  });

  const emptyForm = {
    subscriptionId: "",
    installmentId: "",
    clientId: "",
    clientName: "",
    amount: "",
    currency: BASE_CURRENCY as string,
    exchangeRate: "1",
    paymentDate: new Date().toISOString().slice(0, 10),
    method: "bank_transfer",
    reference: "",
    notes: "",
  };

  const [filters, setFilters] = useState<Record<string, any>>({});

  const fetch = async () => {
    setLoading(true);
    try {
      const res = await api.get("/finance/payments", { params: { page, limit: LIMIT, ...periodQuery } });
      setPayments(res.data.data ?? []);
      setTotal(res.data.total ?? 0);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const fetchClients = async () => {
    try {
      const res = await api.get("/clients", { params: { limit: 200 } });
      setClients(res.data.data ?? []);
    } catch (e) { console.error(e); }
  };

  const fetchClientInstallments = async (clientId: string) => {
    setLoadingInstallments(true);
    setClientInstallments([]);
    setForm((f) => ({ ...f, installmentId: "", subscriptionId: "", amount: "" }));
    try {
      const [pending, overdue, partial] = await Promise.all([
        api.get("/finance/installments", { params: { clientId, status: "pending", limit: 50 } }),
        api.get("/finance/installments", { params: { clientId, status: "overdue", limit: 50 } }),
        api.get("/finance/installments", { params: { clientId, status: "partially_paid", limit: 50 } }),
      ]);
      setClientInstallments([
        ...(pending.data.data ?? []),
        ...(overdue.data.data ?? []),
        ...(partial.data.data ?? []),
      ]);
    } catch (e) { console.error(e); }
    setLoadingInstallments(false);
  };

  useEffect(() => { fetch(); }, [page, periodQuery]);

  const setField = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const handleSelectClient = (clientId: string) => {
    setSelectedClientId(clientId);
    const client = clients.find((c) => c._id === clientId);
    setForm((f) => ({
      ...f,
      clientId,
      clientName: client?.name ?? client?.company ?? "",
      installmentId: "",
      subscriptionId: "",
      amount: "",
    }));
    if (clientId) fetchClientInstallments(clientId);
    else setClientInstallments([]);
  };

  const handleSelectInstallment = (inst: Installment) => {
    setForm((f) => ({
      ...f,
      installmentId: inst._id,
      subscriptionId: inst.subscriptionId,
      amount: String(parseFloat((inst.amount - inst.paidAmount).toFixed(2))),
      currency: inst.currency,
      exchangeRate: inst.exchangeRate.toFixed(4),
    }));
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();

    const parsedAmount = parseFinancialInput(form.amount);
    const parsedExchangeRate = parseFinancialInput(form.exchangeRate);
    const parsed = paymentSchema.safeParse({
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
      const res = await api.post("/finance/payments", {
        ...form,
        amount: roundCents(parsedAmount),
        exchangeRate: Math.round(parsedExchangeRate * 10000) / 10000,
      });
      const overflow: number = res.data?.overflow ?? 0;
      setOpen(false);
      setForm({ ...emptyForm });
      setSelectedClientId("");
      setClientInstallments([]);
      fetch();
      financeToast.paymentRecorded(roundCents(parsedAmount), overflow);
    } catch (e: any) {
      toast$.apiError(e);
    }
    setSaving(false);
  };

  // Filter payments based on active filters
  const filteredPayments = useMemo(() => {
    return payments.filter((payment) => {
      // Customer name filter
      if (filters.customer && !payment.clientName.toLowerCase().includes(filters.customer.toLowerCase())) {
        return false;
      }

      // Method filter
      if (filters.method && payment.method !== filters.method) {
        return false;
      }

      // Date range filter
      if (filters.dateFrom && new Date(payment.paymentDate) < new Date(filters.dateFrom)) {
        return false;
      }
      if (filters.dateTo && new Date(payment.paymentDate) > new Date(filters.dateTo)) {
        return false;
      }

      // Amount range filter
      if (filters.amountMin && payment.amount < parseFloat(filters.amountMin)) {
        return false;
      }
      if (filters.amountMax && payment.amount > parseFloat(filters.amountMax)) {
        return false;
      }

      return true;
    });
  }, [payments, filters]);

  // Export to Excel function
  const handleExport = async () => {
    await exportToExcel({
      filename: 'Payments_Report',
      sheetName: 'Payments',
      title: 'Payments Report',
      columns: [
        { header: 'Customer', key: 'clientName', width: 20 },
        { header: 'Currency', key: 'currency', width: 10, format: (v) => v || BASE_CURRENCY },
        { header: 'Amount (Orig)', key: 'amount', width: 15, format: fmtExcelCurrency },
        { header: 'Exchange Rate', key: 'exchangeRate', width: 15, format: (v) => (v ?? 1).toFixed(4) },
        { header: 'Amount (Base)', key: 'baseAmount', width: 15, format: (v, row) => fmtExcelCurrency(v ?? row.amount) },
        { header: 'Payment Date', key: 'paymentDate', width: 15, format: fmtExcelDate },
        { header: 'Method', key: 'method', width: 15, format: (v) => METHOD_LABELS[v] || v },
        { header: 'Reference', key: 'reference', width: 20, format: (v) => v || '—' },
        { header: 'Overpayment', key: 'overpaymentAmount', width: 15, format: (v) => fmtExcelCurrency(v ?? 0) },
        { header: 'Notes', key: 'notes', width: 30, format: (v) => v || '—' },
      ],
      data: filteredPayments,
    });
  };

  if (loading) return <PageLoader />;

  const selectedInstallment = clientInstallments.find((i) => i._id === form.installmentId);

  return (
    <div className="space-y-4">
      {/* Filter Bar */}
      <FilterBar
        fields={[
          { key: 'customer', label: 'Customer', type: 'text', placeholder: 'Search by name...' },
          {
            key: 'method',
            label: 'Payment Method',
            type: 'select',
            options: [
              { label: 'Cash', value: 'cash' },
              { label: 'Bank Transfer', value: 'bank_transfer' },
              { label: 'Credit Card', value: 'credit_card' },
              { label: 'Cheque', value: 'cheque' },
              { label: 'Online', value: 'online' },
            ],
          },
          { key: 'date', label: 'Payment Date', type: 'dateRange' },
          { key: 'amountMin', label: 'Min Amount', type: 'number', placeholder: 'Min amount...' },
          { key: 'amountMax', label: 'Max Amount', type: 'number', placeholder: 'Max amount...' },
        ]}
        onFilterChange={setFilters}
        onClear={() => setFilters({})}
      />

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {filteredPayments.length} {filteredPayments.length === total ? 'total' : `of ${total}`} payments
        </p>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={handleExport}
            disabled={filteredPayments.length === 0}
          >
            <FileDown className="w-4 h-4 mr-1" />
            Export to Excel
          </Button>
          <Dialog.Root
          open={open}
          onOpenChange={(o) => {
            setOpen(o);
            if (o) fetchClients();
            else { setSelectedClientId(""); setClientInstallments([]); }
          }}
        >
          <Dialog.Trigger asChild>
            <Button size="sm"><Plus className="w-4 h-4 mr-1" />Add Payment</Button>
          </Dialog.Trigger>
          <Dialog.Portal>
            <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
            <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-lg bg-card border border-border rounded-xl shadow-xl p-6 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-5">
                <Dialog.Title className="text-base font-semibold">Add Payment</Dialog.Title>
                <Dialog.Close asChild>
                  <Button variant="ghost" size="icon"><X className="w-4 h-4" /></Button>
                </Dialog.Close>
              </div>
              <form onSubmit={handleCreate} className="space-y-4">
                {/* Step 1: Select Client */}
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                    <span className="inline-flex items-center gap-1.5">
                      <span className="w-4 h-4 rounded-full bg-primary text-primary-foreground text-[10px] flex items-center justify-center font-bold">1</span>
                      Select Client
                    </span>
                  </label>
                  <select
                    className={`w-full h-9 rounded-md border border-input bg-background px-3 text-sm ${
                      clients.length === 0 ? "opacity-60 cursor-not-allowed" : ""
                    }`}
                    value={selectedClientId}
                    required
                    disabled={clients.length === 0}
                    onChange={(e) => handleSelectClient(e.target.value)}
                  >
                    <option value="">
                      {clients.length === 0 ? "You must add clients first" : "Choose client..."}
                    </option>
                    {clients.map((c) => (
                      <option key={c._id} value={c._id}>{c.name ?? c.company}</option>
                    ))}
                  </select>
                </div>

                {/* Step 2: Select Installment */}
                {selectedClientId && (
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                      <span className="inline-flex items-center gap-1.5">
                        <span className="w-4 h-4 rounded-full bg-primary text-primary-foreground text-[10px] flex items-center justify-center font-bold">2</span>
                        Select Installment
                      </span>
                    </label>
                    {loadingInstallments ? (
                      <p className="text-xs text-muted-foreground py-2">Loading installments...</p>
                    ) : clientInstallments.length === 0 ? (
                      <p className="text-xs text-muted-foreground py-2">No pending installments for this client.</p>
                    ) : (
                      <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
                        {clientInstallments.map((inst) => {
                          const remaining = inst.amount - inst.paidAmount;
                          const isSelected = form.installmentId === inst._id;
                          return (
                            <button
                              key={inst._id}
                              type="button"
                              onClick={() => handleSelectInstallment(inst)}
                              className={`w-full text-left rounded-lg border px-3 py-2.5 text-xs transition-colors ${
                                isSelected
                                  ? "border-primary bg-primary/10 text-foreground"
                                  : "border-border bg-background hover:bg-muted/50"
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-medium">
                                  Installment #{inst.installmentNumber}/{inst.totalInstallments}
                                </span>
                                <span className={`font-semibold ${
                                  inst.status === "overdue" ? "text-destructive" :
                                  inst.status === "partially_paid" ? "text-warning" : "text-foreground"
                                }`}>
                                  {fmtCurrency(remaining)} remaining
                                </span>
                              </div>
                              <div className="flex items-center justify-between mt-0.5 text-muted-foreground">
                                <span>Due: {fmtDate(inst.dueDate)}</span>
                                <span className="capitalize">{inst.status.replace("_", " ")}</span>
                              </div>
                              {inst.paidAmount > 0 && (
                                <div className="mt-0.5 text-muted-foreground">
                                  Paid so far: {fmtCurrency(inst.paidAmount)} / {fmtCurrency(inst.amount)}
                                </div>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* Currency & Exchange Rate */}
                {selectedInstallment && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Currency</label>
                      <select
                        className="w-full h-9 rounded-md border border-input bg-muted px-3 text-sm cursor-not-allowed"
                        value={form.currency}
                        disabled
                      >
                        {Object.entries(CURRENCY_NAMES).map(([code, name]) => (
                          <option key={code} value={code}>{code} - {name}</option>
                        ))}
                      </select>
                      <p className="text-xs text-muted-foreground mt-1">From installment</p>
                    </div>

                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                        Exchange Rate (to {BASE_CURRENCY})
                      </label>
                      <Input
                        type="number"
                        value={form.exchangeRate}
                        disabled
                        className="bg-muted cursor-not-allowed"
                      />
                      <p className="text-xs text-muted-foreground mt-1">From installment</p>
                    </div>
                  </div>
                )}

                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                    Amount ({selectedInstallment ? form.currency : BASE_CURRENCY})
                    {selectedInstallment && (
                      <span className="ml-2 text-[10px] text-primary font-normal">(Auto-filled from installment)</span>
                    )}
                  </label>
                  <Input
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={form.amount}
                    readOnly={!!selectedInstallment}
                    className={`${fieldErrors.amount ? "border-destructive" : ""} ${selectedInstallment ? "bg-muted cursor-not-allowed" : ""}`}
                    onChange={(e) => {
                      if (!selectedInstallment) {
                        setField("amount", e.target.value);
                        if (e.target.value) setFieldErrors((fe) => ({ ...fe, amount: "" }));
                      }
                    }}
                    onBlur={(e) => {
                      if (!selectedInstallment) {
                        const n = parseFinancialInput(e.target.value);
                        if (!isNaN(n) && n > 0) setField("amount", roundCents(n).toFixed(2));
                      }
                    }}
                    placeholder={selectedInstallment ? "Remaining amount" : "Payment amount"}
                  />
                  {fieldErrors.amount && <p className="text-xs text-destructive mt-1">{fieldErrors.amount}</p>}
                  {!fieldErrors.amount && selectedInstallment && form.currency !== BASE_CURRENCY && (() => {
                    const amount = parseFinancialInput(form.amount);
                    const rate = parseFinancialInput(form.exchangeRate);
                    if (!isNaN(amount) && !isNaN(rate) && amount > 0 && rate > 0) {
                      return (
                        <p className="text-xs text-muted-foreground mt-1">
                          = {fmtCurrency(calculateBaseAmount(amount, rate), BASE_CURRENCY)} in base currency
                        </p>
                      );
                    }
                  })()}
                  {!fieldErrors.amount && selectedInstallment && parseFinancialInput(form.amount) > (selectedInstallment.amount - selectedInstallment.paidAmount) && (
                    <p className="text-xs text-warning mt-1">
                      Overpayment: {fmtCurrency(roundCents(parseFinancialInput(form.amount) - (selectedInstallment.amount - selectedInstallment.paidAmount)), form.currency as TSupportedCurrency)} will be applied to the next installment.
                    </p>
                  )}
                </div>

                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Payment Date</label>
                  <Input
                    type="date"
                    value={form.paymentDate}
                    className={fieldErrors.paymentDate ? "border-destructive" : ""}
                    onChange={(e) => {
                      setField("paymentDate", e.target.value);
                      setFieldErrors((fe) => ({ ...fe, paymentDate: "" }));
                    }}
                  />
                  {fieldErrors.paymentDate && <p className="text-xs text-destructive mt-1">{fieldErrors.paymentDate}</p>}
                </div>

                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Method</label>
                  <select
                    className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
                    value={form.method}
                    onChange={(e) => setField("method", e.target.value)}
                  >
                    {METHODS.map((m) => (
                      <option key={m} value={m}>{METHOD_LABELS[m]}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Reference</label>
                  <Input placeholder="Transaction ref / cheque no." value={form.reference} onChange={(e) => setField("reference", e.target.value)} />
                </div>

                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Notes</label>
                  <Input placeholder="Optional notes" value={form.notes} onChange={(e) => setField("notes", e.target.value)} />
                </div>

                <div className="flex gap-3 pt-2">
                  <Dialog.Close asChild>
                    <Button type="button" variant="ghost" className="flex-1">Cancel</Button>
                  </Dialog.Close>
                  <Button type="submit" className="flex-1" disabled={saving || !form.installmentId}>
                    {saving ? "Processing..." : "Record Payment"}
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
                <th className="px-4 py-3 font-medium">Customer</th>
                <th className="px-4 py-3 font-medium">Amount (Orig.)</th>
                <th className="px-4 py-3 font-medium">Amount (Base)</th>
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium">Method</th>
                <th className="px-4 py-3 font-medium">Reference</th>
                <th className="px-4 py-3 font-medium">Overflow</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredPayments.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">No payments yet</td>
                </tr>
              )}
              {filteredPayments.map((p) => (
                <tr key={p._id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 font-medium">{p.clientName}</td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-success">{fmtCurrency(p.amount, p.currency ?? BASE_CURRENCY)}</div>
                    {p.currency && p.currency !== BASE_CURRENCY && (
                      <div className="text-xs text-muted-foreground">@ {(p.exchangeRate ?? 1).toFixed(4)}</div>
                    )}
                  </td>
                  <td className="px-4 py-3 font-medium text-success">{fmtCurrency(p.baseAmount ?? p.amount, BASE_CURRENCY)}</td>
                  <td className="px-4 py-3 text-muted-foreground">{fmtDate(p.paymentDate)}</td>
                  <td className="px-4 py-3">
                    <Badge variant="secondary">{METHOD_LABELS[p.method]}</Badge>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">{p.reference || "—"}</td>
                  <td className="px-4 py-3 text-xs">
                    {p.overpaymentAmount > 0 ? (
                      <Badge variant="warning">{fmtCurrency(p.overpaymentAmount, p.currency ?? BASE_CURRENCY)} overflow</Badge>
                    ) : "—"}
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
