"use client";
import { useEffect, useState } from "react";
import api from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageLoader } from "@/components/ui/loading";
import { Installment, STATUS_VARIANT, fmtCurrency, fmtDate } from "./finance.types";
import { Bell } from "lucide-react";

const STATUS_FILTERS = ["all", "pending", "overdue", "paid", "partially_paid"];

export default function InstallmentsTab() {
  const [installments, setInstallments] = useState<Installment[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const LIMIT = 25;

  const fetch = async () => {
    setLoading(true);
    try {
      const params: Record<string, any> = { page, limit: LIMIT };
      if (statusFilter !== "all") params.status = statusFilter;
      const res = await api.get("/finance/installments", { params });
      setInstallments(res.data.data ?? []);
      setTotal(res.data.total ?? 0);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { fetch(); }, [statusFilter, page]);

  const isOverdue = (inst: Installment) =>
    inst.status === "overdue" || (inst.status === "pending" && new Date(inst.dueDate) < new Date());

  if (loading) return <PageLoader />;

  return (
    <div className="space-y-4">
      {/* Status filter */}
      <div className="flex items-center gap-2 flex-wrap">
        {STATUS_FILTERS.map((s) => (
          <Button
            key={s}
            variant={statusFilter === s ? "default" : "ghost"}
            size="sm"
            className="h-7 text-xs capitalize"
            onClick={() => { setStatusFilter(s); setPage(1); }}
          >
            {s === "all" ? "All" : s.replace("_", " ")}
          </Button>
        ))}
        <span className="ml-auto text-xs text-muted-foreground">{total} installments</span>
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted-foreground">
                <th className="px-4 py-3 font-medium">Customer</th>
                <th className="px-4 py-3 font-medium">Installment</th>
                <th className="px-4 py-3 font-medium">Amount</th>
                <th className="px-4 py-3 font-medium">Paid</th>
                <th className="px-4 py-3 font-medium">Due Date</th>
                <th className="px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {installments.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">No installments found</td>
                </tr>
              )}
              {installments.map((inst) => (
                <tr
                  key={inst._id}
                  className={`hover:bg-muted/30 transition-colors ${isOverdue(inst) ? "bg-destructive/5" : ""}`}
                >
                  <td className="px-4 py-3">
                    <div className="font-medium">{inst.clientName}</div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">
                    {inst.installmentNumber} / {inst.totalInstallments}
                  </td>
                  <td className="px-4 py-3 font-medium">{fmtCurrency(inst.amount)}</td>
                  <td className="px-4 py-3">
                    {inst.paidAmount > 0 ? (
                      <span className="text-success">{fmtCurrency(inst.paidAmount)}</span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className={`px-4 py-3 text-xs ${isOverdue(inst) ? "text-destructive font-medium" : "text-muted-foreground"}`}>
                    {fmtDate(inst.dueDate)}
                    {isOverdue(inst) && <span className="ml-1">(overdue)</span>}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Badge variant={STATUS_VARIANT[inst.status]}>{inst.status.replace("_", " ")}</Badge>
                      {isOverdue(inst) && (
                        <Bell className="w-3.5 h-3.5 text-destructive" />
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {total > LIMIT && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border text-sm">
            <span className="text-muted-foreground">
              {(page - 1) * LIMIT + 1}–{Math.min(page * LIMIT, total)} of {total}
            </span>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
                Previous
              </Button>
              <Button variant="ghost" size="sm" disabled={page * LIMIT >= total} onClick={() => setPage((p) => p + 1)}>
                Next
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
