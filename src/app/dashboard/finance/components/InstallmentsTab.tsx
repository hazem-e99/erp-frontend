"use client";
import { useEffect, useState, useMemo } from "react";
import api from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageLoader } from "@/components/ui/loading";
import { Bell, FileDown, Trash2 } from "lucide-react";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Installment, STATUS_VARIANT, fmtCurrency, fmtDate, FinancePeriodFilters, buildPeriodQuery } from "./finance.types";
import { FilterBar } from "@/components/finance/FilterBar";
import { exportToExcel, fmtExcelCurrency, fmtExcelDate } from "@/lib/excel-export";

const STATUS_FILTERS = ["all", "pending", "overdue", "paid", "partially_paid"];

interface InstallmentsTabProps {
  filters: FinancePeriodFilters;
}

export default function InstallmentsTab({ filters: periodFilters }: InstallmentsTabProps) {
  const [installments, setInstallments] = useState<Installment[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const LIMIT = 25;
  const [filters, setFilters] = useState<Record<string, any>>({});
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const periodQuery = useMemo(
    () => buildPeriodQuery(periodFilters),
    [periodFilters.preset, periodFilters.month, periodFilters.year, periodFilters.startDate, periodFilters.endDate],
  );

  const fetch = async () => {
    setLoading(true);
    try {
      const params: Record<string, any> = { page, limit: LIMIT, ...periodQuery };
      if (statusFilter !== "all") params.status = statusFilter;
      const res = await api.get("/finance/installments", { params });
      setInstallments(res.data.data ?? []);
      setTotal(res.data.total ?? 0);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { fetch(); }, [statusFilter, page, periodQuery]);

  const isOverdue = (inst: Installment) =>
    inst.status === "overdue" || (inst.status === "pending" && new Date(inst.dueDate) < new Date());

  // Filter installments based on active filters
  const filteredInstallments = useMemo(() => {
    return installments.filter((inst) => {
      // Customer name filter
      if (filters.customer && !inst.clientName.toLowerCase().includes(filters.customer.toLowerCase())) {
        return false;
      }

      // Due date range filter
      if (filters.dateFrom && new Date(inst.dueDate) < new Date(filters.dateFrom)) {
        return false;
      }
      if (filters.dateTo && new Date(inst.dueDate) > new Date(filters.dateTo)) {
        return false;
      }

      // Amount range filter
      if (filters.amountMin && inst.amount < parseFloat(filters.amountMin)) {
        return false;
      }
      if (filters.amountMax && inst.amount > parseFloat(filters.amountMax)) {
        return false;
      }

      return true;
    });
  }, [installments, filters]);

  const totalInstallmentsDue = useMemo(
    () => filteredInstallments.reduce((sum, inst) => {
      const baseAmount = inst.baseAmount ?? inst.amount ?? 0;
      const remaining = baseAmount - (inst.paidAmount ?? 0);
      return sum + (remaining > 0 ? remaining : 0);
    }, 0),
    [filteredInstallments],
  );

  const handleDelete = async () => {
    if (!deleteId) return;

    setDeleting(true);
    try {
      await api.delete(`/finance/installments/${deleteId}`);
      toast.success('Installment deleted');
      setDeleteId(null);
      await fetch();
    } catch (e: any) {
      console.error(e);
      toast.error('Failed to delete installment', {
        description: e.response?.data?.message || e.message,
      });
    } finally {
      setDeleting(false);
    }
  };

  // Export to Excel function
  const handleExport = async () => {
    await exportToExcel({
      filename: 'Installments_Report',
      sheetName: 'Installments',
      title: 'Installments Report',
      columns: [
        { header: 'Customer', key: 'clientName', width: 20 },
        { header: 'Installment', key: 'installmentNumber', width: 12, format: (_, row) => `${row.installmentNumber}/${row.totalInstallments}` },
        { header: 'Amount', key: 'amount', width: 15, format: fmtExcelCurrency },
        { header: 'Paid Amount', key: 'paidAmount', width: 15, format: fmtExcelCurrency },
        { header: 'Remaining', key: 'remaining', width: 15, format: (_, row) => fmtExcelCurrency(row.amount - row.paidAmount) },
        { header: 'Due Date', key: 'dueDate', width: 15, format: fmtExcelDate },
        { header: 'Status', key: 'status', width: 15, format: (v) => v.replace('_', ' ') },
      ],
      data: filteredInstallments.map(inst => ({
        ...inst,
        remaining: inst.amount - inst.paidAmount,
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
          { key: 'date', label: 'Due Date', type: 'dateRange' },
          { key: 'amountMin', label: 'Min Amount', type: 'number', placeholder: 'Min amount...' },
          { key: 'amountMax', label: 'Max Amount', type: 'number', placeholder: 'Max amount...' },
        ]}
        onFilterChange={setFilters}
        onClear={() => setFilters({})}
      />

      <Card className="bg-linear-to-br from-primary-light to-background border-primary/20">
        <CardContent className="p-4">
          <div className="text-xs text-muted-foreground">Total Installments Due (Filtered)</div>
          <div className="text-2xl font-semibold text-foreground">{fmtCurrency(totalInstallmentsDue)}</div>
        </CardContent>
      </Card>

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
        <span className="ml-auto text-xs text-muted-foreground">
          {filteredInstallments.length} {filteredInstallments.length === total ? 'total' : `of ${total}`} installments
        </span>
        <Button
          size="sm"
          variant="outline"
          onClick={handleExport}
          disabled={filteredInstallments.length === 0}
        >
          <FileDown className="w-4 h-4 mr-1" />
          Export to Excel
        </Button>
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
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredInstallments.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">No installments found</td>
                </tr>
              )}
              {filteredInstallments.map((inst) => (
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
                  <td className="px-4 py-3">
                    <Dialog open={deleteId === inst._id} onOpenChange={(open) => !open && setDeleteId(null)}>
                      <DialogTrigger asChild>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setDeleteId(inst._id)}
                          className="w-8 h-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Delete Installment</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          <p className="text-sm text-muted-foreground">
                            Are you sure you want to delete this installment? This action cannot be undone.
                          </p>
                          <div className="bg-muted/50 rounded p-3 space-y-1 text-sm">
                            <div><strong>Customer:</strong> {inst.clientName}</div>
                            <div><strong>Installment:</strong> {inst.installmentNumber}/{inst.totalInstallments}</div>
                            <div><strong>Amount:</strong> {fmtCurrency(inst.amount)}</div>
                            <div><strong>Due Date:</strong> {fmtDate(inst.dueDate)}</div>
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
