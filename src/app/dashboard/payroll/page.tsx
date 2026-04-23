"use client";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { PageLoader, EmptyState } from "@/components/ui/loading";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel } from "@/components/ui/alert-dialog";
import api from "@/lib/api";
import { toast } from "sonner";
import { DollarSign, Calendar, Upload, Check, Loader2, TrendingUp, TrendingDown, ChevronDown, ChevronUp, Search, Filter, Receipt } from "lucide-react";
import { BASE_CURRENCY } from "@/app/dashboard/finance/components/finance.types";

interface Employee {
  _id: string;
  employeeId: string;
  baseSalary: number;
  maxKpi: number;
  currency?: string;
  exchangeRate?: number;
  userId: { _id: string; name: string; email: string };
}

interface PayrollData {
  employeeId: string;
  bonus: number;
  commission: number;
  deduction: number;
  kpiPercentage: number;
}

const statusColors: Record<string, any> = { draft: 'secondary', processed: 'warning', paid: 'success' };

const normalizeId = (value: any): string => {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'object' && value._id) return String(value._id);
  if (typeof value === 'object' && value.id) return String(value.id);
  return String(value);
};

export default function PayrollPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [payrolls, setPayrolls] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [payrollData, setPayrollData] = useState<Record<string, PayrollData>>({});
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [uploadDialog, setUploadDialog] = useState<{ open: boolean; payrollId: string | null }>({ open: false, payrollId: null });
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [transactionNumber, setTransactionNumber] = useState("");
  const [uploading, setUploading] = useState(false);
  const [openCards, setOpenCards] = useState<Record<string, boolean>>({});
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [pendingExpenses, setPendingExpenses] = useState<number>(0);
  const [expensesDialog, setExpensesDialog] = useState(false);
  const [markingExpenses, setMarkingExpenses] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [eRes, pRes, pendingRes] = await Promise.all([
        api.get('/employees', { params: { limit: 1000 } }),
        api.get('/payroll', { params: { month: selectedMonth, year: selectedYear, limit: 1000 } }),
        api.get('/payroll/pending-expenses-amount').catch(() => ({ data: { total: 0 } }))
      ]);
      
      const empData = eRes.data.data || [];
      setEmployees(empData);
      
      const payData = pRes.data.data || [];
      setPayrolls(payData);

      const pendingAmount = pendingRes.data?.total || 0;
      const paidPayrolls = payData.filter((p: any) => p.status === 'paid');
      
      console.log('🔍 Pending Expenses Amount:', pendingAmount);
      console.log('📊 Total Paid Payrolls:', paidPayrolls.length);
      console.log('💰 Paid Payrolls Details:', paidPayrolls.map((p: any) => ({
        employee: p.employeeId?.userId?.name,
        netSalary: p.netSalary,
        isRecorded: p.isRecordedAsExpense,
        baseSalary: p.baseSalary,
        commissions: p.commissions,
        deductions: p.deductions,
      })));
      
      setPendingExpenses(pendingAmount);

      const getPayrollEmployeeId = (payroll: any): string => normalizeId(payroll?.employeeId);
      
      // Initialize payroll data for each employee
      const initialData: Record<string, PayrollData> = {};
      empData.forEach((emp: Employee) => {
        const existingPayroll = payData.find((p: any) => getPayrollEmployeeId(p) === normalizeId(emp._id));
        initialData[emp._id] = existingPayroll ? {
          employeeId: emp._id,
          bonus: existingPayroll.bonuses || 0,
          commission: existingPayroll.commissions || 0,
          deduction: existingPayroll.deductions || 0,
          kpiPercentage: existingPayroll.kpiPercentage || 0,
        } : {
          employeeId: emp._id,
          bonus: 0,
          commission: 0,
          deduction: 0,
          kpiPercentage: 0,
        };
      });
      setPayrollData(initialData);
    } catch (e) {
      console.error(e);
      toast.error('Failed to load data');
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [selectedMonth, selectedYear]);

  const updatePayrollData = (empId: string, field: keyof PayrollData, value: number) => {
    setPayrollData(prev => ({
      ...prev,
      [empId]: { ...prev[empId], [field]: value }
    }));
  };

  const calculateNetSalary = (emp: Employee, data: PayrollData) => {
    const maxKpi = emp.maxKpi || 0;
    const kpiAmount = (maxKpi * data.kpiPercentage) / 100;
    return emp.baseSalary + data.bonus + data.commission - data.deduction + kpiAmount;
  };

  const getPayrollEmployeeId = (payroll: any): string => normalizeId(payroll?.employeeId);

  const handleGenerateOrUpdate = async (empId: string) => {
    const employee = employees.find(e => e._id === empId);
    if (!employee) return;

    const data = payrollData[empId];
    const normalizedEmpId = normalizeId(empId);
    const existingPayroll = payrolls.find(p => getPayrollEmployeeId(p) === normalizedEmpId);

    try {
      if (existingPayroll) {
        // Update existing payroll
        await api.put(`/payroll/${existingPayroll._id}`, {
          bonuses: data.bonus,
          commissions: data.commission,
          deductions: data.deduction,
          maxKpi: employee.maxKpi || 0,
          kpiPercentage: data.kpiPercentage,
        });
        toast.success('Payroll updated successfully');
      } else {
        // Generate new payroll only after checking server for existing record.
        try {
          const refreshed = await api.get('/payroll', { params: { month: selectedMonth, year: selectedYear, employeeId: empId, limit: 1 } });
          const payrollToUpdate = refreshed.data?.data?.[0];

          if (payrollToUpdate?._id) {
            await api.put(`/payroll/${payrollToUpdate._id}`, {
              bonuses: data.bonus,
              commissions: data.commission,
              deductions: data.deduction,
              maxKpi: employee.maxKpi || 0,
              kpiPercentage: data.kpiPercentage,
            });
            toast.success('Payroll updated successfully');
          } else {
            await api.post('/payroll/generate', {
              employeeId: empId,
              month: selectedMonth,
              year: selectedYear,
              bonuses: data.bonus,
              commissions: data.commission,
              deductions: data.deduction,
              maxKpi: employee.maxKpi || 0,
              kpiPercentage: data.kpiPercentage,
            });
            toast.success('Payroll generated successfully');
          }
        } catch (generateError: any) {
          const isAlreadyGenerated = generateError?.response?.status === 409;
          if (!isAlreadyGenerated) throw generateError;

          // Fallback: if payroll was generated in parallel/by stale state, update it instead.
          const refreshed = await api.get('/payroll', { params: { month: selectedMonth, year: selectedYear, employeeId: empId, limit: 1 } });
          const payrollToUpdate = refreshed.data?.data?.[0];
          if (!payrollToUpdate?._id) throw generateError;

          await api.put(`/payroll/${payrollToUpdate._id}`, {
            bonuses: data.bonus,
            commissions: data.commission,
            deductions: data.deduction,
            maxKpi: employee.maxKpi || 0,
            kpiPercentage: data.kpiPercentage,
          });
          toast.success('Payroll updated successfully');
        }
      }
      fetchData();
    } catch (e: any) {
      console.error(e);
      toast.error(e.response?.data?.message || 'Failed to save payroll');
    }
  };

  const openUploadDialog = (payrollId: string) => {
    setUploadDialog({ open: true, payrollId });
    setScreenshot(null);
    setTransactionNumber("");
  };

  const handleMarkAsPaid = async () => {
    if (!uploadDialog.payrollId || !screenshot) {
      toast.error('Please upload a screenshot');
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('screenshot', screenshot);
      if (transactionNumber) {
        formData.append('transactionNumber', transactionNumber);
      }

      await api.post(`/payroll/${uploadDialog.payrollId}/upload-screenshot`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      toast.success('Payment confirmed successfully');
      setUploadDialog({ open: false, payrollId: null });
      fetchData();
    } catch (e: any) {
      console.error(e);
      toast.error(e.response?.data?.message || 'Failed to upload screenshot');
    } finally {
      setUploading(false);
    }
  };

  const handleMarkAsExpenses = async () => {
    if (pendingExpenses === 0) {
      toast.error('No paid payrolls to record as expenses');
      return;
    }

    setMarkingExpenses(true);
    try {
      const response = await api.post('/payroll/mark-as-expenses');
      toast.success(`✅ Recorded ${response.data.count} salary payment(s) as expense totaling $${response.data.total.toLocaleString()}`);
      setExpensesDialog(false);
      fetchData();
    } catch (e: any) {
      console.error(e);
      toast.error(e.response?.data?.message || 'Failed to record expenses');
    } finally {
      setMarkingExpenses(false);
    }
  };

  if (loading) return <PageLoader />;

  // Filter employees based on search and status
  const filteredEmployees = employees.filter(emp => {
    // Search filter
    const matchesSearch = searchQuery === "" || 
      emp.userId.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.employeeId.toLowerCase().includes(searchQuery.toLowerCase());
    
    // Status filter
    if (statusFilter === "all") return matchesSearch;
    
    const existingPayroll = payrolls.find(p => getPayrollEmployeeId(p) === normalizeId(emp._id));
    if (statusFilter === "no-payroll") {
      return matchesSearch && !existingPayroll;
    }
    return matchesSearch && existingPayroll?.status === statusFilter;
  });

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Payroll Management</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage employee salaries, bonuses, and commissions</p>
        </div>
        
        <div className="flex items-center gap-3">
          {/* Mark as Expenses Button */}
          {pendingExpenses > 0 && (
            <Button
              variant="default"
              className="gap-2"
              onClick={() => setExpensesDialog(true)}
            >
              <Receipt className="w-4 h-4" />
              Mark as Expenses (${pendingExpenses.toLocaleString()})
            </Button>
          )}

          {/* Period Selector */}
          <div className="flex items-center gap-3">
            <Calendar className="w-4 h-4 text-muted-foreground" />
            <select 
              className="h-10 rounded-lg border border-input bg-card px-3 text-sm"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(+e.target.value)}
            >
              {Array.from({length: 12}, (_, i) => (
                <option key={i+1} value={i+1}>
                  {new Date(2000, i).toLocaleString('default', {month: 'long'})}
                </option>
              ))}
            </select>
            <Input
              type="number"
              className="w-24"
              value={selectedYear}
              onChange={(e) => setSelectedYear(+e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or employee ID..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {/* Status Filter */}
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-muted-foreground" />
              <select
                className="h-10 rounded-lg border border-input bg-card px-3 text-sm w-40"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="all">All Status</option>
                <option value="no-payroll">No Payroll</option>
                <option value="draft">Draft</option>
                <option value="processed">Processed</option>
                <option value="paid">Paid</option>
              </select>
            </div>

            {/* Results Count */}
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span className="font-medium text-foreground">{filteredEmployees.length}</span>
              of {employees.length} employees
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Employee Payroll Cards */}
      {filteredEmployees.length === 0 ? (
        <EmptyState icon={<DollarSign className="w-12 h-12" />} title="No employees found" />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredEmployees.map(emp => {
            const data = payrollData[emp._id] || { bonus: 0, commission: 0, deduction: 0, kpiPercentage: 0 };
            const netSalary = calculateNetSalary(emp, data);
            const maxKpi = emp.maxKpi || 0;
            const kpiAmount = (maxKpi * data.kpiPercentage) / 100;
            const existingPayroll = payrolls.find(p => getPayrollEmployeeId(p) === normalizeId(emp._id));
            const isOpen = openCards[emp._id] || false;

            return (
              <Collapsible 
                key={emp._id} 
                open={isOpen} 
                onOpenChange={(open) => setOpenCards(prev => ({ ...prev, [emp._id]: open }))}
              >
                <Card className="group hover:shadow-md transition-all">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-base truncate">{emp.userId.name}</CardTitle>
                        <p className="text-xs text-muted-foreground">ID: {emp.employeeId}</p>
                      </div>
                      {existingPayroll && (
                        <Badge variant={statusColors[existingPayroll.status]} className="text-xs">
                          {existingPayroll.status}
                        </Badge>
                      )}
                    </div>
                  </CardHeader>
                  
                  <CardContent className="space-y-3">
                    {/* Summary - Always Visible */}
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Base Salary</span>
                        <span className="font-medium">
                          {emp.baseSalary.toLocaleString()} {emp.currency || BASE_CURRENCY}
                          {emp.currency && emp.currency !== BASE_CURRENCY && emp.exchangeRate && (
                            <span className="text-xs text-muted-foreground ml-1">(@{emp.exchangeRate})</span>
                          )}
                        </span>
                      </div>
                      <div className="flex justify-between text-base font-bold pt-2 border-t">
                        <span>Net Salary</span>
                        <span className="text-primary">{existingPayroll?.netSalary ? `${existingPayroll.netSalary.toLocaleString()} ${BASE_CURRENCY}` : `${netSalary.toLocaleString()} ${emp.currency || BASE_CURRENCY}`}</span>
                      </div>
                    </div>

                    {/* Collapsible Trigger */}
                    <CollapsibleTrigger asChild>
                      <Button variant="outline" size="sm" className="w-full justify-between">
                        <span>{isOpen ? 'Hide' : 'Show'} Details</span>
                        {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </Button>
                    </CollapsibleTrigger>

                    {/* Collapsible Content - Input Fields */}
                    <CollapsibleContent className="space-y-4">
                      {/* Bonus, Commission & Deduction */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div>
                          <label className="text-xs text-muted-foreground flex items-center gap-1">
                            <TrendingUp className="w-3 h-3 text-success" />
                            Bonus
                          </label>
                          <Input
                            type="number"
                            min="0"
                            placeholder="0"
                            value={data.bonus || ''}
                            onChange={(e) => updatePayrollData(emp._id, 'bonus', +e.target.value)}
                            className="mt-1 h-9"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-muted-foreground flex items-center gap-1">
                            <TrendingUp className="w-3 h-3 text-primary" />
                            Commission
                          </label>
                          <Input
                            type="number"
                            min="0"
                            placeholder="0"
                            value={data.commission || ''}
                            onChange={(e) => updatePayrollData(emp._id, 'commission', +e.target.value)}
                            className="mt-1 h-9"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-muted-foreground flex items-center gap-1">
                            <TrendingDown className="w-3 h-3 text-destructive" />
                            Deduction
                          </label>
                          <Input
                            type="number"
                            min="0"
                            placeholder="0"
                            value={data.deduction || ''}
                            onChange={(e) => updatePayrollData(emp._id, 'deduction', +e.target.value)}
                            className="mt-1 h-9"
                          />
                        </div>
                      </div>

                      {/* KPI Settings */}
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs text-muted-foreground">Max KPI ($)</label>
                          <div className="h-9 rounded-lg border border-input bg-muted/50 px-3 text-sm flex items-center mt-1 font-medium">
                            ${maxKpi.toLocaleString()}
                          </div>
                        </div>
                        <div>
                          <label className="text-xs text-muted-foreground">KPI Achievement (%)</label>
                          <Input
                            type="number"
                            min="0"
                            max="100"
                            placeholder="0"
                            value={data.kpiPercentage || ''}
                            onChange={(e) => updatePayrollData(emp._id, 'kpiPercentage', Math.min(100, +e.target.value))}
                            className="mt-1 h-9"
                          />
                        </div>
                      </div>

                      {/* Calculation Breakdown */}
                      <div className="bg-muted/50 rounded-lg p-3 space-y-1.5 text-xs">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Base Salary:</span>
                          <span>{emp.baseSalary.toLocaleString()} {emp.currency || BASE_CURRENCY}</span>
                        </div>
                        {data.bonus > 0 && (
                          <div className="flex justify-between text-success">
                            <span>+ Bonus:</span>
                            <span>+{data.bonus.toLocaleString()} {emp.currency || BASE_CURRENCY}</span>
                          </div>
                        )}
                        {data.commission > 0 && (
                          <div className="flex justify-between text-primary">
                            <span>+ Commission:</span>
                            <span>+{data.commission.toLocaleString()} {emp.currency || BASE_CURRENCY}</span>
                          </div>
                        )}
                        {data.deduction > 0 && (
                          <div className="flex justify-between text-destructive">
                            <span>- Deduction:</span>
                            <span>-{data.deduction.toLocaleString()} {emp.currency || BASE_CURRENCY}</span>
                          </div>
                        )}
                        {kpiAmount > 0 && (
                          <div className="flex justify-between text-primary">
                            <span>+ KPI ({data.kpiPercentage}%):</span>
                            <span>+{kpiAmount.toFixed(2)} {emp.currency || BASE_CURRENCY}</span>
                          </div>
                        )}
                        <div className="flex justify-between font-bold text-sm pt-2 border-t border-border">
                          <span>Total:</span>
                          <span className="text-primary">{netSalary.toLocaleString()} {emp.currency || BASE_CURRENCY}</span>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex gap-2">
                        {/* Always show Update/Generate button */}
                        <Button
                          size="sm"
                          variant={existingPayroll?.status === 'paid' ? 'default' : 'outline'}
                          className="flex-1"
                          onClick={() => handleGenerateOrUpdate(emp._id)}
                        >
                          {existingPayroll ? 'Update' : 'Generate'}
                        </Button>
                        
                        {/* Show Mark Paid only if not paid yet */}
                        {existingPayroll && existingPayroll.status !== 'paid' && (
                          <Button
                            size="sm"
                            className="flex-1 gap-2"
                            onClick={() => openUploadDialog(existingPayroll._id)}
                          >
                            <Check className="w-4 h-4" />
                            Mark Paid
                          </Button>
                        )}
                      </div>
                    </CollapsibleContent>
                  </CardContent>
                </Card>
              </Collapsible>
            );
          })}
        </div>
      )}

      {/* Upload Screenshot Dialog */}
      <AlertDialog open={uploadDialog.open} onOpenChange={(open) => setUploadDialog({ open, payrollId: null })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Upload className="w-5 h-5 text-primary" />
              Upload Transfer Screenshot
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-4 pt-2">
                <div>
                  <label className="text-sm font-medium text-foreground">
                    Transfer Screenshot *
                  </label>
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setScreenshot(e.target.files?.[0] || null)}
                    className="mt-1"
                  />
                  {screenshot && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Selected: {screenshot.name}
                    </p>
                  )}
                </div>

                <div>
                  <label className="text-sm font-medium text-foreground">
                    Transaction Number (Optional)
                  </label>
                  <Input
                    type="text"
                    placeholder="e.g., TXN123456789"
                    value={transactionNumber}
                    onChange={(e) => setTransactionNumber(e.target.value)}
                    className="mt-1"
                  />
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={uploading}>Cancel</AlertDialogCancel>
            <Button onClick={handleMarkAsPaid} disabled={!screenshot || uploading}>
              {uploading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Uploading...
                </>
              ) : (
                'Confirm Payment'
              )}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Mark as Expenses Dialog */}
      <AlertDialog open={expensesDialog} onOpenChange={setExpensesDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Receipt className="w-5 h-5 text-primary" />
              Record Salaries as Expenses
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-4 pt-2">
                <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Total Paid Salaries:</span>
                    <span className="font-bold text-lg text-primary">${pendingExpenses.toLocaleString()}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    This will create a single expense record in the Finance module under "salaries" category.
                  </p>
                </div>
                <div className="text-sm text-foreground">
                  <p className="font-medium mb-2">This action will:</p>
                  <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                    <li>Record all paid payrolls as one expense</li>
                    <li>Add the expense to Finance → Expenses</li>
                    <li>Mark payrolls to prevent duplicate recording</li>
                  </ul>
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={markingExpenses}>Cancel</AlertDialogCancel>
            <Button onClick={handleMarkAsExpenses} disabled={markingExpenses}>
              {markingExpenses ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Recording...
                </>
              ) : (
                'Confirm & Record'
              )}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
