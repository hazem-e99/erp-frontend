"use client";
import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageLoader, EmptyState } from "@/components/ui/loading";
import api from "@/lib/api";
import { Bell, BellOff, CheckCheck, Trash2, Filter, Megaphone, Info, Clock } from "lucide-react";

const typeIcons: Record<string, any> = {
  announcement: Megaphone,
  system: Info,
  task: Clock,
  leave: BellOff,
};

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("");
  const [unreadCount, setUnreadCount] = useState(0);
  const [total, setTotal] = useState(0);

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = { limit: 50 };
      if (filter) params.filter = filter;
      const { data } = await api.get("/notifications", { params });
      setNotifications(data.data || []);
      setUnreadCount(data.unreadCount || 0);
      setTotal(data.total || 0);
    } catch (e) { console.error(e); }
    setLoading(false);
  }, [filter]);

  useEffect(() => { fetchNotifications(); }, [fetchNotifications]);

  // Poll for new notifications every 30s
  useEffect(() => {
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  const markAsRead = async (id: string) => {
    try {
      await api.put(`/notifications/${id}/read`);
      setNotifications(prev => prev.map(n => n._id === id ? { ...n, isRead: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (e) { console.error(e); }
  };

  const markAllRead = async () => {
    try {
      await api.put("/notifications/read-all");
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (e) { console.error(e); }
  };

  const deleteNotification = async (id: string) => {
    try {
      await api.delete(`/notifications/${id}`);
      setNotifications(prev => prev.filter(n => n._id !== id));
      setTotal(prev => prev - 1);
    } catch (e) { console.error(e); }
  };

  const formatTime = (date: string) => {
    const d = new Date(date);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    return d.toLocaleDateString();
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-3xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Bell className="w-6 h-6 text-primary" /> Notifications
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {unreadCount > 0 ? `${unreadCount} unread` : "All caught up!"} • {total} total
          </p>
        </div>
        {unreadCount > 0 && (
          <Button variant="outline" size="sm" onClick={markAllRead}>
            <CheckCheck className="w-4 h-4 mr-1" /> Mark All Read
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        {[{ label: "All", value: "" }, { label: "Unread", value: "unread" }, { label: "Read", value: "read" }].map(f => (
          <Button
            key={f.value}
            size="sm"
            variant={filter === f.value ? "default" : "outline"}
            onClick={() => setFilter(f.value)}
            className="gap-1"
          >
            {f.value === "unread" && <Filter className="w-3 h-3" />}
            {f.label}
            {f.value === "unread" && unreadCount > 0 && (
              <span className="ml-1 px-1.5 py-0.5 text-[10px] bg-white/20 rounded-full">{unreadCount}</span>
            )}
          </Button>
        ))}
      </div>

      {/* List */}
      {loading ? <PageLoader /> : notifications.length === 0 ? (
        <EmptyState icon={<BellOff className="w-12 h-12" />} title={filter === "unread" ? "No unread notifications" : "No notifications yet"} />
      ) : (
        <div className="space-y-2">
          {notifications.map(n => {
            const Icon = typeIcons[n.type] || Bell;
            return (
              <Card
                key={n._id}
                className={`group transition-all duration-200 cursor-pointer ${!n.isRead ? 'border-primary/30 bg-primary/[0.03] shadow-sm' : 'opacity-80 hover:opacity-100'}`}
                onClick={() => !n.isRead && markAsRead(n._id)}
              >
                <CardContent className="p-4 flex items-start gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors ${!n.isRead ? 'bg-primary/10 text-primary' : 'bg-accent text-muted-foreground'}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className={`text-sm font-medium truncate ${!n.isRead ? '' : 'text-muted-foreground'}`}>{n.title}</p>
                      {!n.isRead && <span className="w-2 h-2 rounded-full bg-primary animate-pulse shrink-0" />}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.message}</p>
                    <div className="flex items-center gap-2 mt-1.5">
                      <Badge variant="secondary" className="text-[10px] py-0 px-1.5">{n.type}</Badge>
                      <span className="text-[10px] text-muted-foreground">{formatTime(n.createdAt)}</span>
                    </div>
                  </div>
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 shrink-0">
                    {!n.isRead && (
                      <Button size="icon" variant="ghost" className="h-7 w-7" title="Mark read" onClick={(e) => { e.stopPropagation(); markAsRead(n._id); }}>
                        <CheckCheck className="w-3.5 h-3.5 text-success" />
                      </Button>
                    )}
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" title="Delete" onClick={(e) => { e.stopPropagation(); deleteNotification(n._id); }}>
                      <Trash2 className="w-3.5 h-3.5" />
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
