"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { PageLoader, EmptyState } from "@/components/ui/loading";
import api from "@/lib/api";
import { Plus, Search, FolderKanban, Calendar, DollarSign, X, Loader2, Eye } from "lucide-react";

const statusColors: Record<string, any> = {
  planning: 'secondary', 'in-progress': 'default', 'on-hold': 'warning', completed: 'success', cancelled: 'destructive'
};

export default function ProjectsPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', clientId: '', status: 'planning', priority: 'medium', startDate: '', deadline: '', budget: 0 });

  const fetchProjects = async () => {
    setLoading(true);
    try { const projRes = await api.get('/projects', { params: { search } }); setProjects(projRes.data.data || []); } catch (e) { console.error(e); }
    try { const clientRes = await api.get('/clients', { params: { limit: 100 } }); setClients(clientRes.data.data || []); } catch {}
    setLoading(false);
  };

  useEffect(() => { fetchProjects(); }, [search]);

  const resetForm = () => {
    setForm({ name: '', description: '', clientId: '', status: 'planning', priority: 'medium', startDate: '', deadline: '', budget: 0 });
    setEditId(null); setShowForm(false);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    try {
      if (editId) await api.put(`/projects/${editId}`, form);
      else await api.post('/projects', form);
      resetForm(); fetchProjects();
    } catch (e) { console.error(e); }
    setSaving(false);
  };

  const handleEdit = (p: any) => {
    setForm({
      name: p.name, description: p.description || '', clientId: p.clientId?._id || '',
      status: p.status, priority: p.priority, startDate: p.startDate?.split('T')[0] || '',
      deadline: p.deadline?.split('T')[0] || '', budget: p.budget || 0,
    });
    setEditId(p._id); setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete?')) return;
    await api.delete(`/projects/${id}`); fetchProjects();
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Projects</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage client projects</p>
        </div>
        <Button onClick={() => { resetForm(); setShowForm(true); }}><Plus className="w-4 h-4" /> New Project</Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search projects..." className="pl-10" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {showForm && (
        <Card className="border-primary/20">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">{editId ? 'Edit Project' : 'New Project'}</CardTitle>
            <Button variant="ghost" size="icon" onClick={resetForm}><X className="w-4 h-4" /></Button>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input placeholder="Project Name *" value={form.name} onChange={(e) => setForm({...form, name: e.target.value})} required />
              <select className="h-10 rounded-lg border border-input bg-card px-3 text-sm" value={form.clientId} onChange={(e) => setForm({...form, clientId: e.target.value})} required>
                <option value="">Select Client *</option>
                {clients.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
              </select>
              <select className="h-10 rounded-lg border border-input bg-card px-3 text-sm" value={form.status} onChange={(e) => setForm({...form, status: e.target.value})}>
                <option value="planning">Planning</option>
                <option value="in-progress">In Progress</option>
                <option value="on-hold">On Hold</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
              <select className="h-10 rounded-lg border border-input bg-card px-3 text-sm" value={form.priority} onChange={(e) => setForm({...form, priority: e.target.value})}>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
              <Input type="date" placeholder="Start Date" value={form.startDate} onChange={(e) => setForm({...form, startDate: e.target.value})} required />
              <Input type="date" placeholder="Deadline" value={form.deadline} onChange={(e) => setForm({...form, deadline: e.target.value})} required />
              <Input type="number" placeholder="Budget" value={form.budget || ''} onChange={(e) => setForm({...form, budget: +e.target.value})} />
              <Input placeholder="Description" value={form.description} onChange={(e) => setForm({...form, description: e.target.value})} />
              <div className="md:col-span-2 flex gap-2">
                <Button type="submit" disabled={saving}>{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : editId ? 'Update' : 'Create'}</Button>
                <Button type="button" variant="outline" onClick={resetForm}>Cancel</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {loading ? <PageLoader /> : projects.length === 0 ? (
        <EmptyState icon={<FolderKanban className="w-12 h-12" />} title="No projects yet" />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((p) => (
            <Card key={p._id} className="group">
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <h3 className="font-semibold text-sm">{p.name}</h3>
                  <Badge variant={statusColors[p.status]}>{p.status}</Badge>
                </div>
                <p className="text-xs text-muted-foreground mb-3">{p.clientId?.name || 'Unknown Client'}</p>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{p.deadline ? new Date(p.deadline).toLocaleDateString() : 'N/A'}</span>
                  <span className="flex items-center gap-1"><DollarSign className="w-3 h-3" />${(p.budget || 0).toLocaleString()}</span>
                </div>
                <div className="flex gap-2 mt-4 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button size="sm" variant="outline" onClick={() => router.push(`/dashboard/projects/${p._id}`)}><Eye className="w-3 h-3 mr-1" />View</Button>
                  <Button size="sm" variant="outline" onClick={() => handleEdit(p)}>Edit</Button>
                  <Button size="sm" variant="ghost" className="text-destructive" onClick={() => handleDelete(p._id)}>Delete</Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
