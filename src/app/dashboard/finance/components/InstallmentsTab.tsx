"use client";
import { useEffect, useState, useMemo } from "react";
import api from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageLoader } from "@/components/ui/loading";
import { Bell, FileDown } from "lucide-react";
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
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredInstallments.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">No installments found</td>
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
