"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageLoader } from "@/components/ui/loading";
import api from "@/lib/api";
import {
  ArrowLeft, Briefcase, DollarSign, Calendar,
  Mail, Phone, MapPin, User, Activity, TreePalm,
} from "lucide-react";

export default function EmployeeDetailPage() {
  const { id }    = useParams();
  const router    = useRouter();
  const [employee, setEmployee] = useState<any>(null);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    const fetchEmployee = async () => {
      try {
        const { data } = await api.get(`/employees/${id}`);
        setEmployee(data);
      } catch (e) { console.error(e); }
      setLoading(false);
    };
    fetchEmployee();
  }, [id]);

  if (loading) return <PageLoader />;
  if (!employee) return <div className="text-center py-20 text-muted-foreground">Employee not found</div>;

  const user = employee.userId || {};
  const statusColor = employee.status === 'active' ? 'success' : employee.status === 'inactive' ? 'warning' : 'destructive';

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.push('/dashboard/employees')}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex items-center gap-4 flex-1">
          {/* ✅ removed to-orange-600 */}
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-[var(--primary-active)] flex items-center justify-center text-white font-bold text-2xl shadow-lg shadow-primary/25">
            {user.name?.[0]?.toUpperCase() || '?'}
          </div>
          <div>
            <h1 className="text-2xl font-bold">{user.name || 'Unknown'}</h1>
            <p className="text-sm text-muted-foreground">{employee.position} · {employee.department}</p>
          </div>
        </div>
        <Badge variant={statusColor} className="text-sm px-3 py-1">{employee.status}</Badge>
      </div>

      {/* ── Overview Cards ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <DollarSign className="w-6 h-6 mx-auto mb-1.5 text-success" />
            <p className="text-xl font-bold">${employee.baseSalary?.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">Base Salary</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <TreePalm className="w-6 h-6 mx-auto mb-1.5 text-blue-500" />
            <p className="text-xl font-bold">{employee.annualLeaves - employee.usedLeaves}</p>
            <p className="text-xs text-muted-foreground">Leaves Left</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            {/* ✅ removed text-orange-500 → text-primary */}
            <Activity className="w-6 h-6 mx-auto mb-1.5 text-primary" />
            <p className="text-xl font-bold">{employee.usedLeaves || 0}</p>
            <p className="text-xs text-muted-foreground">Leaves Used</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Calendar className="w-6 h-6 mx-auto mb-1.5 text-purple-500" />
            <p className="text-xl font-bold">{employee.annualLeaves}</p>
            <p className="text-xs text-muted-foreground">Annual Quota</p>
          </CardContent>
        </Card>
      </div>

      {/* ── Personal Info ───────────────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <User className="w-4 h-4 text-primary" /> Personal Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-8">
            {[
              { icon: Mail,   label: 'Email',             value: user.email            || 'N/A' },
              { icon: Phone,  label: 'WhatsApp',          value: employee.whatsappNumber || user.phone || 'N/A' },
              { icon: MapPin, label: 'Address',           value: employee.address      || 'N/A' },
              { icon: Phone,  label: 'Emergency Contact', value: employee.emergencyContact || 'N/A' },
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} className="flex items-center gap-3 p-3 rounded-lg bg-accent/30">
                <Icon className="w-4 h-4 text-muted-foreground shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <p className="text-sm font-medium">{value}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* ── Employment Details ──────────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Briefcase className="w-4 h-4 text-primary" /> Employment Details
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-8">
            {[
              { label: 'Employee ID',    value: employee.employeeId },
              { label: 'Department',     value: employee.department || employee.departments?.join(', ') || 'N/A' },
              { label: 'Position',       value: employee.position   || employee.positions?.join(', ')   || 'N/A' },
              { label: 'Date of Joining',value: new Date(employee.dateOfJoining).toLocaleDateString() },
              ...(employee.dateOfBirth ? [{ label: 'Date of Birth', value: new Date(employee.dateOfBirth).toLocaleDateString() }] : []),
              { label: 'Status',         value: null, badge: { variant: statusColor, text: employee.status } },
            ].map((row) => (
              <div key={row.label} className="flex justify-between items-center p-3 rounded-lg bg-accent/30">
                <span className="text-sm text-muted-foreground">{row.label}</span>
                {row.badge
                  ? <Badge variant={row.badge.variant as any}>{row.badge.text}</Badge>
                  : <span className="text-sm font-medium font-mono">{row.value}</span>
                }
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* ── Meta ────────────────────────────────────────────────────────────── */}
      <Card>
        <CardContent className="p-5">
          <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground">
            <div>Created: <span className="ml-1 text-foreground">{new Date(employee.createdAt).toLocaleString()}</span></div>
            <div>Updated: <span className="ml-1 text-foreground">{new Date(employee.updatedAt).toLocaleString()}</span></div>
          </div>
        </CardContent>
      </Card>

    </div>
  );
}
