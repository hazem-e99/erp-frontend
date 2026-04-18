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
import { fmtCurrency, fmtDate, Installment } from "./finance.types";
import { TrendingUp, TrendingDown, DollarSign, AlertTriangle, BarChart3, PieChart as PieChartIcon, TrendingUpIcon, FileDown } from "lucide-react";
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

// Calm, muted color palette
const CALM_COLORS = {
  primary: "rgba(99, 102, 241, 0.8)",      // Indigo
  primaryLight: "rgba(99, 102, 241, 0.2)",
  success: "rgba(139, 92, 246, 0.8)",      // Purple
  successLight: "rgba(139, 92, 246, 0.2)",
  danger: "rgba(236, 72, 153, 0.8)",       // Rose
  dangerLight: "rgba(236, 72, 153, 0.2)",
  warning: "rgba(245, 158, 11, 0.8)",      // Amber
  warningLight: "rgba(245, 158, 11, 0.2)",
  info: "rgba(6, 182, 212, 0.8)",          // Cyan
  infoLight: "rgba(6, 182, 212, 0.2)",
  gray: "rgba(148, 163, 184, 0.8)",
};

const chartColors = [
  CALM_COLORS.primary,
  CALM_COLORS.success,
  CALM_COLORS.warning,
  CALM_COLORS.info,
  CALM_COLORS.danger,
  "rgba(167, 139, 250, 0.8)", // Light purple
  "rgba(125, 211, 252, 0.8)", // Light cyan
  "rgba(192, 132, 252, 0.8)", // Light pink
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
      titleFont: { size: 13, weight: 'bold' },
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

export default function ReportsTab() {
  const [pnl, setPnl] = useState<any>(null);
  const [cashFlow, setCashFlow] = useState<any[]>([]);
  const [revenueReport, setRevenueReport] = useState<any[]>([]);
  const [outstanding, setOutstanding] = useState<Installment[]>([]);
  const [subMetrics, setSubMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [pnlRes, cfRes, outRes, subRes, revRes] = await Promise.all([
        api.get("/finance/reports/profit-loss"),
        api.get("/finance/reports/cash-flow"),
        api.get("/finance/reports/outstanding-payments"),
        api.get("/finance/reports/subscription-metrics"),
        api.get("/finance/reports/revenue").catch(() => ({ data: [] })),
      ]);
      setPnl(pnlRes.data);
      setCashFlow(cfRes.data);
      setOutstanding(outRes.data ?? []);
      setSubMetrics(subRes.data);
      setRevenueReport(revRes.data ?? []);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, []);

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
    labels: statusPieData.map(s => s.name),
    datasets: [{
      data: statusPieData.map(s => s.value),
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
        gradient.addColorStop(0, 'rgba(99, 102, 241, 0.3)');
        gradient.addColorStop(1, 'rgba(99, 102, 241, 0.01)');
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

  return (
    <div className="space-y-6">
      {/* Export Button */}
      <div className="flex justify-end">
        <Button
          size="sm"
          variant="outline"
          onClick={handleExportReport}
          disabled={!pnl && outstanding.length === 0}
        >
          <FileDown className="w-4 h-4 mr-1" />
          Export Report to Excel
        </Button>
      </div>

      {/* P&L Summary Cards */}
      {pnl && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-slate-50 to-slate-100 border-slate-200">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-600 mb-1 font-medium">Revenue (Recognized)</p>
                  <p className="text-2xl font-bold text-slate-900">{fmtCurrency(pnl.revenue)}</p>
                </div>
                <DollarSign className="w-8 h-8 text-slate-400 opacity-50" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-blue-700 mb-1 font-medium">Total Expenses</p>
                  <p className="text-2xl font-bold text-blue-900">{fmtCurrency(pnl.expenses)}</p>
                </div>
                <BarChart3 className="w-8 h-8 text-blue-400 opacity-50" />
              </div>
            </CardContent>
          </Card>

          <Card className={`bg-gradient-to-br border-2 ${pnl.profit >= 0 ? "from-emerald-50 to-emerald-100 border-emerald-200" : "from-rose-50 to-rose-100 border-rose-200"}`}>
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-xs mb-1 font-medium ${pnl.profit >= 0 ? "text-emerald-700" : "text-rose-700"}`}>Net Profit</p>
                  <p className={`text-2xl font-bold ${pnl.profit >= 0 ? "text-emerald-900" : "text-rose-900"}`}>
                    {fmtCurrency(pnl.profit)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-purple-700 mb-1 font-medium">Profit Margin</p>
                  <div className="flex items-center gap-1">
                    {pnl.margin >= 0 ? (
                      <TrendingUp className="w-4 h-4 text-purple-600" />
                    ) : (
                      <TrendingDown className="w-4 h-4 text-purple-600" />
                    )}
                    <p className={`text-2xl font-bold text-purple-900`}>
                      {pnl.margin}%
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
              Cash Flow (YTD)
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
          <Card className="bg-gradient-to-br from-indigo-50 to-indigo-100 border-indigo-200">
            <CardContent className="p-5">
              <p className="text-xs text-indigo-700 mb-2 font-medium">Active Subscriptions</p>
              <p className="text-3xl font-bold text-indigo-900">{subMetrics.activeCount || 0}</p>
              <p className="text-xs text-indigo-600 mt-2">Currently Active</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-cyan-50 to-cyan-100 border-cyan-200">
            <CardContent className="p-5">
              <p className="text-xs text-cyan-700 mb-2 font-medium">Completed Subscriptions</p>
              <p className="text-3xl font-bold text-cyan-900">{subMetrics.completedCount || 0}</p>
              <p className="text-xs text-cyan-600 mt-2">Finished & Closed</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200">
            <CardContent className="p-5">
              <p className="text-xs text-amber-700 mb-2 font-medium">Monthly Growth</p>
              <p className="text-3xl font-bold text-amber-900">{subMetrics.monthlyGrowth ? `${subMetrics.monthlyGrowth}%` : "0%"}</p>
              <p className="text-xs text-amber-600 mt-2">New Subscriptions</p>
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
              <tr className="border-b border-slate-200 text-left text-xs font-semibold text-slate-700 bg-slate-50">
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Installment</th>
                <th className="px-4 py-3">Amount Due</th>
                <th className="px-4 py-3">Due Date</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {outstanding.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                    <span className="text-emerald-600 font-medium">✓ All installments are paid</span>
                  </td>
                </tr>
              ) : outstanding.slice(0, 20).map((inst: Installment) => (
                <tr key={inst._id} className={`hover:bg-slate-50 ${inst.status === "overdue" ? "bg-rose-50" : ""}`}>
                  <td className="px-4 py-3 font-medium text-slate-900">{inst.clientName}</td>
                  <td className="px-4 py-3 text-slate-600 text-xs">{inst.installmentNumber}/{inst.totalInstallments}</td>
                  <td className="px-4 py-3 font-medium text-slate-900">{fmtCurrency(inst.amount - inst.paidAmount)}</td>
                  <td className={`px-4 py-3 text-xs ${inst.status === "overdue" ? "text-rose-600 font-medium" : "text-slate-600"}`}>
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
