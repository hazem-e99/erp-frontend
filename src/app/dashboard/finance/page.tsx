"use client";
import { useState } from "react";
import * as Tabs from "@radix-ui/react-tabs";
import { cn } from "@/lib/utils";
import { BarChart3, CreditCard, DollarSign, FileText, LayoutDashboard, Receipt, TrendingUp } from "lucide-react";
import FinanceDashboard from "./components/FinanceDashboard";
import SubscriptionsTab from "./components/SubscriptionsTab";
import InstallmentsTab from "./components/InstallmentsTab";
import PaymentsTab from "./components/PaymentsTab";
import RevenueTab from "./components/RevenueTab";
import ExpensesTab from "./components/ExpensesTab";
import ReportsTab from "./components/ReportsTab";

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

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold">Finance</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Revenue recognition, subscriptions &amp; cash flow
        </p>
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
          <Tabs.Content value="dashboard"     forceMount className={activeTab !== "dashboard"     ? "hidden" : ""}><FinanceDashboard /></Tabs.Content>
          <Tabs.Content value="subscriptions" forceMount className={activeTab !== "subscriptions" ? "hidden" : ""}><SubscriptionsTab /></Tabs.Content>
          <Tabs.Content value="installments"  forceMount className={activeTab !== "installments"  ? "hidden" : ""}><InstallmentsTab /></Tabs.Content>
          <Tabs.Content value="payments"      forceMount className={activeTab !== "payments"      ? "hidden" : ""}><PaymentsTab /></Tabs.Content>
          <Tabs.Content value="revenue"       forceMount className={activeTab !== "revenue"       ? "hidden" : ""}><RevenueTab /></Tabs.Content>
          <Tabs.Content value="expenses"      forceMount className={activeTab !== "expenses"      ? "hidden" : ""}><ExpensesTab /></Tabs.Content>
          <Tabs.Content value="reports"       forceMount className={activeTab !== "reports"       ? "hidden" : ""}><ReportsTab /></Tabs.Content>
        </div>
      </Tabs.Root>
    </div>
  );
}
