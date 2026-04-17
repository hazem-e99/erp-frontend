"use client";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { PageLoader } from "@/components/ui/loading";
import api from "@/lib/api";
import { User, Mail, Shield, Briefcase, DollarSign, Calendar, Lock, Loader2, Save, Check } from "lucide-react";

export default function ProfilePage() {
  const [user, setUser]         = useState<any>(null);
  const [employee, setEmployee] = useState<any>(null);
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [changingPw, setChangingPw] = useState(false);
  const [showPwForm, setShowPwForm] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  const [profile, setProfile] = useState({ name: '', phone: '', address: '', whatsappNumber: '' });
  const [pwForm, setPwForm]   = useState({ oldPassword: '', newPassword: '', confirmPassword: '' });

  useEffect(() => {
    const fetchProfile = async () => {
      let userData: any = null;
      let empData: any  = null;
      try { const uRes = await api.get('/auth/profile'); userData = uRes.data; setUser(userData); } catch (e) { console.error(e); }
      try { const eRes = await api.get('/employees/me'); empData  = eRes.data; setEmployee(empData); } catch {}
      setProfile({
        name:           userData?.name             || '',
        phone:          userData?.phone            || '',
        address:        empData?.address           || '',
        whatsappNumber: empData?.whatsappNumber    || '',
      });
      setLoading(false);
    };
    fetchProfile();
  }, []);

  const handleProfileSave = async () => {
    setSaving(true);
    try {
      await api.put('/employees/me/profile', profile);
      setSuccessMsg('Profile updated successfully!');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (e: any) { alert(e.response?.data?.message || 'Error'); }
    setSaving(false);
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pwForm.newPassword !== pwForm.confirmPassword) return alert('Passwords do not match');
    if (pwForm.newPassword.length < 6) return alert('Password must be at least 6 characters');
    setChangingPw(true);
    try {
      await api.post('/employees/me/change-password', {
        oldPassword: pwForm.oldPassword,
        newPassword: pwForm.newPassword,
      });
      setPwForm({ oldPassword: '', newPassword: '', confirmPassword: '' });
      setShowPwForm(false);
      setSuccessMsg('Password changed successfully!');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (e: any) { alert(e.response?.data?.message || 'Error changing password'); }
    setChangingPw(false);
  };

  if (loading) return <PageLoader />;

  const role = user?.role;

  return (
    <div className="space-y-6 animate-fade-in max-w-3xl">

      {/* Success Banner */}
      {successMsg && (
        <div className="bg-success/10 border border-success/30 rounded-xl p-3 flex items-center gap-2 text-success text-sm">
          <Check className="w-4 h-4" /> {successMsg}
        </div>
      )}

      {/* ── Header / Avatar ──────────────────────────────────────────────────── */}
      <div className="flex items-center gap-4">
        {/* ✅ removed to-orange-600 — gradient now primary → primary-active */}
        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary to-[var(--primary-active)] flex items-center justify-center text-white font-bold text-3xl shadow-lg shadow-primary/25">
          {user?.name?.[0]?.toUpperCase() || '?'}
        </div>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{user?.name}</h1>
          <p className="text-sm text-muted-foreground">{user?.email}</p>
          <div className="flex gap-2 mt-2">
            <Badge variant="default">{role?.name || 'No Role'}</Badge>
            {employee?.status && (
              <Badge variant={employee.status === 'active' ? 'success' : 'destructive'}>
                {employee.status}
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* ── Personal Information (Editable) ─────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <User className="w-4 h-4 text-primary" /> Personal Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Full Name</label>
              <Input value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Phone</label>
              <Input value={profile.phone} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">WhatsApp</label>
              <Input value={profile.whatsappNumber} onChange={(e) => setProfile({ ...profile, whatsappNumber: e.target.value })} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Address</label>
              <Input value={profile.address} onChange={(e) => setProfile({ ...profile, address: e.target.value })} />
            </div>
          </div>
          <Button onClick={handleProfileSave} disabled={saving}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Save className="w-4 h-4 mr-1" />}
            Save Profile
          </Button>
        </CardContent>
      </Card>

      {/* ── Employment Details (Read-only) ───────────────────────────────────── */}
      {employee && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-primary" /> Employment Details
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                { icon: Shield,    label: 'Employee ID', value: employee.employeeId },
                { icon: Briefcase, label: 'Department',  value: employee.department || employee.departments?.join(', ') || 'N/A' },
                { icon: User,      label: 'Position',    value: employee.position   || employee.positions?.join(', ')   || 'N/A' },
                { icon: DollarSign,label: 'Salary',      value: `$${employee.baseSalary?.toLocaleString() || 0}` },
                { icon: Calendar,  label: 'Joined',      value: employee.dateOfJoining ? new Date(employee.dateOfJoining).toLocaleDateString() : 'N/A' },
                { icon: Mail,      label: 'Email',       value: employee.emailAddress || user?.email || 'N/A' },
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
            <p className="text-xs text-muted-foreground mt-3 italic">
              * Salary, department, and role can only be changed by Admin.
            </p>
          </CardContent>
        </Card>
      )}

      {/* ── Security / Password ──────────────────────────────────────────────── */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Lock className="w-4 h-4 text-primary" /> Security
          </CardTitle>
          <Button variant="outline" size="sm" onClick={() => setShowPwForm(!showPwForm)}>
            {showPwForm ? 'Cancel' : 'Change Password'}
          </Button>
        </CardHeader>
        {showPwForm && (
          <CardContent>
            <form onSubmit={handleChangePassword} className="space-y-4 max-w-md">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Current Password</label>
                <Input type="password" value={pwForm.oldPassword} onChange={(e) => setPwForm({ ...pwForm, oldPassword: e.target.value })} required />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">New Password (min 6 chars)</label>
                <Input type="password" value={pwForm.newPassword} onChange={(e) => setPwForm({ ...pwForm, newPassword: e.target.value })} required minLength={6} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Confirm New Password</label>
                <Input type="password" value={pwForm.confirmPassword} onChange={(e) => setPwForm({ ...pwForm, confirmPassword: e.target.value })} required />
              </div>
              <Button type="submit" disabled={changingPw}>
                {changingPw ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Lock className="w-4 h-4 mr-1" />}
                Change Password
              </Button>
            </form>
          </CardContent>
        )}
      </Card>

    </div>
  );
}
