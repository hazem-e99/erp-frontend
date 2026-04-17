"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { PageLoader, EmptyState } from "@/components/ui/loading";
import api from "@/lib/api";
import { Shield, Plus, X, Loader2, Check, Eye } from "lucide-react";

export default function RolesPage() {
  const router = useRouter();
  const [roles, setRoles] = useState<any[]>([]);
  const [allPermissions, setAllPermissions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', permissions: [] as string[] });

  // Assign role
  const [users, setUsers] = useState<any[]>([]);
  const [assignForm, setAssignForm] = useState({ userId: '', roleId: '' });
  const [showAssign, setShowAssign] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try { const rRes = await api.get('/roles'); setRoles(rRes.data || []); } catch (e) { console.error(e); }
    try { const pRes = await api.get('/roles/permissions'); setAllPermissions(pRes.data || []); } catch {}
    try { const uRes = await api.get('/users', { params: { limit: 100 } }); setUsers(uRes.data.data || []); } catch {}
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const resetForm = () => { setForm({ name: '', description: '', permissions: [] }); setEditId(null); setShowForm(false); };

  const togglePermission = (perm: string) => {
    setForm(prev => ({
      ...prev,
      permissions: prev.permissions.includes(perm)
        ? prev.permissions.filter(p => p !== perm)
        : [...prev.permissions, perm],
    }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    try {
      if (editId) await api.put(`/roles/${editId}`, form);
      else await api.post('/roles', form);
      resetForm(); fetchData();
    } catch (e) { console.error(e); }
    setSaving(false);
  };

  const handleEdit = (role: any) => {
    setForm({ name: role.name, description: role.description || '', permissions: role.permissions || [] });
    setEditId(role._id); setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete?')) return;
    await api.delete(`/roles/${id}`); fetchData();
  };

  const handleAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    try { await api.post('/roles/assign', assignForm); setShowAssign(false); fetchData(); } catch (e) { console.error(e); }
  };

  // Group permissions by resource
  const permGroups: Record<string, string[]> = {};
  allPermissions.forEach(p => {
    const [resource] = p.split(':');
    if (!permGroups[resource]) permGroups[resource] = [];
    permGroups[resource].push(p);
  });

  if (loading) return <PageLoader />;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold">Roles & Access Control</h1><p className="text-sm text-muted-foreground mt-1">Manage roles and permissions (RBAC)</p></div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowAssign(true)}>Assign Role</Button>
          <Button onClick={() => { resetForm(); setShowForm(true); }}><Plus className="w-4 h-4" /> New Role</Button>
        </div>
      </div>

      {/* Assign Modal */}
      {showAssign && (
        <Card className="border-primary/20">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Assign Role to User</CardTitle>
            <Button variant="ghost" size="icon" onClick={() => setShowAssign(false)}><X className="w-4 h-4" /></Button>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAssign} className="flex gap-4 items-end">
              <select className="h-10 rounded-lg border border-input bg-card px-3 text-sm flex-1" value={assignForm.userId} onChange={(e) => setAssignForm({...assignForm, userId: e.target.value})} required>
                <option value="">Select User</option>
                {users.map(u => <option key={u._id} value={u._id}>{u.name} ({u.email})</option>)}
              </select>
              <select className="h-10 rounded-lg border border-input bg-card px-3 text-sm flex-1" value={assignForm.roleId} onChange={(e) => setAssignForm({...assignForm, roleId: e.target.value})} required>
                <option value="">Select Role</option>
                {roles.map(r => <option key={r._id} value={r._id}>{r.name}</option>)}
              </select>
              <Button type="submit">Assign</Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Create/Edit Role */}
      {showForm && (
        <Card className="border-primary/20">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">{editId ? 'Edit' : 'Create'} Role</CardTitle>
            <Button variant="ghost" size="icon" onClick={resetForm}><X className="w-4 h-4" /></Button>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input placeholder="Role Name *" value={form.name} onChange={(e) => setForm({...form, name: e.target.value})} required />
                <Input placeholder="Description" value={form.description} onChange={(e) => setForm({...form, description: e.target.value})} />
              </div>
              <div>
                <h4 className="text-sm font-medium mb-3">Permissions</h4>
                <div className="space-y-3">
                  {Object.entries(permGroups).map(([group, perms]) => (
                    <div key={group} className="p-3 rounded-lg bg-accent/50">
                      <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">{group}</p>
                      <div className="flex flex-wrap gap-2">
                        {perms.map(p => (
                          <button key={p} type="button" onClick={() => togglePermission(p)}
                            className={`text-xs px-3 py-1.5 rounded-full border transition-colors cursor-pointer ${
                              form.permissions.includes(p) ? 'bg-primary text-white border-primary' : 'bg-card border-border hover:border-primary/50'
                            }`}>
                            {form.permissions.includes(p) && <Check className="w-3 h-3 inline mr-1" />}
                            {p.split(':')[1]}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex gap-2">
                <Button type="submit" disabled={saving}>{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : editId ? 'Update' : 'Create'}</Button>
                <Button type="button" variant="outline" onClick={resetForm}>Cancel</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Roles Grid */}
      {roles.length === 0 ? (
        <EmptyState icon={<Shield className="w-12 h-12" />} title="No roles" />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {roles.map(role => (
            <Card key={role._id} className="group">
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Shield className="w-5 h-5 text-primary" />
                    <h3 className="font-semibold text-sm">{role.name}</h3>
                  </div>
                  {role.isSystem && <Badge variant="secondary">System</Badge>}
                </div>
                <p className="text-xs text-muted-foreground mb-3">{role.description || 'No description'}</p>
                <div className="flex flex-wrap gap-1">
                  {role.permissions?.includes('*') ? (
                    <Badge variant="default">All Permissions</Badge>
                  ) : (
                    role.permissions?.slice(0, 4).map((p: string) => <Badge key={p} variant="secondary" className="text-[10px]">{p}</Badge>)
                  )}
                  {role.permissions?.length > 4 && !role.permissions?.includes('*') && (
                    <Badge variant="outline">+{role.permissions.length - 4} more</Badge>
                  )}
                </div>
                <div className="flex gap-2 mt-4 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button size="sm" variant="outline" onClick={() => router.push(`/dashboard/roles/${role._id}`)}><Eye className="w-3 h-3 mr-1" />View</Button>
                  <Button size="sm" variant="outline" onClick={() => handleEdit(role)}>Edit</Button>
                  {!role.isSystem && (
                    <Button size="sm" variant="ghost" className="text-destructive" onClick={() => handleDelete(role._id)}>Delete</Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
