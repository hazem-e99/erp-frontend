"use client";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { PageLoader, EmptyState } from "@/components/ui/loading";
import api from "@/lib/api";
import { UserCheck, UserX, Clock, Users, Calendar, Download, Filter } from "lucide-react";

const statusColors: Record<string, string> = {
  present: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
  late: "bg-amber-500/10 text-amber-500 border-amber-500/20",
  absent: "bg-red-500/10 text-red-500 border-red-500/20",
};

const statusIcons: Record<string, any> = { present: UserCheck, late: Clock, absent: UserX };

export default function HrAttendancePage() {
  const [data, setData] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [statusFilter, setStatusFilter] = useState("");

  const fetchData = async () => {
    setLoading(true);
    try {
      const params: any = { date };
      if (statusFilter) params.status = statusFilter;
      const { data: res } = await api.get("/hr/attendance", { params });
      setData(res.data || []);
      setSummary(res.summary || {});
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [date, statusFilter]);

  const exportToExcel = async () => {
    try {
      const { data } = await api.get("/hr/export/attendance", { params: { startDate: date, endDate: date }, responseType: "blob" });
      const url = URL.createObjectURL(new Blob([data]));
      const a = document.createElement("a"); a.href = url; a.download = `attendance_${date}.xlsx`; a.click();
    } catch (e) { alert("Export failed"); }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><UserCheck className="w-6 h-6 text-emerald-500" /> Attendance Management</h1>
          <p className="text-sm text-muted-foreground mt-1">Track employee attendance, check-in/out logs</p>
        </div>
        <Button variant="outline" size="sm" className="gap-1" onClick={exportToExcel}>
          <Download className="w-3.5 h-3.5" /> Export Excel
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Total", value: summary.total || 0, icon: Users, color: "text-blue-500" },
          { label: "Present", value: summary.present || 0, icon: UserCheck, color: "text-emerald-500" },
          { label: "Absent", value: summary.absent || 0, icon: UserX, color: "text-red-500" },
          { label: "Late", value: summary.late || 0, icon: Clock, color: "text-amber-500" },
        ].map(s => (
          <Card key={s.label}>
            <CardContent className="p-3 flex items-center gap-3">
              <s.icon className={`w-8 h-8 ${s.color}`} />
              <div><p className="text-xl font-bold">{s.value}</p><p className="text-[10px] text-muted-foreground">{s.label}</p></div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-3 items-center flex-wrap">
        <div className="flex items-center gap-1.5">
          <Calendar className="w-4 h-4 text-muted-foreground" />
          <Input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-[170px]" />
        </div>
        <div className="flex gap-1.5">
          {[{ label: "All", value: "" }, { label: "Present", value: "present" }, { label: "Absent", value: "absent" }, { label: "Late", value: "late" }].map(f => (
            <Button key={f.value} size="sm" variant={statusFilter === f.value ? "default" : "outline"} onClick={() => setStatusFilter(f.value)}>
              {f.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Attendance Table */}
      {loading ? <PageLoader /> : data.length === 0 ? (
        <EmptyState icon={<UserCheck className="w-12 h-12" />} title="No attendance records" />
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-xs text-muted-foreground">
                    <th className="px-4 py-3 text-left font-medium">Employee</th>
                    <th className="px-4 py-3 text-left font-medium">Department</th>
                    <th className="px-4 py-3 text-center font-medium">Status</th>
                    <th className="px-4 py-3 text-center font-medium">Check In</th>
                    <th className="px-4 py-3 text-center font-medium">Check Out</th>
                    <th className="px-4 py-3 text-center font-medium">Hours</th>
                    <th className="px-4 py-3 text-center font-medium">Late</th>
                    <th className="px-4 py-3 text-center font-medium">Overtime</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((row, i) => {
                    const Icon = statusIcons[row.status] || Users;
                    return (
                      <tr key={i} className="border-b border-border/50 hover:bg-accent/50 transition-colors">
                        <td className="px-4 py-3">
                          <p className="font-medium text-sm">{row.employee?.name}</p>
                          <p className="text-[10px] text-muted-foreground">{row.employee?.employeeId}</p>
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">{row.employee?.department || "-"}</td>
                        <td className="px-4 py-3 text-center">
                          <Badge className={`${statusColors[row.status]} text-[10px] capitalize`}><Icon className="w-3 h-3 mr-1" />{row.status}</Badge>
                        </td>
                        <td className="px-4 py-3 text-center text-xs">{row.checkIn ? new Date(row.checkIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "-"}</td>
                        <td className="px-4 py-3 text-center text-xs">{row.checkOut ? new Date(row.checkOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "-"}</td>
                        <td className="px-4 py-3 text-center text-xs font-medium">{row.workingHours ? `${row.workingHours}h` : "-"}</td>
                        <td className="px-4 py-3 text-center text-xs">{row.lateMinutes > 0 ? <span className="text-amber-500">{row.lateMinutes}m</span> : "-"}</td>
                        <td className="px-4 py-3 text-center text-xs">{row.overtimeMinutes > 0 ? <span className="text-blue-500">{row.overtimeMinutes}m</span> : "-"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
