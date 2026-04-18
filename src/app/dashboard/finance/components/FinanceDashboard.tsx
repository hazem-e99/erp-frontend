"use client";
import { useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";
import api from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import {
  DollarSign, TrendingUp, TrendingDown, AlertTriangle,
  CreditCard, Activity, Users, Wifi,
} from "lucide-react";
import { DashboardSummary, fmtCurrency } from "./finance.types";
import { PageLoader } from "@/components/ui/loading";

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

export default function FinanceDashboard() {
  const [data, setData] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [wsConnected, setWsConnected] = useState(false);
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

  return (
    <div className="space-y-6">
      {/* Real-time indicator */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Wifi className={`w-3.5 h-3.5 ${wsConnected ? "text-success" : "text-muted-foreground"}`} />
        <span>{wsConnected ? "Live updates enabled" : "Connecting..."}</span>
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
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Cash Flow</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="period" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(v: number) => fmtCurrency(v)} />
                <Legend />
                <Line type="monotone" dataKey="cashIn" stroke="var(--success)" name="Cash In" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="cashOut" stroke="var(--destructive)" name="Cash Out" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="net" stroke="var(--primary)" name="Net" strokeWidth={2} dot={false} strokeDasharray="4 2" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Cash In vs Cash Out</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="period" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(v: number) => fmtCurrency(v)} />
                <Legend />
                <Bar dataKey="cashIn" fill="var(--success)" name="Cash In" radius={[3, 3, 0, 0]} />
                <Bar dataKey="cashOut" fill="var(--destructive)" name="Cash Out" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
