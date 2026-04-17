"use client";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { PageLoader } from "@/components/ui/loading";
import { useAuthStore } from "@/lib/store";
import api from "@/lib/api";
import { Clock, LogIn, LogOut, Timer, AlertTriangle, Loader2, Settings, Save } from "lucide-react";

const SHIFT_TYPES = [
  { value: 'full-time', label: 'Full-Time', desc: 'Fixed daily schedule, late is tracked' },
  { value: 'part-time', label: 'Part-Time', desc: 'Shorter fixed hours, late is tracked' },
  { value: 'flexible', label: 'Flexible', desc: 'No fixed start time, late is never marked' },
] as const;

export default function AttendancePage() {
  const { hasPermission } = useAuthStore();
  const canManageSettings = hasPermission('attendance:settings');

  const [todayStatus, setTodayStatus] = useState<any>(null);
  const [records, setRecords] = useState<any[]>([]);
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [settingsForm, setSettingsForm] = useState<any>({
    workStartTime: '09:00',
    workEndTime: '17:00',
    gracePeriodMinutes: 5,
    shiftType: 'full-time',
    label: 'Default Work Schedule',
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [todayRes, recordsRes, settingsRes] = await Promise.all([
        api.get('/attendance/today'),
        api.get('/attendance/me'),
        api.get('/attendance/settings'),
      ]);
      setTodayStatus(todayRes.data);
      setRecords(Array.isArray(recordsRes.data) ? recordsRes.data : []);
      const s = settingsRes.data;
      setSettings(s);
      setSettingsForm({
        workStartTime: s.workStartTime || '09:00',
        workEndTime: s.workEndTime || '17:00',
        gracePeriodMinutes: s.gracePeriodMinutes ?? 5,
        standardHours: s.standardHours ?? 8,
        shiftType: s.shiftType || 'full-time',
        label: s.label || 'Default Work Schedule',
      });
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const handleCheckIn = async () => {
    setActionLoading(true);
    try { await api.post('/attendance/check-in', {}); fetchData(); } catch (e) { console.error(e); }
    setActionLoading(false);
  };

  const handleCheckOut = async () => {
    setActionLoading(true);
    try { await api.post('/attendance/check-out', {}); fetchData(); } catch (e) { console.error(e); }
    setActionLoading(false);
  };

  const handleSaveSettings = async () => {
    setSettingsSaving(true);
    try {
      await api.put('/attendance/settings', {
        ...settingsForm,
        gracePeriodMinutes: Number(settingsForm.gracePeriodMinutes),
        standardHours: Number(settingsForm.standardHours),
      });
      await fetchData();
      setShowSettings(false);
    } catch (e) { console.error(e); }
    setSettingsSaving(false);
  };

  if (loading) return <PageLoader />;

  const att = todayStatus?.attendance;
  const currentShift = settings?.shiftType || 'full-time';

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Attendance</h1>
          <p className="text-sm text-muted-foreground mt-1">Track your daily attendance</p>
        </div>
        {canManageSettings && (
          <Button variant="outline" size="sm" onClick={() => setShowSettings(!showSettings)}>
            <Settings className="w-4 h-4 mr-1" /> Work Schedule
          </Button>
        )}
      </div>

      {/* Work Schedule Info Banner */}
      {settings && (
        <div className="flex items-center gap-3 text-sm text-muted-foreground bg-accent/50 rounded-lg px-4 py-2">
          <Clock className="w-4 h-4 text-primary shrink-0" />
          <span>
            <strong className="text-foreground">{settings.label}</strong>
            {currentShift !== 'flexible'
              ? ` · ${settings.workStartTime} → ${settings.workEndTime} · ${settings.standardHours}h/day`
              : ' · Flexible hours'}
          </span>
          <Badge variant="secondary" className="ml-auto capitalize">{currentShift}</Badge>
        </div>
      )}

      {/* Settings Panel */}
      {showSettings && canManageSettings && (
        <Card className="border-primary/20">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Settings className="w-4 h-4 text-primary" /> Work Schedule Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Shift Type */}
            <div>
              <p className="text-sm font-medium mb-3">Shift Type</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {SHIFT_TYPES.map(st => (
                  <button
                    key={st.value}
                    onClick={() => setSettingsForm({ ...settingsForm, shiftType: st.value })}
                    className={`text-left p-3 rounded-lg border-2 transition-colors ${
                      settingsForm.shiftType === st.value
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/40'
                    }`}
                  >
                    <p className="font-semibold text-sm">{st.label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{st.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Time Fields (hidden for flexible) */}
            {settingsForm.shiftType !== 'flexible' && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <label className="text-xs text-muted-foreground mb-1.5 block">Work Start Time</label>
                  <Input type="time" value={settingsForm.workStartTime} onChange={e => setSettingsForm({ ...settingsForm, workStartTime: e.target.value })} />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1.5 block">Work End Time</label>
                  <Input type="time" value={settingsForm.workEndTime} onChange={e => setSettingsForm({ ...settingsForm, workEndTime: e.target.value })} />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1.5 block">Grace Period (min)</label>
                  <Input type="number" min={0} max={60} value={settingsForm.gracePeriodMinutes} onChange={e => setSettingsForm({ ...settingsForm, gracePeriodMinutes: e.target.value })} />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1.5 block">Standard Hours/Day</label>
                  <Input type="number" min={1} max={24} step="0.5" value={settingsForm.standardHours} onChange={e => setSettingsForm({ ...settingsForm, standardHours: e.target.value })} />
                </div>
              </div>
            )}

            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">Schedule Label</label>
              <Input placeholder="e.g. Morning Shift" value={settingsForm.label} onChange={e => setSettingsForm({ ...settingsForm, label: e.target.value })} />
            </div>

            <div className="flex gap-2">
              <Button onClick={handleSaveSettings} disabled={settingsSaving}>
                {settingsSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Save className="w-4 h-4 mr-1" /> Save Settings</>}
              </Button>
              <Button variant="outline" onClick={() => setShowSettings(false)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Today's Status */}
      <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-orange-600/5">
        <CardContent className="p-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h3 className="text-lg font-bold">Today — {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</h3>
              <div className="flex items-center gap-4 mt-3 text-sm">
                {att?.checkIn && (
                  <span className="flex items-center gap-1.5 text-success">
                    <LogIn className="w-4 h-4" /> Check-in: {new Date(att.checkIn).toLocaleTimeString()}
                  </span>
                )}
                {att?.checkOut && (
                  <span className="flex items-center gap-1.5 text-primary">
                    <LogOut className="w-4 h-4" /> Check-out: {new Date(att.checkOut).toLocaleTimeString()}
                  </span>
                )}
                {att?.workingHours > 0 && (
                  <span className="flex items-center gap-1.5">
                    <Timer className="w-4 h-4" /> {att.workingHours}h
                  </span>
                )}
                {att?.lateMinutes > 0 && (
                  <span className="flex items-center gap-1.5 text-warning">
                    <AlertTriangle className="w-4 h-4" /> {att.lateMinutes}m late
                  </span>
                )}
                {!att?.checkIn && currentShift !== 'flexible' && settings && (
                  <span className="text-muted-foreground text-xs">
                    Expected at {settings.workStartTime}
                  </span>
                )}
              </div>
            </div>
            <div className="flex gap-2">
              {!todayStatus?.checkedIn ? (
                <Button onClick={handleCheckIn} disabled={actionLoading} size="lg" className="animate-pulse-glow">
                  {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><LogIn className="w-4 h-4" /> Check In</>}
                </Button>
              ) : !todayStatus?.checkedOut ? (
                <Button onClick={handleCheckOut} disabled={actionLoading} size="lg" variant="outline">
                  {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><LogOut className="w-4 h-4" /> Check Out</>}
                </Button>
              ) : (
                <Badge variant="success" className="text-sm px-4 py-2">✓ Day Complete</Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* History */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="w-4 h-4 text-primary" /> Attendance History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-2 text-muted-foreground font-medium">Date</th>
                  <th className="text-left py-3 px-2 text-muted-foreground font-medium">Check In</th>
                  <th className="text-left py-3 px-2 text-muted-foreground font-medium">Check Out</th>
                  <th className="text-left py-3 px-2 text-muted-foreground font-medium">Hours</th>
                  <th className="text-left py-3 px-2 text-muted-foreground font-medium">Late</th>
                  <th className="text-left py-3 px-2 text-muted-foreground font-medium">OT</th>
                  <th className="text-left py-3 px-2 text-muted-foreground font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {records.map((r: any) => (
                  <tr key={r._id} className="border-b border-border/50 hover:bg-accent/50">
                    <td className="py-3 px-2">{new Date(r.date).toLocaleDateString()}</td>
                    <td className="py-3 px-2">{r.checkIn ? new Date(r.checkIn).toLocaleTimeString() : '—'}</td>
                    <td className="py-3 px-2">{r.checkOut ? new Date(r.checkOut).toLocaleTimeString() : '—'}</td>
                    <td className="py-3 px-2">{r.workingHours || 0}h</td>
                    <td className="py-3 px-2">{r.lateMinutes ? <span className="text-warning">{r.lateMinutes}m</span> : '—'}</td>
                    <td className="py-3 px-2">{r.overtimeMinutes ? <span className="text-success">{r.overtimeMinutes}m</span> : '—'}</td>
                    <td className="py-3 px-2"><Badge variant={r.status === 'present' ? 'success' : 'destructive'}>{r.status}</Badge></td>
                  </tr>
                ))}
                {records.length === 0 && (
                  <tr><td colSpan={7} className="py-8 text-center text-muted-foreground">No attendance records</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
