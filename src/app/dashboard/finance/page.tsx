"use client";
import { useState } from "react";
import * as Tabs from "@radix-ui/react-tabs";
import { cn } from "@/lib/utils";
import { BarChart3, CreditCard, DollarSign, FileText, LayoutDashboard, Receipt, TrendingUp, Trash2, AlertTriangle } from "lucide-react";
import FinanceDashboard from "./components/FinanceDashboard";
import SubscriptionsTab from "./components/SubscriptionsTab";
import InstallmentsTab from "./components/InstallmentsTab";
import PaymentsTab from "./components/PaymentsTab";
import RevenueTab from "./components/RevenueTab";
import ExpensesTab from "./components/ExpensesTab";
import ReportsTab from "./components/ReportsTab";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import api from "@/lib/api";
import { toast } from "sonner";
import { FinancePeriodFilters, FinancePeriodPreset } from "./components/finance.types";

const TABS = [
  { id: "dashboard",     label: "Dashboard",     icon: LayoutDashboard },
  { id: "subscriptions", label: "Subscriptions", icon: CreditCard },
  { id: "installments",  label: "Installments",  icon: Receipt },
  { id: "payments",      label: "Payments",      icon: DollarSign },
  { id: "revenue",       label: "Revenue",       icon: TrendingUp },
  { id: "expenses",      label: "Expenses",      icon: FileText },
  { id: "reports",       label: "Reports",       icon: BarChart3 },
];

