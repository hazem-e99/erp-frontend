"use client";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { PageLoader, EmptyState } from "@/components/ui/loading";
import { useAuthStore } from "@/lib/store";
import api from "@/lib/api";
import { CalendarOff, Plus, X, Loader2, Check, XCircle } from "lucide-react";

const statusColors: Record<string, any> = { pending: 'warning', approved: 'success', rejected: 'destructive' };

export default function LeavesPage() {
  const { hasPermission } = useAuthStore();
  const canApprove = hasPermission('leaves:approve');
  const [leaves, setLeaves] = useState<any[]>([]);
  const [myLeaves, setMyLeaves] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ type: 'annual', startDate: '', endDate: '', reason: '' });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [myRes, allRes] = await Promise.all([
        api.get('/leaves/me'),
        canApprove ? api.get('/leaves') : Promise.resolve({ data: { data: [] } }),
      ]);
      setMyLeaves(myRes.data);
      if (canApprove) setLeaves(allRes.data.data || []);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const handleApply = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    try { await api.post('/leaves/apply', form); setShowForm(false); fetchData(); } catch (e) { console.error(e); }
    setSaving(false);
  };

  const handleApprove = async (id: string, status: string) => {
    try { await api.post(`/leaves/${id}/approve`, { status }); fetchData(); } catch (e) { console.error(e); }
  };

  if (loading) return <PageLoader />;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">HR — Leaves</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage leave requests</p>
        </div>
        <Button onClick={() => setShowForm(true)}><Plus className="w-4 h-4" /> Apply Leave</Button>
      </div>

      {/* Leave Balance */}
      {myLeaves?.balance && (
        <div className="grid grid-cols-3 gap-4">
          <Card><CardContent className="p-4 text-center"><p className="text-sm text-muted-foreground">Total</p><p className="text-2xl font-bold">{myLeaves.balance.total}</p></CardContent></Card>
          <Card><CardContent className="p-4 text-center"><p className="text-sm text-muted-foreground">Used</p><p className="text-2xl font-bold text-warning">{myLeaves.balance.used}</p></CardContent></Card>
          <Card className="border-success/20"><CardContent className="p-4 text-center"><p className="text-sm text-muted-foreground">Remaining</p><p className="text-2xl font-bold text-success">{myLeaves.balance.remaining}</p></CardContent></Card>
        </div>
      )}

      {showForm && (
        <Card className="border-primary/20">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Apply for Leave</CardTitle>
            <Button variant="ghost" size="icon" onClick={() => setShowForm(false)}><X className="w-4 h-4" /></Button>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleApply} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <select className="h-10 rounded-lg border border-input bg-card px-3 text-sm" value={form.type} onChange={(e) => setForm({...form, type: e.target.value})}>
                <option value="annual">Annual</option><option value="sick">Sick</option><option value="personal">Personal</option><option value="emergency">Emergency</option><option value="unpaid">Unpaid</option>
              </select>
              <Input type="date" value={form.startDate} onChange={(e) => setForm({...form, startDate: e.target.value})} required />
              <Input type="date" value={form.endDate} onChange={(e) => setForm({...form, endDate: e.target.value})} required />
              <Input placeholder="Reason" value={form.reason} onChange={(e) => setForm({...form, reason: e.target.value})} />
              <div className="md:col-span-2 flex gap-2">
                <Button type="submit" disabled={saving}>{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Submit'}</Button>
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Pending approvals for managers */}
      {canApprove && leaves.filter(l => l.status === 'pending').length > 0 && (
        <Card className="border-warning/20">
          <CardHeader><CardTitle className="text-base">Pending Approvals</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {leaves.filter(l => l.status === 'pending').map((l: any) => (
              <div key={l._id} className="flex items-center justify-between p-3 rounded-lg bg-accent/50">
                <div>
                  <p className="text-sm font-medium">{l.employeeId?.userId?.name}</p>
                  <p className="text-xs text-muted-foreground">{l.type} • {l.days} day(s) • {l.reason || 'No reason'}</p>
                  <p className="text-xs text-muted-foreground">{new Date(l.startDate).toLocaleDateString()} → {new Date(l.endDate).toLocaleDateString()}</p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => handleApprove(l._id, 'approved')} className="bg-success hover:bg-success/90"><Check className="w-3 h-3" /></Button>
                  <Button size="sm" variant="destructive" onClick={() => handleApprove(l._id, 'rejected')}><XCircle className="w-3 h-3" /></Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* My Leaves History */}
      <Card>
        <CardHeader><CardTitle className="text-base">My Leave History</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-3">
            {myLeaves?.leaves?.length ? myLeaves.leaves.map((l: any) => (
              <div key={l._id} className="flex items-center justify-between p-3 rounded-lg bg-accent/50">
                <div>
                  <p className="text-sm font-medium capitalize">{l.type} Leave</p>
                  <p className="text-xs text-muted-foreground">{new Date(l.startDate).toLocaleDateString()} → {new Date(l.endDate).toLocaleDateString()} ({l.days} days)</p>
                </div>
                <Badge variant={statusColors[l.status]}>{l.status}</Badge>
              </div>
            )) : <p className="text-sm text-muted-foreground text-center py-4">No leave history</p>}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
