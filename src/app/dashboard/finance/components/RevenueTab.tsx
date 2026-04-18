"use client";
import { useEffect, useState } from "react";
import api from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageLoader } from "@/components/ui/loading";
import { Revenue, STATUS_VARIANT, fmtCurrency, fmtDate } from "./finance.types";

export default function RevenueTab() {
  const [revenue, setRevenue] = useState<Revenue[]>([]);
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
      const res = await api.get("/finance/revenue", { params });
      setRevenue(res.data.data ?? []);
      setTotal(res.data.total ?? 0);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { fetch(); }, [statusFilter, page]);

  if (loading) return <PageLoader />;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 flex-wrap">
        {["all", "pending", "recognized", "cancelled"].map((s) => (
          <Button
            key={s}
            variant={statusFilter === s ? "default" : "ghost"}
            size="sm"
            className="h-7 text-xs capitalize"
            onClick={() => { setStatusFilter(s); setPage(1); }}
          >
            {s}
          </Button>
        ))}
        <span className="ml-auto text-xs text-muted-foreground">{total} entries</span>
      </div>

      <div className="rounded-lg bg-muted/40 border border-border px-4 py-3 text-xs text-muted-foreground">
        <strong>Revenue Recognition:</strong> Revenue is recognized based on service delivery time, not payment date. 
        A daily job marks entries as <Badge variant="success" className="text-[10px] py-0">recognized</Badge> when their recognition date arrives.
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted-foreground">
                <th className="px-4 py-3 font-medium">Customer</th>
                <th className="px-4 py-3 font-medium">Description</th>
                <th className="px-4 py-3 font-medium">Amount</th>
                <th className="px-4 py-3 font-medium">Recognition Date</th>
                <th className="px-4 py-3 font-medium">Period Month</th>
                <th className="px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {revenue.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">No revenue entries found</td>
                </tr>
              )}
              {revenue.map((r) => (
                <tr key={r._id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 font-medium">{r.clientName}</td>
                  <td className="px-4 py-3 text-muted-foreground text-xs max-w-xs truncate">{r.description}</td>
                  <td className="px-4 py-3 font-medium text-primary">{fmtCurrency(r.amount)}</td>
                  <td className="px-4 py-3 text-muted-foreground">{fmtDate(r.recognitionDate)}</td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">Month {r.periodMonth}</td>
                  <td className="px-4 py-3">
                    <Badge variant={STATUS_VARIANT[r.status]}>{r.status}</Badge>
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
