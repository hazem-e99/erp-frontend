"use client";
import { useEffect, useState, useMemo } from "react";
import api from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageLoader } from "@/components/ui/loading";
import { FileDown, Trash2 } from "lucide-react";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Revenue, STATUS_VARIANT, fmtCurrency, fmtDate, FinancePeriodFilters, buildPeriodQuery } from "./finance.types";
import { FilterBar } from "@/components/finance/FilterBar";
import { exportToExcel, fmtExcelCurrency, fmtExcelDate } from "@/lib/excel-export";

interface RevenueTabProps {
  filters: FinancePeriodFilters;
}

export default function RevenueTab({ filters: periodFilters }: RevenueTabProps) {
  const [revenue, setRevenue] = useState<Revenue[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const LIMIT = 25;
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      try {
        const params: Record<string, string | number> = {
          page,
          limit: LIMIT,
          ...buildPeriodQuery(periodFilters),
        };
        if (statusFilter !== "all") params.status = statusFilter;

        const res = await api.get("/finance/revenue", { params });
        if (cancelled) return;
        setRevenue(res.data.data ?? []);
        setTotal(res.data.total ?? 0);
      } catch (e) {
        if (!cancelled) console.error(e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [statusFilter, page, periodFilters]);

  // Filter revenue based on active filters
  const filteredRevenue = useMemo(() => {
    return revenue.filter((rev) => {
      // Customer name filter
      if (filters.customer && !rev.clientName.toLowerCase().includes(filters.customer.toLowerCase())) {
        return false;
      }

      // Date range filter (recognition date)
      if (filters.dateFrom && new Date(rev.recognitionDate) < new Date(filters.dateFrom)) {
        return false;
      }
      if (filters.dateTo && new Date(rev.recognitionDate) > new Date(filters.dateTo)) {
        return false;
      }

      // Amount range filter
      if (filters.amountMin && rev.amount < parseFloat(filters.amountMin)) {
        return false;
      }
      if (filters.amountMax && rev.amount > parseFloat(filters.amountMax)) {
        return false;
      }

      return true;
    });
  }, [revenue, filters]);

  const handleDelete = async () => {
    if (!deleteId) return;

    setDeleting(true);
    try {
      await api.delete(`/finance/revenue/${deleteId}`);
      toast.success('Revenue record deleted');
      setDeleteId(null);

      // Refetch data
      const params: Record<string, string | number> = {
        page,
        limit: LIMIT,
        ...buildPeriodQuery(periodFilters),
      };
      if (statusFilter !== "all") params.status = statusFilter;

      const res = await api.get("/finance/revenue", { params });
      setRevenue(res.data.data ?? []);
      setTotal(res.data.total ?? 0);
    } catch (e: any) {
      console.error(e);
      toast.error('Failed to delete revenue record', {
        description: e.response?.data?.message || e.message,
      });
    } finally {
      setDeleting(false);
    }
  };

  // Export to Excel function
  const handleExport = async () => {
    await exportToExcel({
      filename: 'Revenue_Report',
      sheetName: 'Revenue',
      title: 'Revenue Recognition Report',
      columns: [
        { header: 'Customer', key: 'clientName', width: 20 },
        { header: 'Description', key: 'description', width: 35 },
        { header: 'Amount', key: 'amount', width: 15, format: fmtExcelCurrency },
        { header: 'Recognition Date', key: 'recognitionDate', width: 18, format: fmtExcelDate },
        { header: 'Period Month', key: 'periodMonth', width: 12 },
        { header: 'Status', key: 'status', width: 12 },
      ],
      data: filteredRevenue,
    });
  };

  if (loading) return <PageLoader />;

  return (
    <div className="space-y-4">
      {/* Filter Bar */}
      <FilterBar
        fields={[
          { key: 'customer', label: 'Customer', type: 'text', placeholder: 'Search by name...' },
          { key: 'date', label: 'Recognition Date', type: 'dateRange' },
          { key: 'amountMin', label: 'Min Amount', type: 'number', placeholder: 'Min amount...' },
          { key: 'amountMax', label: 'Max Amount', type: 'number', placeholder: 'Max amount...' },
        ]}
        onFilterChange={setFilters}
        onClear={() => setFilters({})}
      />

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
        <span className="ml-auto text-xs text-muted-foreground">
          {filteredRevenue.length} {filteredRevenue.length === total ? 'total' : `of ${total}`} entries
        </span>
        <Button
          size="sm"
          variant="outline"
          onClick={handleExport}
          disabled={filteredRevenue.length === 0}
        >
          <FileDown className="w-4 h-4 mr-1" />
          Export to Excel
        </Button>
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
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredRevenue.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">No revenue entries found</td>
                </tr>
              )}
              {filteredRevenue.map((r) => (
                <tr key={r._id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 font-medium">{r.clientName}</td>
                  <td className="px-4 py-3 text-muted-foreground text-xs max-w-xs truncate">{r.description}</td>
                  <td className="px-4 py-3 font-medium text-primary">{fmtCurrency(r.amount)}</td>
                  <td className="px-4 py-3 text-muted-foreground">{fmtDate(r.recognitionDate)}</td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">Month {r.periodMonth}</td>
                  <td className="px-4 py-3">
                    <Badge variant={STATUS_VARIANT[r.status]}>{r.status}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <Dialog open={deleteId === r._id} onOpenChange={(open) => !open && setDeleteId(null)}>
                      <DialogTrigger asChild>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setDeleteId(r._id)}
                          className="w-8 h-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Delete Revenue Record</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          <p className="text-sm text-muted-foreground">
                            Are you sure you want to delete this revenue record? This action cannot be undone.
                          </p>
                          <div className="bg-muted/50 rounded p-3 space-y-1 text-sm">
                            <div><strong>Customer:</strong> {r.clientName}</div>
                            <div><strong>Amount:</strong> {fmtCurrency(r.amount)}</div>
                            <div><strong>Recognition Date:</strong> {fmtDate(r.recognitionDate)}</div>
                          </div>
                          <DialogFooter>
                            <Button
                              variant="outline"
                              onClick={() => setDeleteId(null)}
                              disabled={deleting}
                            >
                              Cancel
                            </Button>
                            <Button
                              variant="destructive"
                              onClick={handleDelete}
                              disabled={deleting}
                            >
                              {deleting ? 'Deleting...' : 'Delete'}
                            </Button>
                          </DialogFooter>
                        </div>
                      </DialogContent>
                    </Dialog>
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
