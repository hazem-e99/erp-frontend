"use client";
import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { PageLoader, EmptyState } from "@/components/ui/loading";
import api from "@/lib/api";
import { toast } from "sonner";
import { Calendar, Save, Trash2 } from "lucide-react";

interface PayrollReminderRecord {
  _id: string;
  type: "all" | "intern";
  employeeId?: string;
  dayOfMonth: number;
}

interface Employee {
  _id: string;
  userId?: { name?: string };
  name?: string;
  employeeId?: string;
  contractTypes?: string[];
}

const days = Array.from({ length: 31 }, (_, i) => i + 1);

export default function PayrollReminders() {
  const [activeTab, setActiveTab] = useState<"all" | "internship">("all");
  const [loading, setLoading] = useState(true);
  const [savingAll, setSavingAll] = useState(false);
  const [savingIntern, setSavingIntern] = useState<Record<string, boolean>>({});
  const [allDay, setAllDay] = useState<number | "">("");
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [internDays, setInternDays] = useState<Record<string, number | "">>({});

  const isInternshipEmployee = (emp: Employee) =>
    (emp.contractTypes || []).some((ct) => ct.toLowerCase().includes("internship"));

  const internshipEmployees = useMemo(
    () => employees.filter(isInternshipEmployee),
    [employees],
  );

  const fetchData = async () => {
    setLoading(true);
    try {
      const [remindersRes, employeesRes] = await Promise.all([
        api.get("/reminders/payroll"),
        api.get("/employees", { params: { limit: 1000, status: "active" } }),
      ]);

      const reminders = remindersRes.data || {};
      const allReminder: PayrollReminderRecord | null = reminders.allReminder || null;
      const internReminders: PayrollReminderRecord[] = reminders.internReminders || [];

      setAllDay(allReminder?.dayOfMonth ?? "");

      const internMap: Record<string, number> = {};
      internReminders.forEach((r) => {
        if (r.employeeId) internMap[String(r.employeeId)] = r.dayOfMonth;
      });
      setInternDays(internMap);

      setEmployees(employeesRes.data.data || []);
    } catch (e) {
      console.error(e);
      toast.error("Failed to load payroll reminders");
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const saveAllDay = async () => {
    if (!allDay) return;
    setSavingAll(true);
    try {
      await api.post("/reminders/payroll/all", { dayOfMonth: Number(allDay) });
      toast.success("All payroll reminder updated");
    } catch (e: any) {
      toast.error(e.response?.data?.message || "Failed to update reminder");
    }
    setSavingAll(false);
  };

  const saveInternDay = async (employeeId: string) => {
    const day = internDays[employeeId];
    if (!day) return;
    setSavingIntern((s) => ({ ...s, [employeeId]: true }));
    try {
      await api.post("/reminders/payroll/intern", { employeeId, dayOfMonth: Number(day) });
      toast.success("Internship payroll reminder saved");
    } catch (e: any) {
      toast.error(e.response?.data?.message || "Failed to save reminder");
    }
    setSavingIntern((s) => ({ ...s, [employeeId]: false }));
  };

  const deleteInternDay = async (employeeId: string) => {
    setSavingIntern((s) => ({ ...s, [employeeId]: true }));
    try {
      await api.delete(`/reminders/payroll/intern/${employeeId}`);
      setInternDays((prev) => ({ ...prev, [employeeId]: "" }));
      toast.success("Internship payroll reminder removed");
    } catch (e: any) {
      toast.error(e.response?.data?.message || "Failed to remove reminder");
    }
    setSavingIntern((s) => ({ ...s, [employeeId]: false }));
  };

  if (loading) return <PageLoader />;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-2">
        <Calendar className="w-5 h-5 text-primary" />
        <h2 className="text-xl font-bold">Payroll Reminders</h2>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "all" | "internship") }>
        <TabsList>
          <TabsTrigger value="all">All Payroll</TabsTrigger>
          <TabsTrigger value="internship">Internship Payroll</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Monthly Reminder Day (All Payroll)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <select
                  className="h-10 rounded-lg border border-input bg-card px-3 text-sm"
                  value={allDay}
                  onChange={(e) => setAllDay(e.target.value ? Number(e.target.value) : "")}
                >
                  <option value="">Select day</option>
                  {days.map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
                <Button onClick={saveAllDay} disabled={!allDay || savingAll} className="gap-2">
                  <Save className="w-4 h-4" /> Save
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                This reminder applies to all non-internship payrolls.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="internship" className="space-y-4">
          {internshipEmployees.length === 0 ? (
            <EmptyState title="No internship employees" />
          ) : (
            <div className="space-y-3">
              {internshipEmployees.map((emp) => {
                const name = emp.name || emp.userId?.name || "Unknown";
                const day = internDays[emp._id] ?? "";
                return (
                  <Card key={emp._id}>
                    <CardContent className="p-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                      <div>
                        <div className="font-medium">{name}</div>
                        <div className="text-xs text-muted-foreground">{emp.employeeId || emp._id}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <select
                          className="h-9 rounded-lg border border-input bg-card px-3 text-sm"
                          value={day}
                          onChange={(e) => setInternDays((prev) => ({ ...prev, [emp._id]: e.target.value ? Number(e.target.value) : "" }))}
                        >
                          <option value="">Select day</option>
                          {days.map((d) => (
                            <option key={d} value={d}>{d}</option>
                          ))}
                        </select>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => saveInternDay(emp._id)}
                          disabled={!day || !!savingIntern[emp._id]}
                          className="gap-2"
                        >
                          <Save className="w-4 h-4" /> Save
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => deleteInternDay(emp._id)}
                          disabled={!!savingIntern[emp._id]}
                          className="text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
