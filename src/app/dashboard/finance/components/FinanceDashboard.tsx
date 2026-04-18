"use client";
import { useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";
import api from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';
import {
  DollarSign, TrendingUp, TrendingDown, AlertTriangle,
  CreditCard, Activity, Users, Wifi, FileDown, Loader2,
} from "lucide-react";
import { DashboardSummary, fmtCurrency } from "./finance.types";
import { PageLoader } from "@/components/ui/loading";
import { exportCompleteFinanceReport } from "@/lib/excel-export";
import { toast } from "sonner";

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

// Calm color palette
const CALM_COLORS = {
  cashIn: "rgba(139, 92, 246, 0.8)",      // Purple
  cashInLight: "rgba(139, 92, 246, 0.2)",
  cashOut: "rgba(236, 72, 153, 0.8)",     // Rose
  cashOutLight: "rgba(236, 72, 153, 0.2)",
  net: "rgba(99, 102, 241, 0.8)",         // Indigo
  netLight: "rgba(99, 102, 241, 0.2)",
};

const WS_URL = process.env.NEXT_PUBLIC_API_URL?.replace("/api", "") ?? "http://localhost:3001";

interface MetricCardProps {
  title: string;
  value: string;
  icon: React.ElementType;
  trend?: "up" | "down" | "neutral";
  sub?: string;
  color?: string;
}

function MetricCard({ title, value, icon: Icon, trend, sub, color = "text-primary" }: MetricCardProps) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-muted-foreground font-medium">{title}</p>
            <p className={`text-2xl font-bold mt-1 ${color}`}>{value}</p>
            {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
          </div>
          <div className={`p-2.5 rounded-xl bg-primary/10`}>
            <Icon className={`w-5 h-5 ${color}`} />
          </div>
        </div>
        {trend && (
          <div className="flex items-center gap-1 mt-3">
            {trend === "up" ? (
              <TrendingUp className="w-3.5 h-3.5 text-success" />
            ) : trend === "down" ? (
              <TrendingDown className="w-3.5 h-3.5 text-destructive" />
            ) : null}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

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
      ticks: {
        color: '#94a3b8',
        font: { size: 11 },
        callback: function(value: any) {
          return '$' + (value / 1000).toFixed(0) + 'k';
        }
      }
    }
  }
};

export default function FinanceDashboard() {
  const [data, setData] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [wsConnected, setWsConnected] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  const fetchDashboard = async () => {
    try {
      const res = await api.get("/finance/reports/dashboard");
      setData(res.data);
    } catch (e) {
      console.error("Dashboard fetch error:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleExportCompleteReport = async () => {
    setIsExporting(true);
    const toastId = toast.loading('Preparing complete finance report...');
    
    try {
      // Fetch all data in parallel
      const [
        subscriptionsRes,
        installmentsRes,
        paymentsRes,
        revenueRes,
        expensesRes,
      ] = await Promise.all([
        api.get('/finance/subscriptions'),
        api.get('/finance/installments'),
        api.get('/finance/payments'),
        api.get('/finance/revenue'),
        api.get('/finance/expenses'),
      ]);

      // Export to Excel with all data
      await exportCompleteFinanceReport({
        subscriptions: subscriptionsRes.data,
        installments: installmentsRes.data,
        payments: paymentsRes.data,
        revenue: revenueRes.data,
        expenses: expensesRes.data,
        dashboardSummary: data,
      });

      toast.success('Complete finance report exported successfully!', { id: toastId });
    } catch (error: any) {
      console.error('Export error:', error);
      toast.error('Failed to export report', {
        id: toastId,
        description: error.response?.data?.message || error.message,
      });
    } finally {
      setIsExporting(false);
    }
  };

  useEffect(() => {
    fetchDashboard();

    // WebSocket for real-time updates
    const socket = io(`${WS_URL}/finance`, { transports: ["websocket"] });
    socketRef.current = socket;

    socket.on("connect", () => setWsConnected(true));
    socket.on("disconnect", () => setWsConnected(false));

    // Refresh dashboard on any finance event
    const refresh = () => fetchDashboard();
    socket.on("payment:created", refresh);
    socket.on("subscription:created", refresh);
    socket.on("subscription:cancelled", refresh);
    socket.on("revenue:recognized", refresh);
    socket.on("dashboard:refresh", refresh);

    return () => {
      socket.disconnect();
    };
  }, []);

  if (loading) return <PageLoader />;
  if (!data) return <p className="text-muted-foreground">Failed to load dashboard.</p>;

  const chartData = data.cashFlowChart.map((d) => ({
    ...d,
    period: d.period.slice(5), // "2024-03" → "03"
  }));

  // Cash Flow Area Chart Data
  const cashFlowAreaData = {
    labels: chartData.map(d => d.period),
    datasets: [
      {
        label: 'Cash In',
        data: chartData.map(d => d.cashIn),
        fill: true,
        backgroundColor: (context: any) => {
          const ctx = context.chart.ctx;
          const gradient = ctx.createLinearGradient(0, 0, 0, 240);
          gradient.addColorStop(0, 'rgba(139, 92, 246, 0.3)');
          gradient.addColorStop(1, 'rgba(139, 92, 246, 0.01)');
          return gradient;
        },
        borderColor: CALM_COLORS.cashIn,
        borderWidth: 2,
        tension: 0.4,
        pointRadius: 3,
        pointHoverRadius: 5,
        pointBackgroundColor: '#ffffff',
        pointBorderColor: CALM_COLORS.cashIn,
        pointBorderWidth: 2,
      },
      {
        label: 'Cash Out',
        data: chartData.map(d => d.cashOut),
        fill: true,
        backgroundColor: (context: any) => {
          const ctx = context.chart.ctx;
          const gradient = ctx.createLinearGradient(0, 0, 0, 240);
          gradient.addColorStop(0, 'rgba(236, 72, 153, 0.3)');
          gradient.addColorStop(1, 'rgba(236, 72, 153, 0.01)');
          return gradient;
        },
        borderColor: CALM_COLORS.cashOut,
        borderWidth: 2,
        tension: 0.4,
        pointRadius: 3,
        pointHoverRadius: 5,
        pointBackgroundColor: '#ffffff',
        pointBorderColor: CALM_COLORS.cashOut,
        pointBorderWidth: 2,
      },
      {
        label: 'Net',
        data: chartData.map(d => d.net),
        fill: false,
        borderColor: CALM_COLORS.net,
        borderWidth: 2,
        borderDash: [5, 5],
        tension: 0.4,
        pointRadius: 3,
        pointHoverRadius: 5,
        pointBackgroundColor: '#ffffff',
        pointBorderColor: CALM_COLORS.net,
        pointBorderWidth: 2,
      },
    ],
  };

  // Cash In vs Cash Out Bar Data
  const cashFlowBarData = {
    labels: chartData.map(d => d.period),
    datasets: [
      {
        label: 'Cash In',
        data: chartData.map(d => d.cashIn),
        backgroundColor: CALM_COLORS.cashInLight,
        borderColor: CALM_COLORS.cashIn,
        borderWidth: 2,
        borderRadius: 4,
      },
      {
        label: 'Cash Out',
        data: chartData.map(d => d.cashOut),
        backgroundColor: CALM_COLORS.cashOutLight,
        borderColor: CALM_COLORS.cashOut,
        borderWidth: 2,
        borderRadius: 4,
      },
    ],
  };

  return (
    <div className="space-y-6">
      {/* Header with Export Button */}
      <div className="flex items-center justify-between">
        {/* Real-time indicator */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Wifi className={`w-3.5 h-3.5 ${wsConnected ? "text-success" : "text-muted-foreground"}`} />
          <span>{wsConnected ? "Live updates enabled" : "Connecting..."}</span>
        </div>

        {/* Export Complete Report Button */}
        <Button
          onClick={handleExportCompleteReport}
          disabled={isExporting}
          className="gap-2 bg-linear-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg"
        >
          {isExporting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Exporting...
            </>
          ) : (
            <>
              <FileDown className="w-4 h-4" />
              Export Complete Report
            </>
          )}
        </Button>
      </div>

      {/* KPI metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Total Cash In (YTD)"
          value={fmtCurrency(data.totalCashIn)}
          icon={DollarSign}
          trend="up"
          color="text-success"
        />
        <MetricCard
          title="Total Cash Out (YTD)"
          value={fmtCurrency(data.totalCashOut)}
          icon={TrendingDown}
          color="text-destructive"
        />
        <MetricCard
          title="Net Profit (YTD)"
          value={fmtCurrency(data.netProfit)}
          icon={Activity}
          color={data.netProfit >= 0 ? "text-success" : "text-destructive"}
        />
        <MetricCard
          title="Recognized Revenue"
          value={fmtCurrency(data.recognizedRevenueThisMonth)}
          icon={TrendingUp}
          sub="This month"
          color="text-primary"
        />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <MetricCard
          title="Outstanding Payments"
          value={fmtCurrency(data.outstandingPayments)}
          icon={AlertTriangle}
          color="text-warning"
        />
        <MetricCard
          title="Active Subscriptions"
          value={String(data.activeSubscriptions)}
          icon={CreditCard}
          color="text-primary"
        />
        <MetricCard
          title="Overdue Installments"
          value={String(data.overdueCount)}
          icon={Users}
          color={data.overdueCount > 0 ? "text-destructive" : "text-success"}
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Cash Flow - Area Chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Cash Flow Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <div style={{ height: '240px' }}>
              <Line data={cashFlowAreaData} options={chartOptions} />
            </div>
          </CardContent>
        </Card>

        {/* Cash In vs Cash Out - Bar Chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Cash In vs Cash Out</CardTitle>
          </CardHeader>
          <CardContent>
            <div style={{ height: '240px' }}>
              <Bar data={cashFlowBarData} options={chartOptions} />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
