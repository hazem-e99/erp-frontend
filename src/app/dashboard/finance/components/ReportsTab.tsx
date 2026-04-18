"use client";
import { useEffect, useState } from "react";
import api from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageLoader } from "@/components/ui/loading";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell,
} from "recharts";
import { fmtCurrency, fmtDate, Installment } from "./finance.types";
import { TrendingUp, TrendingDown, DollarSign, AlertTriangle } from "lucide-react";

const MONTH_NAMES = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

const PIE_COLORS = [
  "var(--primary)", "#22c55e", "#3b82f6", "#f59e0b",
  "#ef4444", "#8b5cf6", "#06b6d4", "#ec4899",
];

export default function ReportsTab() {
  const [pnl, setPnl] = useState<any>(null);
  const [cashFlow, setCashFlow] = useState<any[]>([]);
  const [outstanding, setOutstanding] = useState<Installment[]>([]);
  const [subMetrics, setSubMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [year] = useState(new Date().getFullYear());

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [pnlRes, cfRes, outRes, subRes] = await Promise.all([
        api.get("/finance/reports/profit-loss"),
        api.get("/finance/reports/cash-flow"),
        api.get("/finance/reports/outstanding-payments"),
        api.get("/finance/reports/subscription-metrics"),
      ]);
      setPnl(pnlRes.data);
      setCashFlow(cfRes.data);
      setOutstanding(outRes.data ?? []);
      setSubMetrics(subRes.data);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, []);

  if (loading) return <PageLoader />;

  const cfChart = cashFlow.map((d) => ({
    ...d,
    period: d.period?.slice(5) ?? d.period,
  }));

  const statusPieData = (subMetrics?.statusBreakdown ?? []).map((s: any) => ({
    name: s._id,
    value: s.count,
  }));

  return (
    <div className="space-y-6">
      {/* P&L Summary */}
      {pnl && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-5">
              <p className="text-xs text-muted-foreground mb-1">Revenue (Recognized)</p>
              <p className="text-2xl font-bold text-success">{fmtCurrency(pnl.revenue)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <p className="text-xs text-muted-foreground mb-1">Total Expenses</p>
              <p className="text-2xl font-bold text-destructive">{fmtCurrency(pnl.expenses)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <p className="text-xs text-muted-foreground mb-1">Net Profit</p>
              <p className={`text-2xl font-bold ${pnl.profit >= 0 ? "text-success" : "text-destructive"}`}>
                {fmtCurrency(pnl.profit)}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <p className="text-xs text-muted-foreground mb-1">Profit Margin</p>
              <div className="flex items-center gap-1 mt-1">
                {pnl.margin >= 0 ? (
                  <TrendingUp className="w-4 h-4 text-success" />
                ) : (
                  <TrendingDown className="w-4 h-4 text-destructive" />
                )}
                <p className={`text-2xl font-bold ${pnl.margin >= 0 ? "text-success" : "text-destructive"}`}>
                  {pnl.margin}%
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Cash flow chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Cash Flow (YTD)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={cfChart} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
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

        {/* Subscription status pie */}
        {statusPieData.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Subscription Status</CardTitle>
            </CardHeader>
            <CardContent className="flex items-center gap-6">
              <ResponsiveContainer width={160} height={160}>
                <PieChart>
                  <Pie
                    data={statusPieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={70}
                    dataKey="value"
                  >
                    {statusPieData.map((_: any, i: number) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2 flex-1">
                {statusPieData.map((s: any, i: number) => (
                  <div key={s.name} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                      <span className="capitalize">{s.name}</span>
                    </div>
                    <span className="font-medium">{s.value}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Outstanding payments */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-warning" />
            Outstanding Payments ({outstanding.length})
          </CardTitle>
        </CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted-foreground">
                <th className="px-4 py-3 font-medium">Customer</th>
                <th className="px-4 py-3 font-medium">Installment</th>
                <th className="px-4 py-3 font-medium">Amount Due</th>
                <th className="px-4 py-3 font-medium">Due Date</th>
                <th className="px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {outstanding.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                    <span className="text-success">All installments are paid ✓</span>
                  </td>
                </tr>
              ) : outstanding.slice(0, 20).map((inst: Installment) => (
                <tr key={inst._id} className={`hover:bg-muted/30 ${inst.status === "overdue" ? "bg-destructive/5" : ""}`}>
                  <td className="px-4 py-3 font-medium">{inst.clientName}</td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">{inst.installmentNumber}/{inst.totalInstallments}</td>
                  <td className="px-4 py-3 font-medium">{fmtCurrency(inst.amount - inst.paidAmount)}</td>
                  <td className={`px-4 py-3 text-xs ${inst.status === "overdue" ? "text-destructive font-medium" : "text-muted-foreground"}`}>
                    {fmtDate(inst.dueDate)}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={inst.status === "overdue" ? "destructive" : "warning"}>
                      {inst.status}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Subscription plan breakdown */}
      {subMetrics?.planBreakdown?.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Revenue by Plan</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              {subMetrics.planBreakdown.map((p: any) => (
                <div key={p._id} className="rounded-xl bg-muted/40 p-4">
                  <p className="text-xs text-muted-foreground capitalize mb-1">{p._id?.replace("_", " ")}</p>
                  <p className="text-xl font-bold">{p.count} subs</p>
                  <p className="text-sm text-muted-foreground">{fmtCurrency(p.total)}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