export default function FinancePage() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [showFirstConfirm, setShowFirstConfirm] = useState(false);
  const [showSecondConfirm, setShowSecondConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const today = new Date();
  const [filters, setFilters] = useState<FinancePeriodFilters>({
    preset: "specificMonth",
    month: today.getMonth() + 1,
    year: today.getFullYear(),
    startDate: "",
    endDate: "",
  });

  const monthOptions = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];
  const yearOptions = Array.from({ length: 7 }, (_, i) => today.getFullYear() - 3 + i);

  const handleFirstConfirm = () => {
    setShowFirstConfirm(false);
    setShowSecondConfirm(true);
  };

  const handleFinalDelete = async () => {
    setIsDeleting(true);
    try {
      const response = await api.delete('/finance/reports/clear-all-data');
      const data = response.data;
      
      toast.success(`Successfully deleted all finance data!`, {
        description: `Total records deleted: ${data.totalDeleted}`,
      });
      
      setShowSecondConfirm(false);
      
      // Refresh the page to show empty data
      window.location.reload();
    } catch (error: any) {
      console.error('Error deleting finance data:', error);
      toast.error('Failed to delete finance data', {
        description: error.response?.data?.message || error.message,
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Finance</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Revenue recognition, subscriptions &amp; cash flow
          </p>
        </div>

        {/* Clear All Data Button */}
        <AlertDialog open={showFirstConfirm} onOpenChange={setShowFirstConfirm}>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" size="sm" className="gap-2">
              <Trash2 className="w-4 h-4" />
              Clear All Data
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2 text-amber-600">
                <AlertTriangle className="w-5 h-5" />
                First Confirmation
              </AlertDialogTitle>
              <AlertDialogDescription asChild>
                <div className="text-base text-muted-foreground">
                  You are about to delete <strong>ALL finance data</strong> including:
                  <ul className="list-disc list-inside mt-2 space-y-1">
                    <li>All subscriptions</li>
                    <li>All installments</li>
                    <li>All payments</li>
                    <li>All revenue records</li>
                    <li>All expenses</li>
                  </ul>
                  <div className="mt-3 font-semibold text-destructive">
                    This action cannot be undone!
                  </div>
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleFirstConfirm}
                className="bg-amber-600 hover:bg-amber-700"
              >
                Continue to Final Confirmation
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Second Confirmation Dialog */}
        <AlertDialog open={showSecondConfirm} onOpenChange={setShowSecondConfirm}>
          <AlertDialogContent className="border-2 border-destructive">
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="w-6 h-6 animate-pulse" />
                Final Confirmation - Are You Absolutely Sure?
              </AlertDialogTitle>
              <AlertDialogDescription asChild>
                <div className="text-base text-muted-foreground">
                  <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 my-4">
                    <div className="font-bold text-destructive text-lg mb-2">
                      ⚠️ CRITICAL WARNING ⚠️
                    </div>
                    <div className="text-foreground">
                      This will <strong className="text-destructive">permanently delete ALL your finance data</strong>.
                    </div>
                    <div className="mt-2 text-foreground">
                      There is <strong className="underline">NO WAY</strong> to recover this data after deletion.
                    </div>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    If you're sure you want to proceed, click "DELETE EVERYTHING" below.
                  </div>
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isDeleting}>
                Cancel (Recommended)
              </AlertDialogCancel>
              <Button
                variant="destructive"
                onClick={handleFinalDelete}
                disabled={isDeleting}
                className="bg-red-600 hover:bg-red-700"
              >
                {isDeleting ? "Deleting..." : "DELETE EVERYTHING"}
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      <div className="rounded-xl border border-primary/20 bg-primary-light/50 p-4">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-3">
            <div className="lg:col-span-2">
              <label className="text-xs font-semibold text-primary mb-1.5 block">Period Preset</label>
              <select
                className="w-full h-10 rounded-md border border-primary/30 bg-background px-3 text-sm"
                value={filters.preset}
                onChange={(e) => setFilters((prev) => ({ ...prev, preset: e.target.value as FinancePeriodPreset }))}
              >
                <option value="ytd">Year To Date</option>
                <option value="thisMonth">This Month</option>
                <option value="last30">Last 30 Days</option>
                <option value="last90">Last 90 Days</option>
                <option value="specificMonth">Specific Month</option>
                <option value="custom">Custom Range</option>
              </select>
            </div>

            {filters.preset === "specificMonth" && (
              <>
                <div>
                  <label className="text-xs font-semibold text-primary mb-1.5 block">Month</label>
                  <select
                    className="w-full h-10 rounded-md border border-primary/30 bg-background px-3 text-sm"
                    value={filters.month}
                    onChange={(e) => setFilters((prev) => ({ ...prev, month: Number(e.target.value) }))}
                  >
                    {monthOptions.map((m, i) => (
                      <option key={m} value={i + 1}>{m}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-primary mb-1.5 block">Year</label>
                  <select
                    className="w-full h-10 rounded-md border border-primary/30 bg-background px-3 text-sm"
                    value={filters.year}
                    onChange={(e) => setFilters((prev) => ({ ...prev, year: Number(e.target.value) }))}
                  >
                    {yearOptions.map((y) => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </div>
              </>
            )}

            {filters.preset === "custom" && (
              <>
                <div>
                  <label className="text-xs font-semibold text-primary mb-1.5 block">From</label>
                  <input
                    type="date"
                    className="w-full h-10 rounded-md border border-primary/30 bg-background px-3 text-sm"
                    value={filters.startDate}
                    onChange={(e) => setFilters((prev) => ({ ...prev, startDate: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-primary mb-1.5 block">To</label>
                  <input
                    type="date"
                    className="w-full h-10 rounded-md border border-primary/30 bg-background px-3 text-sm"
                    value={filters.endDate}
                    onChange={(e) => setFilters((prev) => ({ ...prev, endDate: e.target.value }))}
                  />
                </div>
              </>
            )}
        </div>
      </div>

      <Tabs.Root value={activeTab} onValueChange={setActiveTab}>
        {/* Tab list */}
        <Tabs.List className="flex items-center gap-1 border-b border-border pb-0 overflow-x-auto scrollbar-none">
          {TABS.map((tab) => (
            <Tabs.Trigger
              key={tab.id}
              value={tab.id}
              className={cn(
                "flex items-center gap-2 px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 -mb-px transition-colors",
                activeTab === tab.id
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
              )}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </Tabs.Trigger>
          ))}
        </Tabs.List>

        {/* Tab content */}
        <div className="pt-6">
          <Tabs.Content value="dashboard"     forceMount className={activeTab !== "dashboard"     ? "hidden" : ""}><FinanceDashboard filters={filters} /></Tabs.Content>
          <Tabs.Content value="subscriptions" forceMount className={activeTab !== "subscriptions" ? "hidden" : ""}><SubscriptionsTab filters={filters} /></Tabs.Content>
          <Tabs.Content value="installments"  forceMount className={activeTab !== "installments"  ? "hidden" : ""}><InstallmentsTab filters={filters} /></Tabs.Content>
          <Tabs.Content value="payments"      forceMount className={activeTab !== "payments"      ? "hidden" : ""}><PaymentsTab filters={filters} /></Tabs.Content>
          <Tabs.Content value="revenue"       forceMount className={activeTab !== "revenue"       ? "hidden" : ""}><RevenueTab filters={filters} /></Tabs.Content>
          <Tabs.Content value="expenses"      forceMount className={activeTab !== "expenses"      ? "hidden" : ""}><ExpensesTab filters={filters} /></Tabs.Content>
          <Tabs.Content value="reports"       forceMount className={activeTab !== "reports"       ? "hidden" : ""}><ReportsTab filters={filters} /></Tabs.Content>
        </div>
      </Tabs.Root>
    </div>
  );
}
