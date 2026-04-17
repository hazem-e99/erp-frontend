"use client";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageLoader } from "@/components/ui/loading";
import { useAuthStore } from "@/lib/store";
import api from "@/lib/api";
import {
  Users, UserCheck, UserX, Clock, CalendarCheck, CalendarOff,
  TrendingUp, BarChart3, ArrowRight,
} from "lucide-react";
import Link from "next/link";

const statCards = [
  { key: "totalEmployees", label: "Total Employees", icon: Users, color: "from-blue-500 to-blue-600" },
  { key: "presentToday", label: "Present Today", icon: UserCheck, color: "from-emerald-500 to-emerald-600" },
  { key: "absentToday", label: "Absent Today", icon: UserX, color: "from-red-500 to-red-600" },
  { key: "lateToday", label: "Late Today", icon: Clock, color: "from-amber-500 to-amber-600" },
  { key: "pendingLeaves", label: "Pending Leaves", icon: CalendarOff, color: "from-purple-500 to-purple-600" },
  { key: "approvedLeavesThisMonth", label: "Approved This Month", icon: CalendarCheck, color: "from-teal-500 to-teal-600" },
];

export default function HrDashboardPage() {
  const { hasPermission } = useAuthStore();
  const [stats, setStats] = useState<any>(null);
  const [trend, setTrend] = useState<any[]>([]);
  const [leaveStats, setLeaveStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try { const { data } = await api.get("/hr/dashboard"); setStats(data); } catch {}
      try { const { data } = await api.get("/hr/attendance/trend", { params: { days: 14 } }); setTrend(data.trend || []); } catch {}
      try { const { data } = await api.get("/hr/leave-stats"); setLeaveStats(data); } catch {}
      setLoading(false);
    };
    fetch();
  }, []);

  if (!hasPermission("hr:dashboard")) {
    return (
      <div className="text-center py-20 animate-fade-in">
        <Users className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
        <h2 className="text-xl font-bold">Access Denied</h2>
        <p className="text-muted-foreground text-sm mt-2">You need HR permissions to access this page.</p>
      </div>
    );
  }

  if (loading) return <PageLoader />;

  const maxPresent = Math.max(...trend.map(t => t.present), 1);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><BarChart3 className="w-6 h-6 text-primary" /> HR Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">Workforce overview and analytics</p>
        </div>
        <div className="flex gap-2">
          <Link href="/dashboard/hr/attendance"><Button variant="outline" size="sm" className="gap-1"><UserCheck className="w-3.5 h-3.5" /> Attendance</Button></Link>
          <Link href="/dashboard/hr/leaves"><Button variant="outline" size="sm" className="gap-1"><CalendarOff className="w-3.5 h-3.5" /> Leaves</Button></Link>
          <Link href="/dashboard/hr/reports"><Button variant="outline" size="sm" className="gap-1"><TrendingUp className="w-3.5 h-3.5" /> Reports</Button></Link>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {statCards.map(s => (
          <Card key={s.key} className="overflow-hidden group hover:shadow-lg transition-all">
            <CardContent className="p-4">
              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${s.color} flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}>
                <s.icon className="w-5 h-5 text-white" />
              </div>
              <p className="text-2xl font-bold">{stats?.[s.key] ?? 0}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Attendance Trend Chart */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2"><TrendingUp className="w-4 h-4 text-primary" /> Attendance Trend (14 days)</CardTitle>
          </CardHeader>
          <CardContent>
            {trend.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-8">No attendance data</p>
            ) : (
              <div className="flex items-end gap-1.5 h-[180px]">
                {trend.map((d, i) => {
                  const pctPresent = (d.present / (d.total || 1)) * 100;
                  const pctLate = (d.late / (d.total || 1)) * 100;
                  return (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1 group cursor-pointer" title={`${d.date}\nPresent: ${d.present}\nLate: ${d.late}\nAbsent: ${d.absent}`}>
                      <div className="w-full flex flex-col items-stretch gap-0.5" style={{ height: '140px' }}>
                        <div className="flex-1" />
                        {d.late > 0 && (
                          <div className="bg-amber-500/80 rounded-t-sm transition-all group-hover:bg-amber-400" style={{ height: `${pctLate * 1.4}px`, minHeight: '3px' }} />
                        )}
                        <div className="bg-emerald-500 rounded-t-sm transition-all group-hover:bg-emerald-400" style={{ height: `${pctPresent * 1.4}px`, minHeight: '3px' }} />
                      </div>
                      <span className="text-[8px] text-muted-foreground truncate w-full text-center">{d.date.split('-').slice(1).join('/')}</span>
                    </div>
                  );
                })}
              </div>
            )}
            <div className="flex gap-4 mt-3 text-[10px] text-muted-foreground">
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-emerald-500" /> Present</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-amber-500" /> Late</span>
            </div>
          </CardContent>
        </Card>

        {/* Leave Distribution */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2"><CalendarOff className="w-4 h-4 text-primary" /> Leave Requests (This Month)</CardTitle>
          </CardHeader>
          <CardContent>
            {!leaveStats ? (
              <p className="text-xs text-muted-foreground text-center py-8">No data</p>
            ) : (
              <div className="space-y-4 pt-2">
                {[
                  { label: "Pending", value: leaveStats.pending, color: "bg-amber-500", textColor: "text-amber-500" },
                  { label: "Approved", value: leaveStats.approved, color: "bg-emerald-500", textColor: "text-emerald-500" },
                  { label: "Rejected", value: leaveStats.rejected, color: "bg-red-500", textColor: "text-red-500" },
                ].map(item => {
                  const pct = leaveStats.total > 0 ? (item.value / leaveStats.total) * 100 : 0;
                  return (
                    <div key={item.label}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className={`font-medium ${item.textColor}`}>{item.label}</span>
                        <span className="text-muted-foreground">{item.value} ({pct.toFixed(0)}%)</span>
                      </div>
                      <div className="h-2 bg-accent rounded-full overflow-hidden">
                        <div className={`h-full ${item.color} rounded-full transition-all duration-700`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
                <div className="text-center pt-2 border-t border-border">
                  <p className="text-2xl font-bold">{leaveStats.total}</p>
                  <p className="text-[10px] text-muted-foreground">Total Requests</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {[
          { href: "/dashboard/hr/attendance", label: "Attendance Management", desc: "View & filter today's attendance", icon: UserCheck, color: "text-emerald-500" },
          { href: "/dashboard/hr/leaves", label: "Leave Management", desc: "Review & approve leave requests", icon: CalendarOff, color: "text-purple-500" },
          { href: "/dashboard/hr/reports", label: "Reports & Analytics", desc: "Generate HR reports & export to Excel", icon: TrendingUp, color: "text-blue-500" },
        ].map(link => (
          <Link key={link.href} href={link.href}>
            <Card className="group hover:border-primary/30 hover:shadow-md transition-all cursor-pointer h-full">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-accent flex items-center justify-center shrink-0">
                  <link.icon className={`w-5 h-5 ${link.color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{link.label}</p>
                  <p className="text-[11px] text-muted-foreground">{link.desc}</p>
                </div>
                <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
