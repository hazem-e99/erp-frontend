"use client";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { PageLoader, EmptyState } from "@/components/ui/loading";
import api from "@/lib/api";
import { TrendingUp, Download, Calendar, Users, BarChart3, Clock, UserX, Award } from "lucide-react";

export default function HrReportsPage() {
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState("monthly");
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/hr/analytics", { params: { period, month, year } });
      setAnalytics(data);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { fetchAnalytics(); }, [period, month, year]);

  const exportEmployees = async () => {
    try {
      const { data } = await api.get("/hr/export/employees", { responseType: "blob" });
      const url = URL.createObjectURL(new Blob([data]));
      const a = document.createElement("a"); a.href = url; a.download = `employees_${Date.now()}.xlsx`; a.click();
    } catch { alert("Export failed"); }
  };

  const exportAttendance = async () => {
    try {
      const startDate = new Date(Date.UTC(year, month - 1, 1)).toISOString();
      const endDate = new Date(Date.UTC(year, month, 0)).toISOString();
      const { data } = await api.get("/hr/export/attendance", { params: { startDate, endDate }, responseType: "blob" });
      const url = URL.createObjectURL(new Blob([data]));
      const a = document.createElement("a"); a.href = url; a.download = `attendance_${month}_${year}.xlsx`; a.click();
    } catch { alert("Export failed"); }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><TrendingUp className="w-6 h-6 text-blue-500" /> Reports & Analytics</h1>
          <p className="text-sm text-muted-foreground mt-1">Generate attendance and performance reports</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-1" onClick={exportEmployees}><Download className="w-3.5 h-3.5" /> Employees</Button>
          <Button variant="outline" size="sm" className="gap-1" onClick={exportAttendance}><Download className="w-3.5 h-3.5" /> Attendance</Button>
        </div>
      </div>

      {/* Period Filters */}
      <div className="flex gap-3 items-center flex-wrap">
        <div className="flex gap-1.5">
          {["daily", "monthly", "yearly"].map(p => (
            <Button key={p} size="sm" variant={period === p ? "default" : "outline"} onClick={() => setPeriod(p)} className="capitalize">{p}</Button>
          ))}
        </div>
        {period !== "daily" && (
          <>
            {period === "monthly" && (
              <select value={month} onChange={e => setMonth(+e.target.value)} className="bg-card border border-input rounded-lg px-3 py-1.5 text-sm">
                {Array.from({ length: 12 }, (_, i) => (
                  <option key={i} value={i + 1}>{new Date(2000, i).toLocaleString("default", { month: "long" })}</option>
                ))}
              </select>
            )}
            <select value={year} onChange={e => setYear(+e.target.value)} className="bg-card border border-input rounded-lg px-3 py-1.5 text-sm">
              {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </>
        )}
      </div>

      {loading ? <PageLoader /> : !analytics ? (
        <EmptyState icon={<BarChart3 className="w-12 h-12" />} title="No analytics data" />
      ) : (
        <>
          {/* Summary */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: "Total Staff", value: analytics.summary.totalEmployees, icon: Users, color: "text-blue-500" },
              { label: "Total Present Days", value: analytics.summary.totalPresent, icon: Award, color: "text-emerald-500" },
              { label: "Total Absent Days", value: analytics.summary.totalAbsent, icon: UserX, color: "text-red-500" },
              { label: "Avg Attendance", value: `${analytics.summary.avgAttendance}%`, icon: TrendingUp, color: "text-primary" },
            ].map(s => (
              <Card key={s.label}>
                <CardContent className="p-3 flex items-center gap-3">
                  <s.icon className={`w-8 h-8 ${s.color}`} />
                  <div><p className="text-xl font-bold">{s.value}</p><p className="text-[10px] text-muted-foreground">{s.label}</p></div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Employee Table */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Employee Performance Report</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-xs text-muted-foreground">
                      <th className="px-4 py-3 text-left font-medium">Employee</th>
                      <th className="px-4 py-3 text-center font-medium">Present</th>
                      <th className="px-4 py-3 text-center font-medium">Absent</th>
                      <th className="px-4 py-3 text-center font-medium">Total Hours</th>
                      <th className="px-4 py-3 text-center font-medium">Avg Hours/Day</th>
                      <th className="px-4 py-3 text-center font-medium">Late Count</th>
                      <th className="px-4 py-3 text-center font-medium">Overtime (min)</th>
                      <th className="px-4 py-3 text-center font-medium">Attendance %</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analytics.employees?.map((emp: any, i: number) => (
                      <tr key={i} className="border-b border-border/50 hover:bg-accent/50 transition-colors">
                        <td className="px-4 py-3">
                          <p className="font-medium text-sm">{emp.employee.name}</p>
                          <p className="text-[10px] text-muted-foreground">{emp.employee.employeeId} • {emp.employee.department || "-"}</p>
                        </td>
                        <td className="px-4 py-3 text-center text-emerald-500 font-medium">{emp.presentDays}</td>
                        <td className="px-4 py-3 text-center text-red-500">{emp.absentDays}</td>
                        <td className="px-4 py-3 text-center font-medium">{emp.totalWorkingHours}h</td>
                        <td className="px-4 py-3 text-center">{emp.avgHoursPerDay}h</td>
                        <td className="px-4 py-3 text-center">{emp.lateCount > 0 ? <span className="text-amber-500">{emp.lateCount}</span> : "0"}</td>
                        <td className="px-4 py-3 text-center">{emp.overtimeMinutes > 0 ? <span className="text-blue-500">{emp.overtimeMinutes}</span> : "0"}</td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <div className="w-16 h-1.5 bg-accent rounded-full overflow-hidden">
                              <div className={`h-full rounded-full transition-all ${emp.attendancePercentage >= 80 ? 'bg-emerald-500' : emp.attendancePercentage >= 60 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${emp.attendancePercentage}%` }} />
                            </div>
                            <span className="text-xs font-medium">{emp.attendancePercentage}%</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
