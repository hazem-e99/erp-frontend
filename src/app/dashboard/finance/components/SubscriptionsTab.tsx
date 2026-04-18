"use client";
import { useEffect, useState } from "react";
import api from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { PageLoader } from "@/components/ui/loading";
import * as Dialog from "@radix-ui/react-dialog";
import { Plus, X, ChevronRight } from "lucide-react";
import {
  Subscription, PLAN_LABELS, STATUS_VARIANT, fmtCurrency, fmtDate,
} from "./finance.types";

const PLAN_MONTHS = { monthly: 1, quarterly: 3, semi_annual: 6 };

const emptyForm = {
  clientId: "",
  clientName: "",
  planType: "monthly",
  totalPrice: "",
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
  const [clients, setClients] = useState<any[]>([]);
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
    setSaving(true);
    try {
      // Validate installment rows
      if (showRows) {
        const hasInvalidAmt = installmentRows.some((r) => !r.amount || isNaN(parseFloat(r.amount)) || parseFloat(r.amount) <= 0);
        const hasInvalidDate = installmentRows.some((r) => !r.dueDate);
        if (hasInvalidAmt) { alert("Please fill in all installment amounts."); setSaving(false); return; }
        if (hasInvalidDate) { alert("Please fill in all installment due dates."); setSaving(false); return; }
      }

      const payload: Record<string, any> = {
        clientId: form.clientId,
        clientName: form.clientName,
        planType: form.planType,
        startDate: form.startDate,
        installmentPlan: form.installmentPlan,
        description: form.description,
      };

      if (showRows) {
        payload.installmentItems = installmentRows.map((r) => ({
          amount: parseFloat(r.amount),
          dueDate: r.dueDate,
        }));
      } else {
        payload.totalPrice = parseFloat(form.totalPrice);
      }

      await api.post("/finance/subscriptions", payload);
      setOpen(false);
      setForm({ ...emptyForm });
      setInstallmentRows([{ amount: "", dueDate: "" }, { amount: "", dueDate: "" }]);
      fetch();
    } catch (e: any) {
      const msg = e.response?.data?.errors?.join("\n") ?? e.response?.data?.message ?? "Failed to create subscription";
      alert(msg);
      console.warn("Create subscription error:", e.response?.data ?? e.message);
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
    } catch (e) { console.error(e); }
    setSaving(false);
  };

  const setField = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  if (loading) return <PageLoader />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{total} total subscriptions</p>
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
                      className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
                      value={form.clientId}
                      required
                      onChange={(e) => {
                        const c = clients.find((x) => x._id === e.target.value);
                        setForm((f) => ({ ...f, clientId: e.target.value, clientName: c?.name ?? c?.company ?? "" }));
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
                      required
                      onChange={(e) => setField("clientName", e.target.value)}
                    />
                  )}
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

                {/* Total price — only for full payment plan */}
                {!showRows && (
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Total Price ($)</label>
                    <Input
                      type="number"
                      min="0.01"
                      step="0.01"
                      placeholder="0.00"
                      value={form.totalPrice}
                      required
                      onChange={(e) => setField("totalPrice", e.target.value)}
                    />
                  </div>
                )}

                {/* Start date */}
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Start Date</label>
                  <Input
                    type="date"
                    value={form.startDate}
                    required
                    onChange={(e) => setField("startDate", e.target.value)}
                  />
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
                        <div key={i} className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground w-6 text-right shrink-0">#{i + 1}</span>
                          <Input
                            type="number"
                            min="0.01"
                            step="0.01"
                            placeholder="Amount ($)"
                            value={row.amount}
                            required
                            onChange={(e) => setRowField(i, "amount", e.target.value)}
                            className="flex-1"
                          />
                          <Input
                            type="date"
                            value={row.dueDate}
                            required
                            onChange={(e) => setRowField(i, "dueDate", e.target.value)}
                            className="flex-1"
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
                      ))}
                    </div>
                    {rowsTotal > 0 && (
                      <div className="flex justify-between items-center rounded-md bg-primary/10 border border-primary/20 px-3 py-2 text-xs">
                        <span className="text-muted-foreground">{installmentRows.length} installments</span>
                        <span className="text-primary font-semibold">Total: {fmtCurrency(rowsTotal)}</span>
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
                    required
                    onChange={(e) => setField("description", e.target.value)}
                  />
                </div>

                {/* Preview */}
                {(showRows ? rowsTotal > 0 : form.totalPrice) && form.planType && (
                  <div className="rounded-lg bg-muted/50 p-3 text-xs space-y-1 text-muted-foreground">
                    {(() => {
                      const months = PLAN_MONTHS[form.planType as keyof typeof PLAN_MONTHS];
                      const total = showRows ? rowsTotal : parseFloat(form.totalPrice || "0");
                      const count = form.installmentPlan === "full" ? 1 : installmentRows.length;
                      return (
                        <>
                          <p>Duration: <strong>{months} month(s)</strong></p>
                          <p>Revenue recognition: <strong>{months}</strong> × {fmtCurrency(total / months)}/mo</p>
                          <p>Installments: <strong>{count}</strong></p>
                          {total > 0 && <p>Total contract value: <strong>{fmtCurrency(total)}</strong></p>}
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

      {/* Table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted-foreground">
                <th className="px-4 py-3 font-medium">Customer</th>
                <th className="px-4 py-3 font-medium">Plan</th>
                <th className="px-4 py-3 font-medium">Total</th>
                <th className="px-4 py-3 font-medium">Paid</th>
                <th className="px-4 py-3 font-medium">Remaining</th>
                <th className="px-4 py-3 font-medium">Start → End</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {subs.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">No subscriptions yet</td>
                </tr>
              )}
              {subs.map((s) => (
                <tr key={s._id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 font-medium">{s.clientName}</td>
                  <td className="px-4 py-3 text-muted-foreground">{PLAN_LABELS[s.planType]}</td>
                  <td className="px-4 py-3 font-medium">{fmtCurrency(s.totalPrice)}</td>
                  <td className="px-4 py-3 text-success">{fmtCurrency(s.paidAmount)}</td>
                  <td className="px-4 py-3 text-warning">{fmtCurrency(s.totalPrice - s.paidAmount)}</td>
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
