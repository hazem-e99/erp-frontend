"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { MultiSelect } from "@/components/ui/multi-select";
import { PageLoader, EmptyState } from "@/components/ui/loading";
import api from "@/lib/api";
import { Plus, Search, Briefcase, X, Loader2, DollarSign, Eye, Mail, Phone, Trash2, Building2, Users, FileText } from "lucide-react";
import { toast } from "sonner";
import { SupportedCurrency, BASE_CURRENCY, CURRENCY_NAMES, calculateBaseAmount } from "@/app/dashboard/finance/components/finance.types";

export default function EmployeesPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("employees");
  
  // Employees State
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: '', employeeId: '', emailAddress: '', password: '',
    age: '', 
    currency: BASE_CURRENCY as SupportedCurrency,
    exchangeRate: 1,
    baseSalary: 0, maxKpi: 0, dateOfJoining: '',
    address: '', emergencyContact: '', whatsappNumber: '',
    positions: [] as string[], departments: [] as string[], contractTypes: [] as string[],
  });

  // Departments State
  const [departments, setDepartments] = useState<any[]>([]);
  const [deptLoading, setDeptLoading] = useState(false);
  const [showDeptForm, setShowDeptForm] = useState(false);
  const [deptForm, setDeptForm] = useState({ name: '', description: '' });
  const [editDeptId, setEditDeptId] = useState<string | null>(null);

  // Positions State
  const [positions, setPositions] = useState<any[]>([]);
  const [posLoading, setPosLoading] = useState(false);
  const [showPosForm, setShowPosForm] = useState(false);
  const [posForm, setPosForm] = useState({ name: '', description: '' });
  const [editPosId, setEditPosId] = useState<string | null>(null);

  // Contract Types State
  const [contractTypes, setContractTypes] = useState<any[]>([]);
  const [ctLoading, setCtLoading] = useState(false);
  const [showCtForm, setShowCtForm] = useState(false);
  const [ctForm, setCtForm] = useState({ name: '', description: '' });
  const [editCtId, setEditCtId] = useState<string | null>(null);

  // Fetch Employees
  const fetchEmployees = async () => {
    setLoading(true);
    try {
      const res = await api.get('/employees', { params: { search } });
      setEmployees(res.data.data || []);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  // Fetch Departments
  const fetchDepartments = async () => {
    setDeptLoading(true);
    try {
      const res = await api.get('/departments');
      setDepartments(res.data || []);
    } catch (e) { console.error(e); }
    setDeptLoading(false);
  };

  // Fetch Positions
  const fetchPositions = async () => {
    setPosLoading(true);
    try {
      const res = await api.get('/positions');
      setPositions(res.data || []);
    } catch (e) { console.error(e); }
    setPosLoading(false);
  };

  // Fetch Contract Types
  const fetchContractTypes = async () => {
    setCtLoading(true);
    try {
      const res = await api.get('/contract-types');
      setContractTypes(res.data || []);
    } catch (e) { console.error(e); }
    setCtLoading(false);
  };

  useEffect(() => {
    fetchEmployees();
    fetchDepartments();
    fetchPositions();
    fetchContractTypes();
  }, [search]);

  const resetForm = () => {
    setForm({
      name: '', employeeId: '', emailAddress: '', password: '',
      age: '', 
      currency: BASE_CURRENCY,
      exchangeRate: 1,
      baseSalary: 0, maxKpi: 0, dateOfJoining: '',
      address: '', emergencyContact: '', whatsappNumber: '',
      positions: [], departments: [], contractTypes: [],
    });
    setEditId(null); setShowForm(false);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    try {
      const payload: any = { ...form };
      payload.age = form.age ? +form.age : undefined;
      payload.baseSalary = +form.baseSalary;
      payload.maxKpi = +form.maxKpi || 0;

      if (editId) {
        delete payload.password;
        delete payload.emailAddress;
        delete payload.employeeId;
        delete payload.dateOfJoining;
        await api.put(`/employees/${editId}`, payload);
        toast.success('Employee updated successfully');
      } else {
        await api.post('/employees', payload);
        toast.success('Employee created successfully');
      }
      resetForm(); fetchEmployees();
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Error saving employee');
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
      currency: emp.currency || BASE_CURRENCY,
      exchangeRate: emp.exchangeRate || 1,
      baseSalary: emp.baseSalary,
      maxKpi: emp.maxKpi || 0,
      dateOfJoining: emp.dateOfJoining?.split('T')[0] || '',
      address: emp.address || '',
      emergencyContact: emp.emergencyContact || '',
      whatsappNumber: emp.whatsappNumber || '',
      positions: emp.positions || [],
      departments: emp.departments || [],
      contractTypes: emp.contractTypes || [],
    });
    setEditId(emp._id); setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Terminate this employee?')) return;
    try {
      await api.delete(`/employees/${id}`);
      toast.success('Employee terminated');
      fetchEmployees();
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Error deleting employee');
    }
  };

  // Department Handlers
  const handleSaveDept = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editDeptId) {
        await api.put(`/departments/${editDeptId}`, deptForm);
        toast.success('Department updated');
      } else {
        await api.post('/departments', deptForm);
        toast.success('Department created');
      }
      setDeptForm({ name: '', description: '' });
      setEditDeptId(null);
      setShowDeptForm(false);
      fetchDepartments();
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Error');
    }
  };

  const handleDeleteDept = async (id: string) => {
    if (!confirm('Delete this department?')) return;
    try {
      await api.delete(`/departments/${id}`);
      toast.success('Department deleted');
      fetchDepartments();
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Error');
    }
  };

  // Position Handlers
  const handleSavePos = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editPosId) {
        await api.put(`/positions/${editPosId}`, posForm);
        toast.success('Position updated');
      } else {
        await api.post('/positions', posForm);
        toast.success('Position created');
      }
      setPosForm({ name: '', description: '' });
      setEditPosId(null);
      setShowPosForm(false);
      fetchPositions();
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Error');
    }
  };

  const handleDeletePos = async (id: string) => {
    if (!confirm('Delete this position?')) return;
    try {
      await api.delete(`/positions/${id}`);
      toast.success('Position deleted');
      fetchPositions();
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Error');
    }
  };

  // Contract Type Handlers
  const handleSaveCt = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editCtId) {
        await api.put(`/contract-types/${editCtId}`, ctForm);
        toast.success('Contract type updated');
      } else {
        await api.post('/contract-types', ctForm);
        toast.success('Contract type created');
      }
      setCtForm({ name: '', description: '' });
      setEditCtId(null);
      setShowCtForm(false);
      fetchContractTypes();
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Error');
    }
  };

  const handleDeleteCt = async (id: string) => {
    if (!confirm('Delete this contract type?')) return;
    try {
      await api.delete(`/contract-types/${id}`);
      toast.success('Contract type deleted');
      fetchContractTypes();
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Error');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold">Employee Management</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage employees, departments, positions, and contract types</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="employees"><Users className="w-4 h-4 mr-2" />Employees</TabsTrigger>
          <TabsTrigger value="departments"><Building2 className="w-4 h-4 mr-2" />Departments</TabsTrigger>
          <TabsTrigger value="positions"><Briefcase className="w-4 h-4 mr-2" />Positions</TabsTrigger>
          <TabsTrigger value="contractTypes"><FileText className="w-4 h-4 mr-2" />Contract Types</TabsTrigger>
        </TabsList>

        {/* EMPLOYEES TAB */}
        <TabsContent value="employees" className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="relative max-w-sm flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search employees..." className="pl-10" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <Button onClick={() => { resetForm(); setShowForm(true); }}><Plus className="w-4 h-4" /> Add Employee</Button>
          </div>

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
                      <div className="space-y-1.5">
                        <label className="text-sm font-medium">Full Name <span className="text-destructive">*</span></label>
                        <Input placeholder="e.g. Ahmed Mohamed" value={form.name} onChange={(e) => setForm({...form, name: e.target.value})} required />
                      </div>
                      {!editId && (
                        <div className="space-y-1.5">
                          <label className="text-sm font-medium">Employee ID <span className="text-destructive">*</span></label>
                          <Input placeholder="e.g. EMP-001" value={form.employeeId} onChange={(e) => setForm({...form, employeeId: e.target.value})} required />
                        </div>
                      )}
                      <div className="space-y-1.5">
                        <label className="text-sm font-medium">Age</label>
                        <Input type="number" placeholder="e.g. 30" value={form.age} onChange={(e) => setForm({...form, age: e.target.value})} />
                      </div>
                    </div>
                  </div>

                  {!editId && (
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium text-muted-foreground">Login Credentials (User Account)</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-sm font-medium">Email Address <span className="text-destructive">*</span></label>
                          <Input type="email" placeholder="e.g. ahmed@company.com" value={form.emailAddress} onChange={(e) => setForm({...form, emailAddress: e.target.value})} required />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-sm font-medium">Password <span className="text-destructive">*</span></label>
                          <Input type="password" placeholder="Min 6 characters" value={form.password} onChange={(e) => setForm({...form, password: e.target.value})} required minLength={6} />
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-muted-foreground">Contact</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-sm font-medium">WhatsApp Number</label>
                        <Input placeholder="e.g. +20 100 123 4567" value={form.whatsappNumber} onChange={(e) => setForm({...form, whatsappNumber: e.target.value})} />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-sm font-medium">Emergency Contact</label>
                        <Input placeholder="e.g. +20 100 987 6543" value={form.emergencyContact} onChange={(e) => setForm({...form, emergencyContact: e.target.value})} />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-sm font-medium">Address</label>
                        <Input placeholder="e.g. Cairo, Egypt" value={form.address} onChange={(e) => setForm({...form, address: e.target.value})} />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-muted-foreground">Employment Details</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-sm font-medium">Currency</label>
                        <select
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                          value={form.currency}
                          onChange={(e) => setForm({...form, currency: e.target.value as SupportedCurrency})}
                        >
                          {Object.entries(CURRENCY_NAMES).map(([code, name]) => (
                            <option key={code} value={code}>{name} ({code})</option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-sm font-medium">Exchange Rate to EGP</label>
                        <Input 
                          type="number" 
                          step="0.0001"
                          placeholder="e.g. 30.5000" 
                          value={form.exchangeRate || ''} 
                          onChange={(e) => setForm({...form, exchangeRate: +e.target.value})}
                          disabled={form.currency === BASE_CURRENCY}
                        />
                      </div>
                      {!editId && (
                        <div className="space-y-1.5">
                          <label className="text-sm font-medium">Joining Date <span className="text-destructive">*</span></label>
                          <Input type="date" value={form.dateOfJoining} onChange={(e) => setForm({...form, dateOfJoining: e.target.value})} required />
                        </div>
                      )}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-sm font-medium">Base Salary ({form.currency}) <span className="text-destructive">*</span></label>
                        <Input type="number" placeholder="e.g. 5000" value={form.baseSalary || ''} onChange={(e) => setForm({...form, baseSalary: +e.target.value})} required />
                        {form.currency !== BASE_CURRENCY && form.baseSalary > 0 && form.exchangeRate > 0 && (
                          <p className="text-xs text-muted-foreground">
                            = {calculateBaseAmount(form.baseSalary, form.exchangeRate).toLocaleString()} {BASE_CURRENCY} (base)
                          </p>
                        )}
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-sm font-medium">Max KPI ({form.currency})</label>
                        <Input type="number" placeholder="e.g. 1000" value={form.maxKpi || ''} onChange={(e) => setForm({...form, maxKpi: +e.target.value})} />
                        {form.currency !== BASE_CURRENCY && form.maxKpi > 0 && form.exchangeRate > 0 && (
                          <p className="text-xs text-muted-foreground">
                            = {calculateBaseAmount(form.maxKpi, form.exchangeRate).toLocaleString()} {BASE_CURRENCY} (base)
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-muted-foreground">Position, Department & Contract</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-sm font-medium">Positions</label>
                        <MultiSelect
                          options={positions.map(p => ({ value: p.name, label: p.name }))}
                          selected={form.positions}
                          onChange={(selected) => setForm({...form, positions: selected})}
                          placeholder="Select positions..."
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-sm font-medium">Departments</label>
                        <MultiSelect
                          options={departments.map(d => ({ value: d.name, label: d.name }))}
                          selected={form.departments}
                          onChange={(selected) => setForm({...form, departments: selected})}
                          placeholder="Select departments..."
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-sm font-medium">Contract Types</label>
                        <MultiSelect
                          options={contractTypes.map(ct => ({ value: ct.name, label: ct.name }))}
                          selected={form.contractTypes}
                          onChange={(selected) => setForm({...form, contractTypes: selected})}
                          placeholder="Select contract types..."
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button type="submit" disabled={saving}>
                      {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : editId ? 'Update Employee' : 'Create Employee & User'}
                    </Button>
                    <Button type="button" variant="outline" onClick={resetForm}>Cancel</Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          {loading ? <PageLoader /> : employees.length === 0 ? (
            <EmptyState icon={<Briefcase className="w-12 h-12" />} title="No employees yet" />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {employees.map(emp => (
                <Card key={emp._id} className="group">
                  <CardContent className="p-5">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-full bg-linear-to-br from-primary to-orange-600 flex items-center justify-center text-white font-bold text-sm">
                        {(emp.name || emp.userId?.name)?.[0]?.toUpperCase() || '?'}
                      </div>
                      <div>
                        <h3 className="font-semibold text-sm">{emp.name || emp.userId?.name || 'Unknown'}</h3>
                        <p className="text-xs text-muted-foreground">{emp.positions?.[0] || 'No position'}</p>
                      </div>
                      <Badge variant={emp.status === 'active' ? 'success' : 'destructive'} className="ml-auto">{emp.status}</Badge>
                    </div>
                    <div className="space-y-1 text-xs text-muted-foreground">
                      <p className="flex items-center gap-2"><Briefcase className="w-3 h-3" />{emp.departments?.[0] || 'N/A'}</p>
                      <p className="flex items-center gap-2">
                        <DollarSign className="w-3 h-3" />
                        {emp.baseSalary?.toLocaleString()} {emp.currency || BASE_CURRENCY}/mo
                        {emp.currency && emp.currency !== BASE_CURRENCY && emp.exchangeRate && (
                          <span className="text-[10px]"> (@{emp.exchangeRate})</span>
                        )}
                      </p>
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
        </TabsContent>

        {/* DEPARTMENTS TAB */}
        <TabsContent value="departments" className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Manage department categories</p>
            <Button onClick={() => { setDeptForm({ name: '', description: '' }); setEditDeptId(null); setShowDeptForm(true); }}>
              <Plus className="w-4 h-4" /> Add Department
            </Button>
          </div>

          {showDeptForm && (
            <Card className="border-primary/20">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base">{editDeptId ? 'Edit Department' : 'Create Department'}</CardTitle>
                <Button variant="ghost" size="icon" onClick={() => setShowDeptForm(false)}><X className="w-4 h-4" /></Button>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSaveDept} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">Department Name <span className="text-destructive">*</span></label>
                    <Input placeholder="e.g. Engineering" value={deptForm.name} onChange={(e) => setDeptForm({...deptForm, name: e.target.value})} required />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">Description</label>
                    <Input placeholder="e.g. Software development team" value={deptForm.description} onChange={(e) => setDeptForm({...deptForm, description: e.target.value})} />
                  </div>
                  <div className="flex gap-2">
                    <Button type="submit">{editDeptId ? 'Update' : 'Create'}</Button>
                    <Button type="button" variant="outline" onClick={() => setShowDeptForm(false)}>Cancel</Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          {deptLoading ? <PageLoader /> : departments.length === 0 ? (
            <EmptyState icon={<Building2 className="w-12 h-12" />} title="No departments yet" />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {departments.map(dept => (
                <Card key={dept._id}>
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold">{dept.name}</h3>
                      <Button size="icon" variant="ghost" className="text-destructive h-8 w-8" onClick={() => handleDeleteDept(dept._id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                    {dept.description && <p className="text-sm text-muted-foreground">{dept.description}</p>}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* POSITIONS TAB */}
        <TabsContent value="positions" className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Manage position titles</p>
            <Button onClick={() => { setPosForm({ name: '', description: '' }); setEditPosId(null); setShowPosForm(true); }}>
              <Plus className="w-4 h-4" /> Add Position
            </Button>
          </div>

          {showPosForm && (
            <Card className="border-primary/20">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base">{editPosId ? 'Edit Position' : 'Create Position'}</CardTitle>
                <Button variant="ghost" size="icon" onClick={() => setShowPosForm(false)}><X className="w-4 h-4" /></Button>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSavePos} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">Position Name <span className="text-destructive">*</span></label>
                    <Input placeholder="e.g. Senior Developer" value={posForm.name} onChange={(e) => setPosForm({...posForm, name: e.target.value})} required />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">Description</label>
                    <Input placeholder="e.g. Senior level software developer" value={posForm.description} onChange={(e) => setPosForm({...posForm, description: e.target.value})} />
                  </div>
                  <div className="flex gap-2">
                    <Button type="submit">{editPosId ? 'Update' : 'Create'}</Button>
                    <Button type="button" variant="outline" onClick={() => setShowPosForm(false)}>Cancel</Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          {posLoading ? <PageLoader /> : positions.length === 0 ? (
            <EmptyState icon={<Briefcase className="w-12 h-12" />} title="No positions yet" />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {positions.map(pos => (
                <Card key={pos._id}>
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold">{pos.name}</h3>
                      <Button size="icon" variant="ghost" className="text-destructive h-8 w-8" onClick={() => handleDeletePos(pos._id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                    {pos.description && <p className="text-sm text-muted-foreground">{pos.description}</p>}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* CONTRACT TYPES TAB */}
        <TabsContent value="contractTypes" className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Manage contract type categories</p>
            <Button onClick={() => { setCtForm({ name: '', description: '' }); setEditCtId(null); setShowCtForm(true); }}>
              <Plus className="w-4 h-4" /> Add Contract Type
            </Button>
          </div>

          {showCtForm && (
            <Card className="border-primary/20">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base">{editCtId ? 'Edit Contract Type' : 'Create Contract Type'}</CardTitle>
                <Button variant="ghost" size="icon" onClick={() => setShowCtForm(false)}><X className="w-4 h-4" /></Button>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSaveCt} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">Contract Type Name <span className="text-destructive">*</span></label>
                    <Input placeholder="e.g. Full-time" value={ctForm.name} onChange={(e) => setCtForm({...ctForm, name: e.target.value})} required />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">Description</label>
                    <Input placeholder="e.g. Full-time permanent contract" value={ctForm.description} onChange={(e) => setCtForm({...ctForm, description: e.target.value})} />
                  </div>
                  <div className="flex gap-2">
                    <Button type="submit">{editCtId ? 'Update' : 'Create'}</Button>
                    <Button type="button" variant="outline" onClick={() => setShowCtForm(false)}>Cancel</Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          {ctLoading ? <PageLoader /> : contractTypes.length === 0 ? (
            <EmptyState icon={<FileText className="w-12 h-12" />} title="No contract types yet" />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {contractTypes.map(ct => (
                <Card key={ct._id}>
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold">{ct.name}</h3>
                      <Button size="icon" variant="ghost" className="text-destructive h-8 w-8" onClick={() => handleDeleteCt(ct._id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                    {ct.description && <p className="text-sm text-muted-foreground">{ct.description}</p>}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
