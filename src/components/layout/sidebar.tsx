"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useSidebarStore, useAuthStore } from "@/lib/store";
import {
  LayoutDashboard, Users, Briefcase, FolderKanban, CheckSquare,
  Clock, CalendarOff, DollarSign, Shield, ChevronLeft,
  ChevronRight, Sparkles, UserCircle, Megaphone, Bell, BarChart3,
  Receipt, FileText, Database,
} from "lucide-react";

const navItems = [
  { label: "Dashboard",    href: "/dashboard",                icon: LayoutDashboard, permission: null },
  { label: "CRM / Clients",href: "/dashboard/clients",        icon: Users,           permission: "clients:read" },
  { label: "Projects",     href: "/dashboard/projects",       icon: FolderKanban,    permission: "projects:read" },
  { label: "Tasks",        href: "/dashboard/tasks",          icon: CheckSquare,     permission: "tasks:read" },
  { label: "Attendance",   href: "/dashboard/attendance",     icon: Clock,           permission: null },
  { label: "HR / Leaves",  href: "/dashboard/leaves",         icon: CalendarOff,     permission: "leaves:read" },
  { label: "Employees",    href: "/dashboard/employees",      icon: Briefcase,       permission: "employees:read" },
  { label: "Payroll",      href: "/dashboard/payroll",        icon: DollarSign,      permission: "payroll:read" },
  { label: "Finance",      href: "/dashboard/finance",        icon: Receipt,         permission: "finance:read" },
  { label: "HR Dashboard", href: "/dashboard/hr",             icon: BarChart3,       permission: "hr:dashboard" },
  { label: "My Profile",   href: "/dashboard/profile",        icon: UserCircle,      permission: null },
  { label: "Notifications",href: "/dashboard/notifications",  icon: Bell,            permission: null },
  { label: "Announcements",href: "/dashboard/announcements",  icon: Megaphone,       permission: "announcements:send" },
  { label: "Audit Log",    href: "/dashboard/audit",          icon: FileText,        permission: "audit:read" },
  { label: "Roles & Access",href: "/dashboard/roles",         icon: Shield,          permission: "roles:read" },
  { label: "DB Backup",    href: "/dashboard/settings/backup",icon: Database,        permission: "backup:export" },
];

export function Sidebar() {
  const pathname = usePathname();
  const { collapsed, toggle } = useSidebarStore();
  const { hasPermission } = useAuthStore();

  const filteredItems = navItems.filter(
    (item) => !item.permission || hasPermission(item.permission)
  );

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-40 h-screen bg-card border-r border-border flex flex-col transition-all duration-300",
        collapsed ? "w-[72px]" : "w-[260px]"
      )}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 h-16 border-b border-border flex-shrink-0">
        {/* ✅ removed to-orange-600 — now uses primary-active as gradient end */}
        <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-primary to-[var(--primary-active)] flex items-center justify-center flex-shrink-0 shadow-md shadow-primary/30">
          <Sparkles className="w-5 h-5 text-white" />
        </div>
        {!collapsed && (
          <div className="animate-fade-in">
            <h1 className="font-bold text-base tracking-tight">AgencyERP</h1>
            <p className="text-[10px] text-muted-foreground -mt-0.5">Marketing Suite</p>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
        {filteredItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/dashboard" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group",
                isActive
                  ? "bg-primary/10 text-primary shadow-sm"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
            >
              <item.icon
                className={cn(
                  "w-5 h-5 flex-shrink-0 transition-colors",
                  isActive && "text-primary"
                )}
              />
              {!collapsed && (
                <span className="animate-fade-in truncate">{item.label}</span>
              )}
              {isActive && !collapsed && (
                <div className="ml-auto w-1.5 h-1.5 rounded-full bg-primary animate-pulse-glow" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Collapse Toggle */}
      <button
        onClick={toggle}
        className="flex items-center justify-center h-12 border-t border-border hover:bg-accent transition-colors cursor-pointer"
      >
        {collapsed
          ? <ChevronRight className="w-4 h-4" />
          : <ChevronLeft  className="w-4 h-4" />
        }
      </button>
    </aside>
  );
}
