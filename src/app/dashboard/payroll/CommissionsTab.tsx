"use client";
import { useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { PageLoader, EmptyState } from "@/components/ui/loading";
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle,
  AlertDialogDescription, AlertDialogFooter, AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { Check, X, Calendar, Filter, Search, DollarSign, Loader2, Upload, Paperclip } from "lucide-react";
import api from "@/lib/api";
import { BASE_CURRENCY, fmtCurrency, fmtDate } from "@/app/dashboard/finance/components/finance.types";

interface Commission {
  _id: string;
  employeeId: string;
  employeeName: string;
  sourceType: "subscription" | "payment";
  sourceId: string;
  subscriptionId: string | null;
  clientId: string | null;
  clientName: string;
  percentage: number;
  baseSourceNetAmount: number;
  baseCommissionAmount: number;
  currency: string;
  status: "pending" | "approved" | "paid" | "cancelled";
  payrollMonth: number | null;
  payrollYear: number | null;
  approvedAt: string | null;
  transferScreenshot: string;
  transactionNumber: string;
  notes: string;
  createdAt: string;
}

const STATUS_VARIANT: Record<string, "default" | "success" | "warning" | "destructive" | "secondary" | "outline"> = {
  pending: "warning",
  approved: "secondary",
  paid: "success",
  cancelled: "destructive",
};

const API_BASE = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api").replace(/\/api\/?$/, "");
const fileUrl = (path: string) => (path.startsWith("http") ? path : `${API_BASE}${path}`);

export default function CommissionsTab() {
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("pending");
  const [employeeFilter, setEmployeeFilter] = useState<string>("");
  const [search, setSearch] = useState("");
  const [approveDialog, setApproveDialog] = useState<{ open: boolean; commission: Commission | null }>({ open: false, commission: null });
  const [approveMonth, setApproveMonth] = useState(new Date().getMonth() + 1);
  const [approveYear, setApproveYear] = useState(new Date().getFullYear());
  const [approveNotes, setApproveNotes] = useState("");
  const [approveScreenshot, setApproveScreenshot] = useState<File | null>(null);
  const [approveTransactionNumber, setApproveTransactionNumber] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const params: Record<string, any> = {};
      if (statusFilter !== "all") params.status = statusFilter;
      const res = await api.get("/payroll/commissions", { params });
      setCommissions(res.data.data ?? []);
    } catch (e) {
      console.error(e);
      toast.error("Failed to load commissions");
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [statusFilter]);

  const filtered = useMemo(() => {
    return commissions.filter((c) => {
      if (employeeFilter && c.employeeId !== employeeFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        if (!c.employeeName.toLowerCase().includes(q) && !c.clientName.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [commissions, employeeFilter, search]);

  // Group by employee for summary
  const employeeTotals = useMemo(() => {
    const map = new Map<string, { name: string; total: number; count: number }>();
    filtered.forEach((c) => {
      const existing = map.get(c.employeeId) || { name: c.employeeName, total: 0, count: 0 };
      existing.total += c.baseCommissionAmount;
      existing.count += 1;
      map.set(c.employeeId, existing);
    });
    return Array.from(map.entries()).map(([id, v]) => ({ employeeId: id, ...v }));
  }, [filtered]);

  const employeeOptions = useMemo(() => {
    const map = new Map<string, string>();
    commissions.forEach((c) => map.set(c.employeeId, c.employeeName));
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [commissions]);

  const openApprove = (commission: Commission) => {
    setApproveDialog({ open: true, commission });
    setApproveMonth(new Date().getMonth() + 1);
    setApproveYear(new Date().getFullYear());
    setApproveNotes("");
    setApproveScreenshot(null);
    setApproveTransactionNumber("");
  };

  const handleApprove = async () => {
    if (!approveDialog.commission) return;
    if (!approveScreenshot) {
      toast.error("Please upload the transfer screenshot");
      return;
    }
    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append("month", String(approveMonth));
      fd.append("year", String(approveYear));
      if (approveNotes) fd.append("notes", approveNotes);
      if (approveTransactionNumber) fd.append("transactionNumber", approveTransactionNumber);
      fd.append("screenshot", approveScreenshot);

      await api.patch(
        `/payroll/commissions/${approveDialog.commission._id}/approve`,
        fd,
        { headers: { "Content-Type": "multipart/form-data" } },
      );
      toast.success("Commission approved");
      setApproveDialog({ open: false, commission: null });
      fetchData();
    } catch (e: any) {
      toast.error(e.response?.data?.message || "Failed to approve commission");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = async (id: string) => {
    if (!window.confirm("Cancel this commission? This cannot be undone.")) return;
    try {
      await api.delete(`/payroll/commissions/${id}`);
      toast.success("Commission cancelled");
      fetchData();
    } catch (e: any) {
      toast.error(e.response?.data?.message || "Failed to cancel commission");
    }
  };

  if (loading) return <PageLoader />;

  const totalAmount = filtered.reduce((s, c) => s + c.baseCommissionAmount, 0);
  const pendingCount = commissions.filter((c) => c.status === "pending").length;

  return (
    <div className="space-y-4">
      {/* Filters & Summary */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by employee or client..."
                className="pl-10"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-muted-foreground" />
              <select
                className="h-10 rounded-lg border border-input bg-card px-3 text-sm w-40"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="all">All Status</option>
                <option value="pending">Pending {pendingCount > 0 ? `(${pendingCount})` : ""}</option>
                <option value="approved">Approved</option>
                <option value="paid">Paid</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <select
                className="h-10 rounded-lg border border-input bg-card px-3 text-sm w-44"
                value={employeeFilter}
                onChange={(e) => setEmployeeFilter(e.target.value)}
              >
                <option value="">All Employees</option>
                {employeeOptions.map((e) => (
                  <option key={e.id} value={e.id}>{e.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="rounded-lg border border-border bg-muted/30 p-3">
              <div className="text-xs text-muted-foreground">Records</div>
              <div className="text-xl font-semibold">{filtered.length}</div>
            </div>
            <div className="rounded-lg border border-border bg-muted/30 p-3">
              <div className="text-xs text-muted-foreground">Total Amount ({statusFilter})</div>
              <div className="text-xl font-semibold text-primary">{fmtCurrency(totalAmount, BASE_CURRENCY)}</div>
            </div>
            <div className="rounded-lg border border-border bg-muted/30 p-3">
              <div className="text-xs text-muted-foreground">Employees</div>
              <div className="text-xl font-semibold">{employeeTotals.length}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* By-employee summary (only when filtering by status) */}
      {employeeTotals.length > 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm font-medium mb-3">By Employee</div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
              {employeeTotals.map((e) => (
                <div key={e.employeeId} className="flex items-center justify-between rounded-md border border-border bg-card px-3 py-2">
                  <div>
                    <div className="text-sm font-medium">{e.name}</div>
                    <div className="text-xs text-muted-foreground">{e.count} record(s)</div>
                  </div>
                  <div className="text-sm font-semibold text-primary">{fmtCurrency(e.total, BASE_CURRENCY)}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Commission list */}
      {filtered.length === 0 ? (
        <EmptyState icon={<DollarSign className="w-12 h-12" />} title={`No ${statusFilter !== "all" ? statusFilter : ""} commissions`} />
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted-foreground">
                  <th className="px-4 py-3 font-medium">Employee</th>
                  <th className="px-4 py-3 font-medium">Source</th>
                  <th className="px-4 py-3 font-medium">Client</th>
                  <th className="px-4 py-3 font-medium">Net Source</th>
                  <th className="px-4 py-3 font-medium">%</th>
                  <th className="px-4 py-3 font-medium">Commission</th>
                  <th className="px-4 py-3 font-medium">Created</th>
                  <th className="px-4 py-3 font-medium">Payroll</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Receipt</th>
                  <th className="px-4 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((c) => (
                  <tr key={c._id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 font-medium">{c.employeeName}</td>
                    <td className="px-4 py-3 capitalize text-muted-foreground">{c.sourceType}</td>
                    <td className="px-4 py-3">{c.clientName || "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground">{fmtCurrency(c.baseSourceNetAmount, BASE_CURRENCY)}</td>
                    <td className="px-4 py-3">{c.percentage}%</td>
                    <td className="px-4 py-3 font-semibold text-primary">{fmtCurrency(c.baseCommissionAmount, BASE_CURRENCY)}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{fmtDate(c.createdAt)}</td>
                    <td className="px-4 py-3 text-xs">
                      {c.payrollMonth && c.payrollYear ? `${c.payrollMonth}/${c.payrollYear}` : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={STATUS_VARIANT[c.status]}>{c.status}</Badge>
                    </td>
                    <td className="px-4 py-3 text-xs">
                      {c.transferScreenshot ? (
                        <a
                          href={fileUrl(c.transferScreenshot)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline inline-flex items-center gap-1"
                          title={c.transactionNumber || undefined}
                        >
                          <Paperclip className="w-3 h-3" /> View
                        </a>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 flex gap-1">
                      {c.status === "pending" && (
                        <>
                          <Button
                            size="sm"
                            variant="default"
                            className="text-xs h-7 gap-1"
                            onClick={() => openApprove(c)}
                          >
                            <Check className="w-3 h-3" /> Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-destructive hover:text-destructive text-xs h-7 gap-1"
                            onClick={() => handleCancel(c._id)}
                          >
                            <X className="w-3 h-3" /> Cancel
                          </Button>
                        </>
                      )}
                      {c.status === "approved" && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-destructive hover:text-destructive text-xs h-7 gap-1"
                          onClick={() => handleCancel(c._id)}
                        >
                          <X className="w-3 h-3" /> Cancel
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Approve dialog */}
      <AlertDialog
        open={approveDialog.open}
        onOpenChange={(open) => !open && setApproveDialog({ open: false, commission: null })}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Check className="w-5 h-5 text-success" />
              Approve Commission
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-4 pt-2">
                {approveDialog.commission && (
                  <div className="rounded-lg bg-muted/50 p-3 space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Employee:</span>
                      <span className="font-medium">{approveDialog.commission.employeeName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Client:</span>
                      <span>{approveDialog.commission.clientName || "—"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Source net:</span>
                      <span>{fmtCurrency(approveDialog.commission.baseSourceNetAmount, BASE_CURRENCY)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Percentage:</span>
                      <span>{approveDialog.commission.percentage}%</span>
                    </div>
                    <div className="flex justify-between border-t pt-1 mt-1">
                      <span className="font-medium">Commission:</span>
                      <span className="font-bold text-primary">
                        {fmtCurrency(approveDialog.commission.baseCommissionAmount, BASE_CURRENCY)}
                      </span>
                    </div>
                  </div>
                )}

                <div>
                  <label className="text-sm font-medium text-foreground flex items-center gap-1">
                    <Calendar className="w-4 h-4" /> Allocate to payroll month
                  </label>
                  <div className="flex gap-2 mt-1">
                    <select
                      className="flex-1 h-10 rounded-lg border border-input bg-card px-3 text-sm"
                      value={approveMonth}
                      onChange={(e) => setApproveMonth(+e.target.value)}
                    >
                      {Array.from({ length: 12 }, (_, i) => (
                        <option key={i + 1} value={i + 1}>
                          {new Date(2000, i).toLocaleString("default", { month: "long" })}
                        </option>
                      ))}
                    </select>
                    <Input
                      type="number"
                      min={2000}
                      max={2100}
                      className="w-28"
                      value={approveYear}
                      onChange={(e) => setApproveYear(+e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-foreground flex items-center gap-1">
                    <Upload className="w-4 h-4" /> Transfer Screenshot *
                  </label>
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setApproveScreenshot(e.target.files?.[0] || null)}
                    className="mt-1"
                  />
                  {approveScreenshot && (
                    <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                      <Paperclip className="w-3 h-3" />
                      {approveScreenshot.name}
                    </p>
                  )}
                </div>

                <div>
                  <label className="text-sm font-medium text-foreground">Transaction Number (optional)</label>
                  <Input
                    placeholder="e.g., TXN123456789"
                    value={approveTransactionNumber}
                    onChange={(e) => setApproveTransactionNumber(e.target.value)}
                    className="mt-1"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-foreground">Notes (optional)</label>
                  <Input
                    placeholder="e.g., Q1 sales bonus"
                    value={approveNotes}
                    onChange={(e) => setApproveNotes(e.target.value)}
                    className="mt-1"
                  />
                </div>

                <p className="text-xs text-muted-foreground">
                  Once approved, an expense record will be created for the selected month under category "commissions".
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={submitting}>Cancel</AlertDialogCancel>
            <Button onClick={handleApprove} disabled={submitting || !approveScreenshot}>
              {submitting ? (
                <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Approving...</>
              ) : (
                "Confirm Approval"
              )}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
