"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { PageLoader, EmptyState } from "@/components/ui/loading";
import api from "@/lib/api";
import { Plus, Search, Users, Building2, Mail, Phone, X, Loader2, Eye } from "lucide-react";

const statusColors: Record<string, any> = {
  lead: 'warning', active: 'success', inactive: 'secondary'
};

export default function ClientsPage() {
  const router = useRouter();
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', phone: '', company: '', status: 'lead', industry: '', notes: '', contactPerson: '', website: '', address: '' });

  const fetchClients = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/clients', { params: { search } });
      setClients(data.data || []);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { fetchClients(); }, [search]);

  const resetForm = () => {
    setForm({ name: '', email: '', phone: '', company: '', status: 'lead', industry: '', notes: '', contactPerson: '', website: '', address: '' });
    setEditId(null);
    setShowForm(false);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editId) {
        await api.put(`/clients/${editId}`, form);
      } else {
        await api.post('/clients', form);
      }
      resetForm();
      fetchClients();
    } catch (e) { console.error(e); }
    setSaving(false);
  };

  const handleEdit = (client: any) => {
    setForm({
      name: client.name, email: client.email, phone: client.phone || '',
      company: client.company || '', status: client.status, industry: client.industry || '',
      notes: client.notes || '', contactPerson: client.contactPerson || '',
      website: client.website || '', address: client.address || '',
    });
    setEditId(client._id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this client?')) return;
    await api.delete(`/clients/${id}`);
    fetchClients();
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">CRM - Clients</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage your client relationships</p>
        </div>
        <Button onClick={() => { resetForm(); setShowForm(true); }}>
          <Plus className="w-4 h-4" /> Add Client
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search clients..." className="pl-10" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {/* Form Modal */}
      {showForm && (
        <Card className="border-primary/20">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">{editId ? 'Edit Client' : 'New Client'}</CardTitle>
            <Button variant="ghost" size="icon" onClick={resetForm}><X className="w-4 h-4" /></Button>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input placeholder="Client Name *" value={form.name} onChange={(e) => setForm({...form, name: e.target.value})} required />
              <Input type="email" placeholder="Email *" value={form.email} onChange={(e) => setForm({...form, email: e.target.value})} required />
              <Input placeholder="Phone" value={form.phone} onChange={(e) => setForm({...form, phone: e.target.value})} />
              <Input placeholder="Company" value={form.company} onChange={(e) => setForm({...form, company: e.target.value})} />
              <select className="h-10 rounded-lg border border-input bg-card px-3 text-sm" value={form.status} onChange={(e) => setForm({...form, status: e.target.value})}>
                <option value="lead">Lead</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
              <Input placeholder="Industry" value={form.industry} onChange={(e) => setForm({...form, industry: e.target.value})} />
              <Input placeholder="Contact Person" value={form.contactPerson} onChange={(e) => setForm({...form, contactPerson: e.target.value})} />
              <Input placeholder="Website" value={form.website} onChange={(e) => setForm({...form, website: e.target.value})} />
              <div className="md:col-span-2">
                <Input placeholder="Notes" value={form.notes} onChange={(e) => setForm({...form, notes: e.target.value})} />
              </div>
              <div className="md:col-span-2 flex gap-2">
                <Button type="submit" disabled={saving}>
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : editId ? 'Update' : 'Create'}
                </Button>
                <Button type="button" variant="outline" onClick={resetForm}>Cancel</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Clients Grid */}
      {loading ? <PageLoader /> : clients.length === 0 ? (
        <EmptyState icon={<Users className="w-12 h-12" />} title="No clients yet" description="Add your first client to get started" />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {clients.map((client) => (
            <Card key={client._id} className="group">
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Building2 className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-sm">{client.name}</h3>
                      <p className="text-xs text-muted-foreground">{client.company || 'No company'}</p>
                    </div>
                  </div>
                  <Badge variant={statusColors[client.status]}>{client.status}</Badge>
                </div>
                <div className="space-y-1.5 text-xs text-muted-foreground">
                  {client.email && <div className="flex items-center gap-2"><Mail className="w-3 h-3" />{client.email}</div>}
                  {client.phone && <div className="flex items-center gap-2"><Phone className="w-3 h-3" />{client.phone}</div>}
                </div>
                <div className="flex gap-2 mt-4 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button size="sm" variant="outline" onClick={() => router.push(`/dashboard/clients/${client._id}`)}><Eye className="w-3 h-3 mr-1" />View</Button>
                  <Button size="sm" variant="outline" onClick={() => handleEdit(client)}>Edit</Button>
                  <Button size="sm" variant="ghost" className="text-destructive" onClick={() => handleDelete(client._id)}>Delete</Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
