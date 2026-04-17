"use client";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { PageLoader, EmptyState } from "@/components/ui/loading";
import api from "@/lib/api";
import { DollarSign, Plus, X, Loader2, FileText } from "lucide-react";

const statusColors: Record<string, any> = { draft: 'secondary', processed: 'warning', paid: 'success' };

export default function PayrollPage() {
  const [payrolls, setPayrolls] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedPayslip, setSelectedPayslip] = useState<any>(null);
  const [form, setForm] = useState({ employeeId: '', month: new Date().getMonth() + 1, year: new Date().getFullYear(), bonuses: 0, deductions: 0 });

  const fetchData = async () => {
    setLoading(true);
    try { const pRes = await api.get('/payroll'); setPayrolls(pRes.data.data || []); } catch (e) { console.error(e); }
    try { const eRes = await api.get('/employees', { params: { limit: 100 } }); setEmployees(eRes.data.data || []); } catch {}
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    try { await api.post('/payroll/generate', form); setShowForm(false); fetchData(); } catch (e) { console.error(e); }
    setSaving(false);
  };

  const handleMarkPaid = async (id: string) => {
    await api.put(`/payroll/${id}`, { status: 'paid' }); fetchData();
  };

  const viewPayslip = async (id: string) => {
    const { data } = await api.get(`/payroll/${id}/payslip`);
    setSelectedPayslip(data);
  };

  if (loading) return <PageLoader />;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold">Payroll</h1><p className="text-sm text-muted-foreground mt-1">Salary management & payslips</p></div>
        <Button onClick={() => setShowForm(true)}><Plus className="w-4 h-4" /> Generate Payroll</Button>
      </div>

      {showForm && (
        <Card className="border-primary/20">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Generate Payroll</CardTitle>
            <Button variant="ghost" size="icon" onClick={() => setShowForm(false)}><X className="w-4 h-4" /></Button>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleGenerate} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <select className="h-10 rounded-lg border border-input bg-card px-3 text-sm" value={form.employeeId} onChange={(e) => setForm({...form, employeeId: e.target.value})} required>
                <option value="">Select Employee *</option>
                {employees.map(e => <option key={e._id} value={e._id}>{e.userId?.name} ({e.employeeId})</option>)}
              </select>
              <div className="flex gap-2">
                <select className="h-10 rounded-lg border border-input bg-card px-3 text-sm flex-1" value={form.month} onChange={(e) => setForm({...form, month: +e.target.value})}>
                  {Array.from({length: 12}, (_, i) => <option key={i+1} value={i+1}>{new Date(2000, i).toLocaleString('default', {month: 'long'})}</option>)}
                </select>
                <Input type="number" className="w-24" value={form.year} onChange={(e) => setForm({...form, year: +e.target.value})} />
              </div>
              <Input type="number" placeholder="Bonuses" value={form.bonuses || ''} onChange={(e) => setForm({...form, bonuses: +e.target.value})} />
              <Input type="number" placeholder="Deductions" value={form.deductions || ''} onChange={(e) => setForm({...form, deductions: +e.target.value})} />
              <div className="md:col-span-2 flex gap-2">
                <Button type="submit" disabled={saving}>{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Generate'}</Button>
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Payslip Modal */}
      {selectedPayslip && (
        <Card className="border-primary/20">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Payslip — {selectedPayslip.period}</CardTitle>
            <Button variant="ghost" size="icon" onClick={() => setSelectedPayslip(null)}><X className="w-4 h-4" /></Button>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><span className="text-muted-foreground">Base Salary:</span><span className="ml-2 font-medium">${selectedPayslip.baseSalary}</span></div>
              <div><span className="text-muted-foreground">Bonuses:</span><span className="ml-2 font-medium text-success">+${selectedPayslip.bonuses}</span></div>
              <div><span className="text-muted-foreground">Overtime Pay:</span><span className="ml-2 font-medium text-success">+${selectedPayslip.overtimePay}</span></div>
              <div><span className="text-muted-foreground">Deductions:</span><span className="ml-2 font-medium text-destructive">-${selectedPayslip.deductions}</span></div>
              <div className="col-span-2 pt-3 border-t border-border"><span className="text-muted-foreground">Net Salary:</span><span className="ml-2 text-xl font-bold text-primary">${selectedPayslip.netSalary}</span></div>
              {selectedPayslip.breakdown && (
                <div className="col-span-2 pt-2 text-xs text-muted-foreground space-y-1">
                  <p>Working Days: {selectedPayslip.breakdown.workingDays} | Present: {selectedPayslip.breakdown.presentDays} | Absent: {selectedPayslip.breakdown.absentDays}</p>
                  <p>Total Hours: {selectedPayslip.breakdown.totalWorkingHours}h | OT: {selectedPayslip.breakdown.overtimeHours}h | Late: {selectedPayslip.breakdown.totalLateMinutes}m</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Payroll List */}
      {payrolls.length === 0 ? (
        <EmptyState icon={<DollarSign className="w-12 h-12" />} title="No payrolls generated" />
      ) : (
        <div className="space-y-3">
          {payrolls.map(p => (
            <Card key={p._id} className="group">
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center"><DollarSign className="w-5 h-5 text-primary" /></div>
                  <div>
                    <p className="text-sm font-medium">{p.employeeId?.userId?.name}</p>
                    <p className="text-xs text-muted-foreground">{p.month}/{p.year} • Base: ${p.baseSalary}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <p className="text-lg font-bold">${p.netSalary?.toLocaleString()}</p>
                  <Badge variant={statusColors[p.status]}>{p.status}</Badge>
                  <Button size="sm" variant="ghost" onClick={() => viewPayslip(p._id)}><FileText className="w-4 h-4" /></Button>
                  {p.status !== 'paid' && <Button size="sm" variant="outline" onClick={() => handleMarkPaid(p._id)}>Mark Paid</Button>}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
