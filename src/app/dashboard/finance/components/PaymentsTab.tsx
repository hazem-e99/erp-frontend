"use client";
import { useEffect, useState } from "react";
import api from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { PageLoader } from "@/components/ui/loading";
import * as Dialog from "@radix-ui/react-dialog";
import { Plus, X } from "lucide-react";
import { Payment, Installment, METHOD_LABELS, fmtCurrency, fmtDate } from "./finance.types";

const METHODS = ["cash", "bank_transfer", "credit_card", "cheque", "online"];

export default function PaymentsTab() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [clients, setClients] = useState<any[]>([]);
  const [clientInstallments, setClientInstallments] = useState<Installment[]>([]);
  const [loadingInstallments, setLoadingInstallments] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState("");
  const [page, setPage] = useState(1);
  const LIMIT = 25;

  const [form, setForm] = useState({
    subscriptionId: "",
    installmentId: "",
    clientId: "",
    clientName: "",
    amount: "",
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
    paymentDate: new Date().toISOString().slice(0, 10),
    method: "bank_transfer",
    reference: "",
    notes: "",
  };

  const fetch = async () => {
    setLoading(true);
    try {
      const res = await api.get("/finance/payments", { params: { page, limit: LIMIT } });
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

  useEffect(() => { fetch(); }, [page]);

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
    }));
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post("/finance/payments", { ...form, amount: parseFloat(form.amount) });
      setOpen(false);
      setForm({ ...emptyForm });
      setSelectedClientId("");
      setClientInstallments([]);
      fetch();
    } catch (e: any) {
      const msg = e.response?.data?.errors?.join("\n") ?? e.response?.data?.message ?? "Failed to record payment";
      alert(msg);
    }
    setSaving(false);
  };

  if (loading) return <PageLoader />;

  const selectedInstallment = clientInstallments.find((i) => i._id === form.installmentId);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{total} total payments</p>
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
                    className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
                    value={selectedClientId}
                    required
                    onChange={(e) => handleSelectClient(e.target.value)}
                  >
                    <option value="">Choose client...</option>
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

                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Amount ($)</label>
                  <Input
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={form.amount}
                    required
                    onChange={(e) => setField("amount", e.target.value)}
                    placeholder="Payment amount"
                  />
                  {selectedInstallment && parseFloat(form.amount) > (selectedInstallment.amount - selectedInstallment.paidAmount) && (
                    <p className="text-xs text-warning mt-1">
                      Overpayment: {fmtCurrency(parseFloat(form.amount) - (selectedInstallment.amount - selectedInstallment.paidAmount))} will be applied to the next installment.
                    </p>
                  )}
                </div>

                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Payment Date</label>
                  <Input type="date" value={form.paymentDate} required onChange={(e) => setField("paymentDate", e.target.value)} />
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

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted-foreground">
                <th className="px-4 py-3 font-medium">Customer</th>
                <th className="px-4 py-3 font-medium">Amount</th>
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium">Method</th>
                <th className="px-4 py-3 font-medium">Reference</th>
                <th className="px-4 py-3 font-medium">Overflow</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {payments.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">No payments yet</td>
                </tr>
              )}
              {payments.map((p) => (
                <tr key={p._id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 font-medium">{p.clientName}</td>
                  <td className="px-4 py-3 font-medium text-success">{fmtCurrency(p.amount)}</td>
                  <td className="px-4 py-3 text-muted-foreground">{fmtDate(p.paymentDate)}</td>
                  <td className="px-4 py-3">
                    <Badge variant="secondary">{METHOD_LABELS[p.method]}</Badge>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">{p.reference || "—"}</td>
                  <td className="px-4 py-3 text-xs">
                    {p.overpaymentAmount > 0 ? (
                      <Badge variant="warning">{fmtCurrency(p.overpaymentAmount)} overflow</Badge>
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
