"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { PageLoader, EmptyState } from "@/components/ui/loading";
import api from "@/lib/api";
import { Plus, Search, Briefcase, X, Loader2, DollarSign, Calendar, Eye, Mail, Phone } from "lucide-react";

export default function EmployeesPage() {
  const router = useRouter();
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: '', employeeId: '', emailAddress: '', password: '',
    age: '', baseSalary: 0, dateOfJoining: '',
    address: '', emergencyContact: '', whatsappNumber: '',
    positions: '' as string, departments: '' as string, contractTypes: '' as string,
    department: '', position: '',
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const eRes = await api.get('/employees', { params: { search } });
      setEmployees(eRes.data.data || []);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [search]);

  const resetForm = () => {
    setForm({
      name: '', employeeId: '', emailAddress: '', password: '',
      age: '', baseSalary: 0, dateOfJoining: '',
      address: '', emergencyContact: '', whatsappNumber: '',
      positions: '', departments: '', contractTypes: '',
      department: '', position: '',
    });
    setEditId(null); setShowForm(false);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    try {
      const payload: any = { ...form };
      // Convert comma-separated to arrays
      payload.positions = form.positions ? form.positions.split(',').map(s => s.trim()).filter(Boolean) : [];
      payload.departments = form.departments ? form.departments.split(',').map(s => s.trim()).filter(Boolean) : [];
      payload.contractTypes = form.contractTypes ? form.contractTypes.split(',').map(s => s.trim()).filter(Boolean) : [];
      payload.age = form.age ? +form.age : undefined;
      payload.baseSalary = +form.baseSalary;

      if (editId) {
        // Don't send password/email on edit
        delete payload.password;
        delete payload.emailAddress;
        delete payload.employeeId;
        await api.put(`/employees/${editId}`, payload);
      } else {
        await api.post('/employees', payload);
      }
      resetForm(); fetchData();
    } catch (e: any) {
      alert(e.response?.data?.message || 'Error');
    }
    setSaving(false);
  };

  const handleEdit = (emp: any) => {
    setForm({
      name: emp.name || emp.userId?.name || '',
      employeeId: emp.employeeId,
      emailAddress: emp.emailAddress || '',
      password: '',
      age: emp.age || '',
      baseSalary: emp.baseSalary,
      dateOfJoining: emp.dateOfJoining?.split('T')[0] || '',
      address: emp.address || '',
      emergencyContact: emp.emergencyContact || '',
      whatsappNumber: emp.whatsappNumber || '',
      positions: (emp.positions || []).join(', '),
      departments: (emp.departments || []).join(', '),
      contractTypes: (emp.contractTypes || []).join(', '),
      department: emp.department || '',
      position: emp.position || '',
    });
    setEditId(emp._id); setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Terminate this employee? Their account will be deactivated.')) return;
    await api.delete(`/employees/${id}`); fetchData();
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold">Employees</h1><p className="text-sm text-muted-foreground mt-1">Manage employee profiles</p></div>
        <Button onClick={() => { resetForm(); setShowForm(true); }}><Plus className="w-4 h-4" /> Add Employee</Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search employees..." className="pl-10" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {/* Create / Edit Form */}
      {showForm && (
        <Card className="border-primary/20">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">{editId ? 'Edit Employee' : 'Create Employee + User Account'}</CardTitle>
            <Button variant="ghost" size="icon" onClick={resetForm}><X className="w-4 h-4" /></Button>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSave} className="space-y-4">
              {/* Basic Info */}
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-muted-foreground">Basic Information</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Input placeholder="Full Name *" value={form.name} onChange={(e) => setForm({...form, name: e.target.value})} required />
                  {!editId && <Input placeholder="Employee ID *" value={form.employeeId} onChange={(e) => setForm({...form, employeeId: e.target.value})} required />}
                  <Input type="number" placeholder="Age" value={form.age} onChange={(e) => setForm({...form, age: e.target.value})} />
                </div>
              </div>

              {/* Account Credentials */}
              {!editId && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-muted-foreground">Login Credentials (User Account)</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input type="email" placeholder="Email Address *" value={form.emailAddress} onChange={(e) => setForm({...form, emailAddress: e.target.value})} required />
                    <Input type="password" placeholder="Password *" value={form.password} onChange={(e) => setForm({...form, password: e.target.value})} required minLength={6} />
                  </div>
                </div>
              )}

              {/* Contact */}
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-muted-foreground">Contact</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Input placeholder="WhatsApp Number" value={form.whatsappNumber} onChange={(e) => setForm({...form, whatsappNumber: e.target.value})} />
                  <Input placeholder="Emergency Contact" value={form.emergencyContact} onChange={(e) => setForm({...form, emergencyContact: e.target.value})} />
                  <Input placeholder="Address" value={form.address} onChange={(e) => setForm({...form, address: e.target.value})} />
                </div>
              </div>

              {/* Employment */}
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-muted-foreground">Employment Details</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Input type="number" placeholder="Salary *" value={form.baseSalary || ''} onChange={(e) => setForm({...form, baseSalary: +e.target.value})} required />
                  {!editId && <Input type="date" placeholder="Joining Date *" value={form.dateOfJoining} onChange={(e) => setForm({...form, dateOfJoining: e.target.value})} required />}
                  <Input placeholder="Position (single)" value={form.position} onChange={(e) => setForm({...form, position: e.target.value})} />
                  <Input placeholder="Department (single)" value={form.department} onChange={(e) => setForm({...form, department: e.target.value})} />
                </div>
              </div>

              {/* Multi-select as comma separated */}
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-muted-foreground">Positions / Departments / Contract Types (comma-separated)</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Input placeholder="Positions (e.g. Developer, Lead)" value={form.positions} onChange={(e) => setForm({...form, positions: e.target.value})} />
                  <Input placeholder="Departments (e.g. Eng, QA)" value={form.departments} onChange={(e) => setForm({...form, departments: e.target.value})} />
                  <Input placeholder="Contract Types (e.g. Full-time)" value={form.contractTypes} onChange={(e) => setForm({...form, contractTypes: e.target.value})} />
                </div>
              </div>

              <div className="flex gap-2">
                <Button type="submit" disabled={saving}>
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : editId ? 'Update' : 'Create Employee & User'}
                </Button>
                <Button type="button" variant="outline" onClick={resetForm}>Cancel</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* List */}
      {loading ? <PageLoader /> : employees.length === 0 ? (
        <EmptyState icon={<Briefcase className="w-12 h-12" />} title="No employees yet" />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {employees.map(emp => (
            <Card key={emp._id} className="group">
              <CardContent className="p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-orange-600 flex items-center justify-center text-white font-bold text-sm">
                    {(emp.name || emp.userId?.name)?.[0]?.toUpperCase() || '?'}
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm">{emp.name || emp.userId?.name || 'Unknown'}</h3>
                    <p className="text-xs text-muted-foreground">{emp.position || emp.positions?.[0] || 'No position'}</p>
                  </div>
                  <Badge variant={emp.status === 'active' ? 'success' : 'destructive'} className="ml-auto">{emp.status}</Badge>
                </div>
                <div className="space-y-1 text-xs text-muted-foreground">
                  <p className="flex items-center gap-2"><Briefcase className="w-3 h-3" />{emp.department || emp.departments?.[0] || 'N/A'}</p>
                  <p className="flex items-center gap-2"><DollarSign className="w-3 h-3" />${emp.baseSalary?.toLocaleString()}/mo</p>
                  <p className="flex items-center gap-2"><Mail className="w-3 h-3" />{emp.emailAddress || emp.userId?.email || 'N/A'}</p>
                  {emp.whatsappNumber && <p className="flex items-center gap-2"><Phone className="w-3 h-3" />{emp.whatsappNumber}</p>}
                </div>
                <div className="flex gap-2 mt-4 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button size="sm" variant="outline" onClick={() => router.push(`/dashboard/employees/${emp._id}`)}><Eye className="w-3 h-3 mr-1" />View</Button>
                  <Button size="sm" variant="outline" onClick={() => handleEdit(emp)}>Edit</Button>
                  <Button size="sm" variant="ghost" className="text-destructive" onClick={() => handleDelete(emp._id)}>Terminate</Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
