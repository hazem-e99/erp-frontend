"use client";
import { useEffect, useState } from "react";
import api from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageLoader } from "@/components/ui/loading";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Line, Bar, Doughnut, Pie } from 'react-chartjs-2';
import { fmtCurrency, fmtDate, Installment, FinancePeriodFilters, buildPeriodQuery } from "./finance.types";
import { TrendingUp, TrendingDown, DollarSign, AlertTriangle, BarChart3, PieChart as PieChartIcon, TrendingUpIcon, FileDown, Search, Filter } from "lucide-react";
import { exportToExcel, fmtExcelCurrency, fmtExcelDate } from "@/lib/excel-export";

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface ReportsTabProps {
  filters: FinancePeriodFilters;
}

// Theme-aligned palette
const CALM_COLORS = {
  primary: "rgba(63, 16, 82, 0.85)",
  primaryLight: "rgba(63, 16, 82, 0.18)",
  success: "rgba(34, 197, 94, 0.85)",
  successLight: "rgba(34, 197, 94, 0.2)",
  danger: "rgba(239, 68, 68, 0.85)",
  dangerLight: "rgba(239, 68, 68, 0.2)",
  warning: "rgba(245, 158, 11, 0.8)",      // Amber
  warningLight: "rgba(245, 158, 11, 0.2)",
  info: "rgba(100, 116, 139, 0.85)",
  infoLight: "rgba(100, 116, 139, 0.2)",
  gray: "rgba(148, 163, 184, 0.8)",
};

const chartColors = [
  CALM_COLORS.primary,
  CALM_COLORS.success,
  CALM_COLORS.warning,
  CALM_COLORS.info,
  CALM_COLORS.danger,
  "rgba(82, 20, 105, 0.75)",
  "rgba(148, 163, 184, 0.8)",
  "rgba(156, 163, 175, 0.8)",
];

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'top' as const,
      labels: {
        font: { size: 11, family: "'Inter', sans-serif" },
        color: '#94a3b8',
        padding: 12,
        usePointStyle: true,
      }
    },
    tooltip: {
      backgroundColor: 'rgba(255, 255, 255, 0.95)',
      titleColor: '#1e293b',
      bodyColor: '#475569',
      borderColor: '#e2e8f0',
      borderWidth: 1,
      padding: 12,
      displayColors: true,
      bodyFont: { size: 12 },
      titleFont: { size: 13, weight: 700 },
    }
  },
  scales: {
    x: {
      grid: { color: '#f1f5f9', drawBorder: false },
      ticks: { color: '#94a3b8', font: { size: 11 } }
    },
    y: {
      grid: { color: '#f1f5f9', drawBorder: false },
      ticks: { color: '#94a3b8', font: { size: 11 } }
    }
  }
};

