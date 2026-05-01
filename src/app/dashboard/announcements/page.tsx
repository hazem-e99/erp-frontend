"use client";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { PageLoader, EmptyState } from "@/components/ui/loading";
import { useAuthStore } from "@/lib/store";
import api from "@/lib/api";
import MyReminders from "@/components/reminders/MyReminders";
import PayrollReminders from "@/components/reminders/PayrollReminders";
import {
  Megaphone, Plus, X, Loader2, Send, Users, Shield, Building2,
  FolderKanban, Globe, ChevronDown, BarChart3, Eye, Check, Bell, Calendar,
} from "lucide-react";

const targetTypeLabels: Record<string, { label: string; icon: any; color: string }> = {
  all: { label: "All Users", icon: Globe, color: "bg-blue-500/10 text-blue-500" },
  users: { label: "Specific Users", icon: Users, color: "bg-purple-500/10 text-purple-500" },
  roles: { label: "By Role", icon: Shield, color: "bg-orange-500/10 text-orange-500" },
  departments: { label: "By Department", icon: Building2, color: "bg-green-500/10 text-green-500" },
  projects: { label: "By Project", icon: FolderKanban, color: "bg-primary/10 text-primary" },
};

export default function AnnouncementsPage() {
  const { hasPermission } = useAuthStore();
  const canSend = hasPermission("announcements:send");

  const [activeTab, setActiveTab] = useState("announcements");
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [sending, setSending] = useState(false);

  // Form state
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [targetType, setTargetType] = useState("all");
  const [targetIds, setTargetIds] = useState<string[]>([]);

  // Lookup data
  const [users, setUsers] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);

  // Known departments
  const departments = ["Marketing", "Development", "Design", "HR", "Finance", "Sales", "Operations", "Management"];

  const fetchAnnouncements = async () => {
    setLoading(true);
    try { const { data } = await api.get("/announcements"); setAnnouncements(data.data || []); } catch (e) { console.error(e); }
    setLoading(false);
  };

  const fetchLookups = async () => {
    try { const { data } = await api.get("/users", { params: { limit: 200 } }); setUsers(data.data || []); } catch {}
    try { const rData = await api.get("/roles"); setRoles(rData.data || []); } catch {}
    try { const pData = await api.get("/projects", { params: { limit: 100 } }); setProjects(pData.data?.data || pData.data || []); } catch {}
  };

  useEffect(() => { fetchAnnouncements(); fetchLookups(); }, []);

  const resetForm = () => {
    setTitle(""); setMessage(""); setTargetType("all"); setTargetIds([]); setShowForm(false);
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !message) return;
    setSending(true);
    try {
      await api.post("/announcements", { title, message, targetType, targetIds: targetType === "all" ? [] : targetIds });
      resetForm();
      fetchAnnouncements();
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed to send");
    }
    setSending(false);
  };

  const toggleId = (id: string) => {
    setTargetIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  if (!canSend) {
    return (
      <div className="animate-fade-in text-center py-20">
        <Megaphone className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
        <h2 className="text-xl font-bold">Access Denied</h2>
        <p className="text-muted-foreground text-sm mt-2">You need the "announcements:send" permission.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Megaphone className="w-6 h-6 text-primary" /> Announcements & Reminders
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Send announcements and manage personal reminders</p>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="announcements">
            <Megaphone className="w-4 h-4 mr-2" />
            Team Announcements
          </TabsTrigger>
          <TabsTrigger value="reminders">
            <Bell className="w-4 h-4 mr-2" />
            My Reminders
          </TabsTrigger>
          <TabsTrigger value="payroll-reminders">
            <Calendar className="w-4 h-4 mr-2" />
            Payroll Reminders
          </TabsTrigger>
        </TabsList>

        {/* Announcements Tab */}
        <TabsContent value="announcements" className="space-y-6">
          <div className="flex items-center justify-end">
            <Button onClick={() => { resetForm(); setShowForm(true); }} className="gap-1">
              <Plus className="w-4 h-4" /> New Announcement
            </Button>
          </div>

      {/* Create Form */}
      {showForm && (
        <Card className="border-primary/30 shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base flex items-center gap-2"><Send className="w-4 h-4 text-primary" /> Compose Announcement</CardTitle>
            <Button variant="ghost" size="icon" onClick={resetForm}><X className="w-4 h-4" /></Button>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSend} className="space-y-4">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Title *</label>
                <Input placeholder="e.g. Office Update" value={title} onChange={(e) => setTitle(e.target.value)} required />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Message *</label>
                <textarea
                  className="w-full min-h-25 rounded-lg border border-input bg-card px-3 py-2.5 text-sm resize-y focus:outline-none focus:ring-2 focus:ring-primary/20"
                  placeholder="Write your announcement..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  required
                />
              </div>

              {/* Target Type Selection */}
              <div>
                <label className="text-xs text-muted-foreground mb-2 block">Target Audience</label>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  {Object.entries(targetTypeLabels).map(([key, { label, icon: Icon, color }]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => { setTargetType(key); setTargetIds([]); }}
                      className={`flex items-center gap-2 p-3 rounded-xl border text-xs font-medium transition-all cursor-pointer ${targetType === key ? "border-primary bg-primary/5 text-primary shadow-sm" : "border-border hover:border-primary/30"}`}
                    >
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${color}`}>
                        <Icon className="w-3.5 h-3.5" />
                      </div>
                      <span className="truncate">{label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Target Selector */}
              {targetType !== "all" && (
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">
                    Select {targetType === "users" ? "Users" : targetType === "roles" ? "Roles" : targetType === "departments" ? "Departments" : "Projects"}
                    {targetIds.length > 0 && <span className="ml-1 text-primary">({targetIds.length} selected)</span>}
                  </label>
                  <div className="max-h-50 overflow-y-auto rounded-lg border border-input p-2 space-y-1">
                    {targetType === "users" && users.map(u => (
                      <label key={u._id} className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors ${targetIds.includes(u._id) ? 'bg-primary/10' : 'hover:bg-accent'}`}>
                        <input type="checkbox" checked={targetIds.includes(u._id)} onChange={() => toggleId(u._id)} className="accent-primary" />
                        <span className="text-sm">{u.name}</span>
                        <span className="text-xs text-muted-foreground ml-auto">{u.email}</span>
                      </label>
                    ))}
                    {targetType === "roles" && roles.map(r => (
                      <label key={r._id} className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors ${targetIds.includes(r._id) ? 'bg-primary/10' : 'hover:bg-accent'}`}>
                        <input type="checkbox" checked={targetIds.includes(r._id)} onChange={() => toggleId(r._id)} className="accent-primary" />
                        <span className="text-sm">{r.name}</span>
                        <span className="text-xs text-muted-foreground ml-auto">{r.permissions?.length || 0} perms</span>
                      </label>
                    ))}
                    {targetType === "departments" && departments.map(d => (
                      <label key={d} className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors ${targetIds.includes(d) ? 'bg-primary/10' : 'hover:bg-accent'}`}>
                        <input type="checkbox" checked={targetIds.includes(d)} onChange={() => toggleId(d)} className="accent-primary" />
                        <span className="text-sm">{d}</span>
                      </label>
                    ))}
                    {targetType === "projects" && projects.map(p => (
                      <label key={p._id} className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors ${targetIds.includes(p._id) ? 'bg-primary/10' : 'hover:bg-accent'}`}>
                        <input type="checkbox" checked={targetIds.includes(p._id)} onChange={() => toggleId(p._id)} className="accent-primary" />
                        <span className="text-sm">{p.name}</span>
                        <Badge variant="secondary" className="ml-auto text-[10px]">{p.status}</Badge>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <Button type="submit" disabled={sending} className="gap-1">
                  {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  Send Announcement
                </Button>
                <Button type="button" variant="outline" onClick={resetForm}>Cancel</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Announcement History */}
      {loading ? <PageLoader /> : announcements.length === 0 ? (
        <EmptyState icon={<Megaphone className="w-12 h-12" />} title="No announcements sent yet" />
      ) : (
        <div className="space-y-3">
          {announcements.map((a) => {
            const tInfo = targetTypeLabels[a.targetType] || targetTypeLabels.all;
            const TIcon = tInfo.icon;
            const readRate = a.recipientCount > 0 ? Math.round((a.readCount / a.recipientCount) * 100) : 0;
            return (
              <Card key={a._id} className="group hover:border-primary/20 transition-all">
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${tInfo.color}`}>
                      <TIcon className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-sm font-semibold truncate">{a.title}</p>
                        <Badge variant="secondary" className="text-[10px]">{tInfo.label}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2">{a.message}</p>
                      <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Users className="w-3 h-3" /> {a.recipientCount} recipients
                        </span>
                        <span className="flex items-center gap-1">
                          <Eye className="w-3 h-3" /> {readRate}% read
                        </span>
                        <span>{new Date(a.createdAt).toLocaleDateString()} {new Date(a.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        {a.senderId && <span>by {a.senderId.name}</span>}
                      </div>
                      {/* Read rate bar */}
                      <div className="mt-2 h-1.5 bg-accent rounded-full overflow-hidden">
                        <div
                          className="h-full bg-linear-to-r from-primary to-success rounded-full transition-all duration-500"
                          style={{ width: `${readRate}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
        </TabsContent>

        {/* Reminders Tab */}
        <TabsContent value="reminders">
          <MyReminders />
        </TabsContent>

        <TabsContent value="payroll-reminders">
          <PayrollReminders />
        </TabsContent>
      </Tabs>
    </div>
  );
}
