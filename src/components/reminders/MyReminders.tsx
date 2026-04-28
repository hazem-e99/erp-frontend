"use client";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { PageLoader, EmptyState } from "@/components/ui/loading";
import api from "@/lib/api";
import { toast } from "sonner";
import {  Bell, Plus, X, Loader2, Calendar, DollarSign, Trash2, Edit, CheckCircle2, RefreshCw } from "lucide-react";

const reminderPeriodOptions = [
  { value: "7days", label: "7 أيام قبل الموعد", icon: "📅" },
  { value: "3days", label: "3 أيام قبل الموعد", icon: "📆" },
  { value: "24hours", label: "24 ساعة قبل الموعد", icon: "⏰" },
  { value: "sameday", label: "في نفس اليوم", icon: "🔔" },
];

export default function MyReminders() {
  const [reminders, setReminders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  // Form state
  const [form, setForm] = useState({
    title: "",
    description: "",
    amount: 0,
    reminderDate: "",
    reminderPeriods: [] as string[],
    isMonthlyRecurring: false,
    monthlyDay: 1,
  });

  const fetchReminders = async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/reminders");
      setReminders(data || []);
    } catch (e) {
      console.error(e);
      toast.error("Failed to load reminders");
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchReminders();
  }, []);

  const resetForm = () => {
    setForm({
      title: "",
      description: "",
      amount: 0,
      reminderDate: "",
      reminderPeriods: [],
      isMonthlyRecurring: false,
      monthlyDay: 1,
    });
    setEditId(null);
    setShowForm(false);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title || !form.reminderDate) {
      toast.error("Please fill required fields");
      return;
    }

    if (form.isMonthlyRecurring && (!form.monthlyDay || form.monthlyDay < 1 || form.monthlyDay > 31)) {
      toast.error("Please select a valid day (1-31) for monthly recurrence");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        ...form,
        // Only send monthlyDay if recurring is enabled
        monthlyDay: form.isMonthlyRecurring ? form.monthlyDay : undefined,
      };

      if (editId) {
        await api.put(`/reminders/${editId}`, payload);
        toast.success("Reminder updated successfully");
      } else {
        await api.post("/reminders", payload);
        toast.success("Reminder created successfully");
      }
      resetForm();
      fetchReminders();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to save reminder");
    }
    setSaving(false);
  };

  const handleEdit = (reminder: any) => {
    setForm({
      title: reminder.title,
      description: reminder.description,
      amount: reminder.amount || 0,
      reminderDate: reminder.reminderDate?.split('T')[0] || "",
      reminderPeriods: reminder.reminderPeriods || [],
      isMonthlyRecurring: reminder.isMonthlyRecurring || false,
      monthlyDay: reminder.monthlyDay || 1,
    });
    setEditId(reminder._id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this reminder?")) return;
    try {
      await api.delete(`/reminders/${id}`);
      toast.success("Reminder deleted");
      fetchReminders();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to delete");
    }
  };

  const handleMarkComplete = async (id: string) => {
    try {
      await api.put(`/reminders/${id}`, { status: "completed" });
      toast.success("Marked as completed");
      fetchReminders();
    } catch (err: any) {
      toast.error("Failed to update status");
    }
  };

  const togglePeriod = (period: string) => {
    setForm((prev) => ({
      ...prev,
      reminderPeriods: prev.reminderPeriods.includes(period)
        ? prev.reminderPeriods.filter((p) => p !== period)
        : [...prev.reminderPeriods, period],
    }));
  };

  const handleTestEmail = async () => {
    try {
      await api.post("/reminders/test-email");
      toast.success("✅ Test email sent! Check your inbox at hazem@intlakaa.com");
    } catch (err: any) {
      toast.error("Failed to send test email");
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Bell className="w-5 h-5 text-primary" /> My Personal Reminders
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Set reminders and get email notifications
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={handleTestEmail}
            variant="outline"
            className="gap-1"
          >
            📧 Test Email
          </Button>
          <Button
            onClick={() => {
              resetForm();
              setShowForm(true);
            }}
            className="gap-1"
          >
            <Plus className="w-4 h-4" /> New Reminder
          </Button>
        </div>
      </div>

      {/* Create/Edit Form */}
      {showForm && (
        <Card className="border-primary/30 shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base">
              {editId ? "Edit Reminder" : "Create Reminder"}
            </CardTitle>
            <Button variant="ghost" size="icon" onClick={resetForm}>
              <X className="w-4 h-4" />
            </Button>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Title <span className="text-destructive">*</span>
                  </label>
                  <Input
                    placeholder="e.g. Pay Internet Bill"
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Date <span className="text-destructive">*</span>
                  </label>
                  <Input
                    type="date"
                    value={form.reminderDate}
                    onChange={(e) => setForm({ ...form, reminderDate: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Description</label>
                <textarea
                  className="w-full min-h-20 rounded-lg border border-input bg-card px-3 py-2 text-sm resize-y focus:outline-none focus:ring-2 focus:ring-primary/20"
                  placeholder="Additional details..."
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Amount (Optional)</label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="number"
                    placeholder="0"
                    className="pl-10"
                    value={form.amount || ""}
                    onChange={(e) => setForm({ ...form, amount: +e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Reminder Periods (Select multiple)
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {reminderPeriodOptions.map((option) => (
                    <label
                      key={option.value}
                      className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                        form.reminderPeriods.includes(option.value)
                          ? "border-primary bg-primary/5"
                          : "border-input hover:border-primary/50"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={form.reminderPeriods.includes(option.value)}
                        onChange={() => togglePeriod(option.value)}
                        className="accent-primary"
                      />
                      <span className="text-lg">{option.icon}</span>
                      <span className="text-sm">{option.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* ─── Monthly Recurring Section ─── */}
              <div className="space-y-3">
                <label
                  className={`flex items-center gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all ${
                    form.isMonthlyRecurring
                      ? "border-emerald-500 bg-emerald-500/5"
                      : "border-input hover:border-emerald-500/50"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={form.isMonthlyRecurring}
                    onChange={(e) =>
                      setForm({ ...form, isMonthlyRecurring: e.target.checked })
                    }
                    className="accent-emerald-500 w-4 h-4"
                  />
                  <RefreshCw className={`w-5 h-5 ${form.isMonthlyRecurring ? "text-emerald-500" : "text-muted-foreground"}`} />
                  <div className="flex-1">
                    <span className="text-sm font-semibold">
                      Repeat Monthly تكرار شهري
                    </span>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Send email notification every month on a specific day
                    </p>
                  </div>
                </label>

                {form.isMonthlyRecurring && (
                  <div className="ml-4 p-4 rounded-lg bg-emerald-500/5 border border-emerald-500/20 space-y-3 animate-fade-in">
                    <label className="text-sm font-medium flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-emerald-600" />
                      Day of month يوم التكرار <span className="text-destructive">*</span>
                    </label>
                    <div className="flex items-center gap-3">
                      <select
                        className="h-10 rounded-lg border border-input bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 w-24"
                        value={form.monthlyDay}
                        onChange={(e) =>
                          setForm({ ...form, monthlyDay: parseInt(e.target.value) })
                        }
                      >
                        {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                          <option key={day} value={day}>
                            {day}
                          </option>
                        ))}
                      </select>
                      <span className="text-sm text-muted-foreground">
                        of every month — من كل شهر
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      💡 If the month has fewer days (e.g. Feb 28), the reminder will be sent on the last day of that month.
                    </p>
                  </div>
                )}
              </div>

              <div className="flex gap-2 pt-2">
                <Button type="submit" disabled={saving} className="gap-1">
                  {saving ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : editId ? (
                    "Update"
                  ) : (
                    "Create"
                  )}
                </Button>
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Reminders List */}
      {loading ? (
        <PageLoader />
      ) : reminders.length === 0 ? (
        <EmptyState icon={<Bell className="w-12 h-12" />} title="No reminders yet" />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {reminders.map((reminder) => {
            const isOverdue = new Date(reminder.reminderDate) < new Date();
            const isPending = reminder.status === "pending";
            const daysUntil = Math.ceil(
              (new Date(reminder.reminderDate).getTime() - new Date().getTime()) /
                (1000 * 60 * 60 * 24)
            );

            return (
              <Card
                key={reminder._id}
                className={`group hover:shadow-md transition-all ${
                  reminder.status === "completed"
                    ? "opacity-60"
                    : isOverdue && isPending && !reminder.isMonthlyRecurring
                    ? "border-destructive/50"
                    : reminder.isMonthlyRecurring
                    ? "border-emerald-500/30"
                    : ""
                }`}
              >
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="font-semibold text-base flex items-center gap-2">
                        {reminder.title}
                        {reminder.status === "completed" && (
                          <CheckCircle2 className="w-4 h-4 text-success" />
                        )}
                      </h3>
                      {reminder.description && (
                        <p className="text-sm text-muted-foreground mt-1">
                          {reminder.description}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <Badge
                        variant={
                          reminder.status === "completed"
                            ? "success"
                            : isOverdue && !reminder.isMonthlyRecurring
                            ? "destructive"
                            : "secondary"
                        }
                        className="text-xs"
                      >
                        {reminder.status === "completed"
                          ? "Completed"
                          : isOverdue && !reminder.isMonthlyRecurring
                          ? "Overdue"
                          : "Pending"}
                      </Badge>
                      {reminder.isMonthlyRecurring && (
                        <Badge className="text-xs bg-emerald-500/10 text-emerald-600 border-emerald-500/30 hover:bg-emerald-500/20">
                          <RefreshCw className="w-3 h-3 mr-1" />
                          Monthly Day {reminder.monthlyDay}
                        </Badge>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Calendar className="w-4 h-4" />
                      <span>
                        {reminder.isMonthlyRecurring ? (
                          <>
                            Every month on the{" "}
                            <strong className="text-emerald-600">
                              {reminder.monthlyDay}
                              {reminder.monthlyDay === 1 ? "st" : reminder.monthlyDay === 2 ? "nd" : reminder.monthlyDay === 3 ? "rd" : "th"}
                            </strong>
                          </>
                        ) : (
                          new Date(reminder.reminderDate).toLocaleDateString("en-US", {
                            weekday: "short",
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          })
                        )}
                      </span>
                      {isPending && !isOverdue && !reminder.isMonthlyRecurring && (
                        <span className="text-primary font-medium">
                          ({daysUntil} days left)
                        </span>
                      )}
                    </div>

                    {reminder.amount > 0 && (
                      <div className="flex items-center gap-2 text-primary font-medium">
                        <DollarSign className="w-4 h-4" />
                        <span>${reminder.amount.toLocaleString()}</span>
                      </div>
                    )}

                    {reminder.reminderPeriods && reminder.reminderPeriods.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {reminder.reminderPeriods.map((period: string) => {
                          const option = reminderPeriodOptions.find(
                            (o) => o.value === period
                          );
                          return (
                            <Badge
                              key={period}
                              variant="outline"
                              className="text-xs"
                            >
                              {option?.icon} {option?.label.split(" قبل")[0]}
                            </Badge>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2 mt-4 opacity-0 group-hover:opacity-100 transition-opacity">
                    {isPending && !reminder.isMonthlyRecurring && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleMarkComplete(reminder._id)}
                        className="gap-1"
                      >
                        <CheckCircle2 className="w-3 h-3" />
                        Complete
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleEdit(reminder)}
                      className="gap-1"
                    >
                      <Edit className="w-3 h-3" />
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive gap-1"
                      onClick={() => handleDelete(reminder._id)}
                    >
                      <Trash2 className="w-3 h-3" />
                      Delete
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