export default function ReportsTab({ filters }: ReportsTabProps) {
  const [pnl, setPnl] = useState<any>(null);
  const [cashFlow, setCashFlow] = useState<any[]>([]);
  const [revenueReport, setRevenueReport] = useState<any[]>([]);
  const [outstanding, setOutstanding] = useState<Installment[]>([]);
  const [subMetrics, setSubMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const fetchAll = async () => {
    setLoading(true);
    try {
      const params = buildPeriodQuery(filters);
      const outstandingParams = {
        ...params,
        ...(statusFilter !== "all" ? { status: statusFilter } : {}),
        ...(search.trim() ? { search: search.trim() } : {}),
      };

      const [pnlRes, cfRes, outRes, subRes, revRes] = await Promise.all([
        api.get("/finance/reports/profit-loss", { params }),
        api.get("/finance/reports/cash-flow", { params }),
        api.get("/finance/reports/outstanding-payments", { params: outstandingParams }),
        api.get("/finance/reports/subscription-metrics", { params }),
        api.get("/finance/reports/revenue", { params }).catch(() => ({ data: [] })),
      ]);
      setPnl(pnlRes.data);
      setCashFlow(cfRes.data);
      setOutstanding(outRes.data ?? []);
      setSubMetrics(subRes.data);
      setRevenueReport(revRes.data ?? []);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, [filters, statusFilter, search]);

  // Export comprehensive report to Excel
  const handleExportReport = async () => {
    // Export Outstanding Payments
    if (outstanding.length > 0) {
      await exportToExcel({
        filename: 'Finance_Comprehensive_Report',
        sheetName: 'Outstanding Payments',
        title: 'Outstanding Payments Report',
        columns: [
          { header: 'Customer', key: 'clientName', width: 20 },
          { header: 'Installment', key: 'installmentNumber', width: 12, format: (_, row) => `${row.installmentNumber}/${row.totalInstallments}` },
          { header: 'Amount Due', key: 'amountDue', width: 15, format: (_, row) => fmtExcelCurrency(row.amount - row.paidAmount) },
          { header: 'Due Date', key: 'dueDate', width: 15, format: fmtExcelDate },
          { header: 'Status', key: 'status', width: 12 },
        ],
        data: outstanding,
      });
    }

    // Also export P&L summary if available
    if (pnl) {
      const pnlData = [
        { metric: 'Revenue (Recognized)', value: pnl.revenue },
        { metric: 'Total Expenses', value: pnl.expenses },
        { metric: 'Net Profit', value: pnl.profit },
        { metric: 'Profit Margin (%)', value: pnl.margin },
      ];

      await exportToExcel({
        filename: 'Finance_PL_Summary',
        sheetName: 'Profit & Loss',
        title: 'Profit & Loss Summary',
        columns: [
          { header: 'Metric', key: 'metric', width: 25 },
          { header: 'Value', key: 'value', width: 20, format: (v, row) => row.metric.includes('%') ? v : fmtExcelCurrency(v) },
        ],
        data: pnlData,
      });
    }
  };

  if (loading) return <PageLoader />;

  // Process data for charts
  const cfChart = cashFlow.map((d) => ({
    ...d,
    period: d.period?.slice(5) ?? d.period,
  }));

  const statusPieData = (subMetrics?.statusBreakdown ?? []).map((s: any) => ({
    name: s._id,
    value: s.count,
  }));

  // Cash Flow Chart Data
  const cashFlowChartData = {
    labels: cfChart.map(c => c.period),
    datasets: [
      {
        label: 'Cash In',
        data: cfChart.map(c => c.cashIn),
        backgroundColor: CALM_COLORS.successLight,
        borderColor: CALM_COLORS.success,
        borderWidth: 2,
        borderRadius: 4,
      },
      {
        label: 'Cash Out',
        data: cfChart.map(c => c.cashOut),
        backgroundColor: CALM_COLORS.dangerLight,
        borderColor: CALM_COLORS.danger,
        borderWidth: 2,
        borderRadius: 4,
      },
    ],
  };

  // Subscription Status Donut Data
  const statusChartData = {
    labels: statusPieData.map((s: { name: string; value: number }) => s.name),
    datasets: [{
      data: statusPieData.map((s: { name: string; value: number }) => s.value),
      backgroundColor: chartColors,
      borderColor: '#ffffff',
      borderWidth: 2,
    }],
  };

  // Expense Distribution Pie Data
  const expenseChartData = {
    labels: (subMetrics?.expenseBreakdown ?? []).map((e: any) => e._id),
    datasets: [{
      data: (subMetrics?.expenseBreakdown ?? []).map((e: any) => e.total),
      backgroundColor: [CALM_COLORS.primary, CALM_COLORS.warning, CALM_COLORS.info, CALM_COLORS.danger],
      borderColor: '#ffffff',
      borderWidth: 2,
    }],
  };

  // Revenue Trend Line Data
  const revenueTrendData = revenueReport.slice(0, 12) || [];
  const revenueTrendChartData = {
    labels: revenueTrendData.map((_, i) => `Month ${i + 1}`),
    datasets: [{
      label: 'Revenue',
      data: revenueTrendData.map((r: any) => r.amount || 0),
      fill: true,
      backgroundColor: (context: any) => {
        const ctx = context.chart.ctx;
        const gradient = ctx.createLinearGradient(0, 0, 0, 280);
        gradient.addColorStop(0, 'rgba(63, 16, 82, 0.25)');
        gradient.addColorStop(1, 'rgba(63, 16, 82, 0.01)');
        return gradient;
      },
      borderColor: CALM_COLORS.primary,
      borderWidth: 2,
      tension: 0.4,
      pointRadius: 4,
      pointHoverRadius: 6,
      pointBackgroundColor: '#ffffff',
      pointBorderColor: CALM_COLORS.primary,
      pointBorderWidth: 2,
    }],
  };

  // Revenue by Plan Horizontal Bar Data
  const planBreakdown = subMetrics?.planBreakdown ?? [];
  const planChartData = {
    labels: planBreakdown.map((p: any) => p._id?.replace("_", " ")),
    datasets: [{
      label: 'Revenue',
      data: planBreakdown.map((p: any) => p.total),
      backgroundColor: CALM_COLORS.primaryLight,
      borderColor: CALM_COLORS.primary,
      borderWidth: 2,
      borderRadius: 4,
    }],
  };

  const periodLabel = (() => {
    if (filters.preset === "specificMonth") {
      return new Date(filters.year, filters.month - 1, 1).toLocaleString("en-US", { month: "long", year: "numeric" });
    }
    if (filters.preset === "custom") {
      return filters.startDate && filters.endDate ? `${filters.startDate} - ${filters.endDate}` : "Custom range";
    }
    if (filters.preset === "thisMonth") return "This Month";
    if (filters.preset === "last30") return "Last 30 Days";
    if (filters.preset === "last90") return "Last 90 Days";
    return "Year To Date";
  })();

  const cashInTotal = cashFlow.reduce((sum, item) => sum + (item.cashIn || 0), 0);
  const cashOutTotal = cashFlow.reduce((sum, item) => sum + (item.cashOut || 0), 0);
  const hasCashFlow = cashFlow.length > 0;
  const displayRevenue = hasCashFlow ? cashInTotal : pnl?.revenue ?? 0;
  const displayProfit = hasCashFlow ? (cashInTotal - cashOutTotal) : pnl?.profit ?? 0;
  const displayMargin = displayRevenue > 0 ? parseFloat(((displayProfit / displayRevenue) * 100).toFixed(2)) : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row gap-3 lg:items-center lg:justify-between">
        <div className="text-sm text-muted-foreground font-medium">
          <span className="text-primary font-semibold">Reporting Period:</span> {periodLabel}
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full lg:w-auto">
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-2.5" />
            <input
              type="text"
              className="w-full h-9 rounded-md border border-input bg-background pl-9 pr-3 text-sm"
              placeholder="Filter by customer name"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="relative w-full sm:w-48">
            <Filter className="w-4 h-4 text-muted-foreground absolute left-3 top-2.5" />
            <select
              className="w-full h-9 rounded-md border border-input bg-background pl-9 pr-3 text-sm"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">All statuses</option>
              <option value="pending">Pending</option>
              <option value="overdue">Overdue</option>
              <option value="partially_paid">Partially Paid</option>
            </select>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={handleExportReport}
            disabled={!pnl && outstanding.length === 0}
            className="border-primary/30 text-primary hover:bg-primary-light"
          >
            <FileDown className="w-4 h-4 mr-1" />
            Export Report to Excel
          </Button>
        </div>
      </div>

      {/* P&L Summary Cards */}
      {pnl && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <Card className="bg-linear-to-br from-primary-light to-background border-primary/20">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-primary mb-1 font-medium">Revenue (Cash In)</p>
                  <p className="text-2xl font-bold text-foreground">{fmtCurrency(displayRevenue)}</p>
                </div>
                <DollarSign className="w-8 h-8 text-primary/40" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-linear-to-br from-muted to-background border-border">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground mb-1 font-medium">Revenue (Recognized)</p>
                  <p className="text-2xl font-bold text-foreground">{fmtCurrency(pnl.revenue)}</p>
                </div>
                <TrendingUp className="w-8 h-8 text-muted-foreground/60" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-linear-to-br from-muted to-background border-border">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground mb-1 font-medium">Total Expenses</p>
                  <p className="text-2xl font-bold text-foreground">{fmtCurrency(pnl.expenses)}</p>
                </div>
                <BarChart3 className="w-8 h-8 text-muted-foreground/60" />
              </div>
            </CardContent>
          </Card>

          <Card className={`bg-linear-to-br border-2 ${displayProfit >= 0 ? "from-emerald-50 to-emerald-100 border-emerald-200" : "from-rose-50 to-rose-100 border-rose-200"}`}>
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-xs mb-1 font-medium ${displayProfit >= 0 ? "text-emerald-700" : "text-rose-700"}`}>Net Profit</p>
                  <p className={`text-2xl font-bold ${displayProfit >= 0 ? "text-emerald-900" : "text-rose-900"}`}>
                    {fmtCurrency(displayProfit)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-linear-to-br from-primary-light to-background border-primary/20">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-primary mb-1 font-medium">Profit Margin</p>
                  <div className="flex items-center gap-1">
                    {displayMargin >= 0 ? (
                      <TrendingUp className="w-4 h-4 text-primary" />
                    ) : (
                      <TrendingDown className="w-4 h-4 text-primary" />
                    )}
                    <p className="text-2xl font-bold text-foreground">
                      {displayMargin}%
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Cash Flow Chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-slate-600" />
              Cash Flow ({periodLabel})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div style={{ height: '280px' }}>
              <Bar data={cashFlowChartData} options={chartOptions} />
            </div>
          </CardContent>
        </Card>

        {/* Subscription Status Chart */}
        {statusPieData.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <PieChartIcon className="w-4 h-4 text-slate-600" />
                Subscription Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div style={{ height: '280px' }}>
                <Doughnut
                  data={statusChartData}
                  options={{
                    ...chartOptions,
                    cutout: '70%',
                  }}
                />
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Revenue Trend Chart */}
      {revenueTrendData.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUpIcon className="w-4 h-4 text-slate-600" />
              Revenue Trend
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div style={{ height: '280px' }}>
              <Line data={revenueTrendChartData} options={chartOptions} />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Revenue by Plan & Expense Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue by Plan */}
        {planBreakdown.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-slate-600" />
                Revenue by Plan
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div style={{ height: '240px' }}>
                <Bar
                  data={planChartData}
                  options={{
                    ...chartOptions,
                    indexAxis: 'y' as const,
                  }}
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Expense Distribution */}
        {(subMetrics?.expenseBreakdown ?? []).length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <PieChartIcon className="w-4 h-4 text-slate-600" />
                Expense Breakdown
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div style={{ height: '240px' }}>
                <Pie data={expenseChartData} options={chartOptions} />
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Subscription Metrics Cards */}
      {subMetrics && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-linear-to-br from-primary-light to-background border-primary/20">
            <CardContent className="p-5">
              <p className="text-xs text-primary mb-2 font-medium">Active Subscriptions</p>
              <p className="text-3xl font-bold text-foreground">{subMetrics.activeCount || 0}</p>
              <p className="text-xs text-muted-foreground mt-2">Currently Active</p>
            </CardContent>
          </Card>

          <Card className="bg-linear-to-br from-muted to-background border-border">
            <CardContent className="p-5">
              <p className="text-xs text-muted-foreground mb-2 font-medium">Completed Subscriptions</p>
              <p className="text-3xl font-bold text-foreground">{subMetrics.completedCount || 0}</p>
              <p className="text-xs text-muted-foreground mt-2">Finished & Closed</p>
            </CardContent>
          </Card>

          <Card className="bg-linear-to-br from-amber-50 to-amber-100 border-amber-200 dark:from-amber-950/30 dark:to-amber-900/20 dark:border-amber-800/40">
            <CardContent className="p-5">
              <p className="text-xs text-amber-700 dark:text-amber-300 mb-2 font-medium">Monthly Growth</p>
              <p className="text-3xl font-bold text-amber-950 dark:text-amber-100">{subMetrics.monthlyGrowth ? `${subMetrics.monthlyGrowth}%` : "0%"}</p>
              <p className="text-xs text-amber-600 dark:text-amber-300 mt-2">New Subscriptions</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Outstanding Payments Table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            Outstanding Payments ({outstanding.length})
          </CardTitle>
        </CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs font-semibold text-muted-foreground bg-muted/50">
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Installment</th>
                <th className="px-4 py-3">Amount Due</th>
                <th className="px-4 py-3">Due Date</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {outstanding.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                    <span className="text-emerald-600 font-medium">✓ All installments are paid</span>
                  </td>
                </tr>
              ) : outstanding.slice(0, 20).map((inst: Installment) => (
                <tr key={inst._id} className={`hover:bg-muted/50 ${inst.status === "overdue" ? "bg-rose-50" : ""}`}>
                  <td className="px-4 py-3 font-medium text-foreground">{inst.clientName}</td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">{inst.installmentNumber}/{inst.totalInstallments}</td>
                  <td className="px-4 py-3 font-medium text-foreground">{fmtCurrency(inst.amount - inst.paidAmount)}</td>
                  <td className={`px-4 py-3 text-xs ${inst.status === "overdue" ? "text-rose-600 font-medium" : "text-muted-foreground"}`}>
                    {fmtDate(inst.dueDate)}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={inst.status === "overdue" ? "destructive" : "secondary"} className={inst.status === "overdue" ? "bg-rose-100 text-rose-700 hover:bg-rose-200" : "bg-amber-100 text-amber-700 hover:bg-amber-200"}>
                      {inst.status}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
