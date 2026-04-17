"use client";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { PageLoader, EmptyState } from "@/components/ui/loading";
import { useAuthStore } from "@/lib/store";
import api from "@/lib/api";
import { Plus, Search, CheckSquare, Calendar, X, Loader2 } from "lucide-react";

const statusColors: Record<string, any> = {
  todo: 'secondary', 'in-progress': 'default', review: 'warning', completed: 'success'
};
const priorityColors: Record<string, any> = {
  low: 'secondary', medium: 'default', high: 'warning', urgent: 'destructive'
};

export default function TasksPage() {
  const { hasPermission } = useAuthStore();
  const isAdmin = hasPermission('dashboard:admin');
  const [tasks, setTasks] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', projectId: '', assignedTo: '', status: 'todo', priority: 'medium', deadline: '', estimatedHours: 0 });

  const fetchData = async () => {
    setLoading(true);
    try {
      // Admins see all tasks; employees see only their own
      const endpoint = isAdmin ? '/tasks' : '/tasks/my';
      const tRes = await api.get(endpoint, { params: { search } });
      setTasks(tRes.data.data || []);
    } catch (e) { console.error(e); }
    // Fetch employees & projects separately — may 403 for non-admin users
    try { const eRes = await api.get('/employees', { params: { limit: 100 } }); setEmployees(eRes.data.data || []); } catch {}
    try { const pRes = await api.get('/projects', { params: { limit: 100 } }); setProjects(pRes.data.data || []); } catch {}
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [search]);

  const resetForm = () => {
    setForm({ title: '', description: '', projectId: '', assignedTo: '', status: 'todo', priority: 'medium', deadline: '', estimatedHours: 0 });
    setEditId(null); setShowForm(false);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    try {
      if (editId) await api.put(`/tasks/${editId}`, form);
      else await api.post('/tasks', form);
      resetForm(); fetchData();
    } catch (e) { console.error(e); }
    setSaving(false);
  };

  const handleEdit = (t: any) => {
    setForm({
      title: t.title, description: t.description || '', projectId: t.projectId?._id || '',
      assignedTo: t.assignedTo?._id || '', status: t.status, priority: t.priority,
      deadline: t.deadline?.split('T')[0] || '', estimatedHours: t.estimatedHours || 0,
    });
    setEditId(t._id); setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete?')) return;
    await api.delete(`/tasks/${id}`); fetchData();
  };

  const handleStatusChange = async (id: string, status: string) => {
    await api.put(`/tasks/${id}`, { status }); fetchData();
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Tasks</h1>
          <p className="text-sm text-muted-foreground mt-1">Track and manage tasks</p>
        </div>
        <Button onClick={() => { resetForm(); setShowForm(true); }}><Plus className="w-4 h-4" /> New Task</Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search tasks..." className="pl-10" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {showForm && (
        <Card className="border-primary/20">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">{editId ? 'Edit Task' : 'New Task'}</CardTitle>
            <Button variant="ghost" size="icon" onClick={resetForm}><X className="w-4 h-4" /></Button>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input placeholder="Task Title *" value={form.title} onChange={(e) => setForm({...form, title: e.target.value})} required />
              <select className="h-10 rounded-lg border border-input bg-card px-3 text-sm" value={form.assignedTo} onChange={(e) => setForm({...form, assignedTo: e.target.value})} required>
                <option value="">Assign To *</option>
                {employees.map(e => <option key={e._id} value={e._id}>{e.userId?.name || e.employeeId}</option>)}
              </select>
              <select className="h-10 rounded-lg border border-input bg-card px-3 text-sm" value={form.projectId} onChange={(e) => setForm({...form, projectId: e.target.value})}>
                <option value="">Select Project</option>
                {projects.map(p => <option key={p._id} value={p._id}>{p.name}</option>)}
              </select>
              <select className="h-10 rounded-lg border border-input bg-card px-3 text-sm" value={form.priority} onChange={(e) => setForm({...form, priority: e.target.value})}>
                <option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="urgent">Urgent</option>
              </select>
              <Input type="date" value={form.deadline} onChange={(e) => setForm({...form, deadline: e.target.value})} />
              <Input type="number" placeholder="Est. Hours" value={form.estimatedHours || ''} onChange={(e) => setForm({...form, estimatedHours: +e.target.value})} />
              <div className="md:col-span-2"><Input placeholder="Description" value={form.description} onChange={(e) => setForm({...form, description: e.target.value})} /></div>
              <div className="md:col-span-2 flex gap-2">
                <Button type="submit" disabled={saving}>{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : editId ? 'Update' : 'Create'}</Button>
                <Button type="button" variant="outline" onClick={resetForm}>Cancel</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {loading ? <PageLoader /> : tasks.length === 0 ? (
        <EmptyState icon={<CheckSquare className="w-12 h-12" />} title="No tasks yet" />
      ) : (
        <div className="space-y-3">
          {tasks.map((t) => (
            <Card key={t._id} className="group">
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-4 flex-1">
                  <button onClick={() => handleStatusChange(t._id, t.status === 'completed' ? 'todo' : 'completed')}
                    className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors cursor-pointer ${t.status === 'completed' ? 'bg-success border-success text-white' : 'border-muted-foreground hover:border-primary'}`}>
                    {t.status === 'completed' && <CheckSquare className="w-3 h-3" />}
                  </button>
                  <div className="flex-1">
                    <p className={`text-sm font-medium ${t.status === 'completed' ? 'line-through text-muted-foreground' : ''}`}>{t.title}</p>
                    <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                      <span>{t.assignedTo?.userId?.name || 'Unassigned'}</span>
                      {t.projectId && <span>• {t.projectId.name}</span>}
                      {t.deadline && <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{new Date(t.deadline).toLocaleDateString()}</span>}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={priorityColors[t.priority]}>{t.priority}</Badge>
                  <Badge variant={statusColors[t.status]}>{t.status}</Badge>
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                    <Button size="sm" variant="ghost" onClick={() => handleEdit(t)}>Edit</Button>
                    <Button size="sm" variant="ghost" className="text-destructive" onClick={() => handleDelete(t._id)}>×</Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
