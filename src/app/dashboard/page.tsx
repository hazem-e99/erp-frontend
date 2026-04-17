"use client";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageLoader } from "@/components/ui/loading";
import { useAuthStore } from "@/lib/store";
import api from "@/lib/api";
import {
  Users, FolderKanban, DollarSign, TrendingUp, Clock, CheckSquare,
  AlertTriangle, ArrowUpRight, ArrowDownRight,
} from "lucide-react";

interface DashboardData {
  stats: Record<string, number>;
  finance: { totalRevenue: number; totalExpenses: number; profit: number; profitMargin: number };
  recentProjects: any[];
  overdueTasks: any[];
}

interface EmployeeDashData {
  employee: any;
  attendance: any;
  tasks: any;
  leaveBalance: any;
  latestPayroll: any;
}

function StatCard({ title, value, icon: Icon, trend, color }: {
  title: string; value: string | number; icon: any; trend?: string; color?: string;
}) {
  const isPositive = trend?.startsWith("+");
  return (
    <Card className="group hover:border-primary/20">
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <h3 className="text-2xl font-bold mt-1">{value}</h3>
            {trend && (
              <div className={`flex items-center gap-1 mt-1 text-xs font-medium ${isPositive ? "text-success" : "text-destructive"}`}>
                {isPositive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                {trend}
              </div>
            )}
          </div>
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110 ${color || "bg-primary/10 text-primary"}`}>
            <Icon className="w-6 h-6" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  const { hasPermission } = useAuthStore();
  const isAdmin = hasPermission("dashboard:admin");
  const [adminData, setAdminData] = useState<DashboardData | null>(null);
  const [empData, setEmpData]     = useState<EmployeeDashData | null>(null);
  const [loading, setLoading]     = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        if (isAdmin) {
          const { data } = await api.get("/dashboard/admin");
          setAdminData(data);
        }
        const { data } = await api.get("/dashboard/employee");
        setEmpData(data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [isAdmin]);

  if (loading) return <PageLoader />;

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {isAdmin ? "Overview of your agency's performance" : "Your personal workspace"}
        </p>
      </div>

      {/* Admin Stats */}
      {isAdmin && adminData && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard title="Total Revenue"    value={`$${(adminData.finance.totalRevenue || 0).toLocaleString()}`}  icon={DollarSign}   color="bg-success/10 text-success" />
            <StatCard title="Expenses"         value={`$${(adminData.finance.totalExpenses || 0).toLocaleString()}`} icon={TrendingUp}   color="bg-destructive/10 text-destructive" />
            <StatCard title="Active Projects"  value={adminData.stats.activeProjects  || 0}                           icon={FolderKanban} color="bg-primary/10 text-primary" />
            <StatCard title="Employees"        value={adminData.stats.activeEmployees || 0}                           icon={Users}        color="bg-blue-500/10 text-blue-500" />
          </div>

          {/* ✅ removed to-orange-600/5 — now primary → primary-active gradient */}
          <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-[var(--primary-active)]/5">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Net Profit</p>
                  <h3 className="text-3xl font-bold text-primary mt-1">
                    ${(adminData.finance.profit || 0).toLocaleString()}
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">Margin: {adminData.finance.profitMargin}%</p>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="text-center"><p className="text-muted-foreground">Projects</p><p className="font-bold text-lg">{adminData.stats.totalProjects  || 0}</p></div>
                  <div className="text-center"><p className="text-muted-foreground">Clients</p> <p className="font-bold text-lg">{adminData.stats.totalClients   || 0}</p></div>
                  <div className="text-center"><p className="text-muted-foreground">Tasks Done</p><p className="font-bold text-lg">{adminData.stats.completedTasks || 0}</p></div>
                  <div className="text-center"><p className="text-muted-foreground">Pending Leaves</p><p className="font-bold text-lg">{adminData.stats.pendingLeaves || 0}</p></div>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <FolderKanban className="w-4 h-4 text-primary" /> Recent Projects
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {adminData.recentProjects?.length ? adminData.recentProjects.map((p: any) => (
                  <div key={p._id} className="flex items-center justify-between p-3 rounded-lg bg-accent/50">
                    <div>
                      <p className="text-sm font-medium">{p.name}</p>
                      <p className="text-xs text-muted-foreground">{p.clientId?.name || "No Client"}</p>
                    </div>
                    <Badge variant={p.status === "completed" ? "success" : p.status === "in-progress" ? "default" : "secondary"}>
                      {p.status}
                    </Badge>
                  </div>
                )) : <p className="text-sm text-muted-foreground text-center py-4">No projects yet</p>}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-warning" /> Overdue Tasks
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {adminData.overdueTasks?.length ? adminData.overdueTasks.map((t: any) => (
                  <div key={t._id} className="flex items-center justify-between p-3 rounded-lg bg-destructive/5 border border-destructive/10">
                    <div>
                      <p className="text-sm font-medium">{t.title}</p>
                      <p className="text-xs text-muted-foreground">{t.assignedTo?.userId?.name || "Unassigned"}</p>
                    </div>
                    <Badge variant="destructive">Overdue</Badge>
                  </div>
                )) : <p className="text-sm text-muted-foreground text-center py-4">No overdue tasks 🎉</p>}
              </CardContent>
            </Card>
          </div>
        </>
      )}

      {/* Employee Dashboard */}
      {empData && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="My Tasks"     value={empData.tasks?.total      || 0}   icon={CheckSquare} color="bg-primary/10 text-primary" />
          <StatCard title="In Progress"  value={empData.tasks?.inProgress  || 0}   icon={Clock}       color="bg-blue-500/10 text-blue-500" />
          <StatCard
            title="Today"
            value={empData.attendance?.checkedIn ? (empData.attendance?.checkedOut ? "Done" : "Working") : "Not In"}
            icon={Clock}
            color={empData.attendance?.checkedIn ? "bg-success/10 text-success" : "bg-warning/10 text-warning"}
          />
          <StatCard title="Leave Balance" value={`${empData.leaveBalance?.remaining || 0} days`} icon={Users} color="bg-purple-500/10 text-purple-500" />
        </div>
      )}

      {empData?.tasks?.upcoming?.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <CheckSquare className="w-4 h-4 text-primary" /> Upcoming Tasks
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {empData!.tasks.upcoming.map((task: any) => (
              <div key={task._id} className="flex items-center justify-between p-3 rounded-lg bg-accent/50">
                <div>
                  <p className="text-sm font-medium">{task.title}</p>
                  <p className="text-xs text-muted-foreground">{task.projectId?.name || "No Project"}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={task.priority === "urgent" ? "destructive" : task.priority === "high" ? "warning" : "secondary"}>
                    {task.priority}
                  </Badge>
                  <Badge variant={task.status === "in-progress" ? "default" : "secondary"}>
                    {task.status}
                  </Badge>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {empData?.latestPayroll && (
        <Card className="border-success/20">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Latest Salary</p>
                <h3 className="text-2xl font-bold mt-1">${empData.latestPayroll.netSalary?.toLocaleString()}</h3>
                <p className="text-xs text-muted-foreground">Period: {empData.latestPayroll.period}</p>
              </div>
              <Badge variant={empData.latestPayroll.status === "paid" ? "success" : "warning"}>
                {empData.latestPayroll.status}
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
