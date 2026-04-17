"use client";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useAuthStore, useThemeStore, useSidebarStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Sun, Moon, LogOut, Bell, User } from "lucide-react";
import api from "@/lib/api";

export function Header() {
  const { user, logout }        = useAuthStore();
  const { theme, toggleTheme }  = useThemeStore();
  const { collapsed }           = useSidebarStore();
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchUnread = useCallback(async () => {
    try {
      const { data } = await api.get("/notifications/unread-count");
      setUnreadCount(data.count || 0);
    } catch {}
  }, []);

  useEffect(() => {
    fetchUnread();
    const interval = setInterval(fetchUnread, 30000);
    return () => clearInterval(interval);
  }, [fetchUnread]);

  return (
    <header
      className="fixed top-0 right-0 z-30 h-16 bg-card/80 backdrop-blur-md border-b border-border flex items-center justify-between px-6 transition-all duration-300"
      style={{ left: collapsed ? "72px" : "260px" }}
    >
      <div>
        <h2 className="text-sm font-semibold">Welcome back,</h2>
        <p className="text-xs text-muted-foreground">{user?.name || "User"}</p>
      </div>

      <div className="flex items-center gap-2">
        {/* Notification bell */}
        <Link href="/dashboard/notifications">
          <Button variant="ghost" size="icon" className="relative" title="Notifications">
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center bg-primary text-white text-[10px] font-bold rounded-full px-1 animate-pulse">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </Button>
        </Link>

        {/* Theme toggle */}
        <Button variant="ghost" size="icon" onClick={toggleTheme} title="Toggle theme">
          {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </Button>

        {/* User avatar + logout */}
        <div className="flex items-center gap-2 ml-2 pl-3 border-l border-border">
          {/* ✅ removed to-orange-600 — gradient now primary → primary-active */}
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-[var(--primary-active)] flex items-center justify-center shadow-sm shadow-primary/30">
            <User className="w-4 h-4 text-white" />
          </div>
          <div className="hidden md:block">
            <p className="text-xs font-medium truncate max-w-[120px]">{user?.name}</p>
            <p className="text-[10px] text-muted-foreground">{user?.role?.name || "User"}</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={logout}
            title="Logout"
            className="text-muted-foreground hover:text-destructive"
          >
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </header>
  );
}
