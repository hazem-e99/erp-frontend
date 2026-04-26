'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import api from '@/lib/api';
import { useAuthStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { PageLoader } from '@/components/ui/loading';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Database,
  Download,
  Upload,
  Trash2,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Clock,
  HardDrive,
  ExternalLink,
  AlertTriangle,
  Link2,
  Link2Off,
} from 'lucide-react';

interface BackupRecord {
  id: string;
  filename: string;
  sizeBytes: number;
  sha256: string | null;
  source: 'manual' | 'scheduled';
  location: string;
  status: 'running' | 'succeeded' | 'failed';
  errorMessage: string | null;
  createdAt: string;
  completedAt: string | null;
}

interface DriveStatus {
  connected: boolean;
  email: string | null;
  folderId: string | null;
  connectedAt: string | null;
}

interface RestoreJob {
  id: string;
  status: 'running' | 'succeeded' | 'failed';
  filename: string;
  startedAt: string;
  finishedAt?: string;
  error?: string;
}

const CONFIRM_PHRASE = 'RESTORE PRODUCTION DATABASE';

function formatBytes(n: number): string {
  if (!n) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let i = 0;
  let v = n;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i++;
  }
  return `${v.toFixed(v >= 10 || i === 0 ? 0 : 1)} ${units[i]}`;
}

export default function BackupSettingsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { hasPermission, user } = useAuthStore();

  const [records, setRecords] = useState<BackupRecord[]>([]);
  const [driveStatus, setDriveStatus] = useState<DriveStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [jsonExporting, setJsonExporting] = useState(false);
  const [restoreModalOpen, setRestoreModalOpen] = useState(false);
  const [restoreMode, setRestoreMode] = useState<'upload' | 'existing'>('upload');
  const [selectedBackupId, setSelectedBackupId] = useState<string | null>(null);
  const [pickedFile, setPickedFile] = useState<File | null>(null);
  const [phrase, setPhrase] = useState('');
  const [password, setPassword] = useState('');
  const [ackChecked, setAckChecked] = useState(false);
  const [submittingRestore, setSubmittingRestore] = useState(false);
  const [restoreJob, setRestoreJob] = useState<RestoreJob | null>(null);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const canExport = hasPermission('backup:export');
  const canImport = hasPermission('backup:import');
  const canDelete = hasPermission('backup:delete');

  const fetchAll = useCallback(async () => {
    try {
      const [listRes, statusRes] = await Promise.all([
        api.get<{ items: BackupRecord[] }>('/backup/list'),
        api.get<DriveStatus>('/backup/google/status'),
      ]);
      setRecords(listRes.data.items);
      setDriveStatus(statusRes.data);
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? 'Failed to load backup data';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!user) return;
    if (!canExport) {
      router.replace('/dashboard');
      return;
    }
    fetchAll();
  }, [user, canExport, fetchAll, router]);

  // Handle OAuth redirect flash messages
  useEffect(() => {
    const google = searchParams.get('google');
    const message = searchParams.get('message');
    if (google === 'success') {
      toast.success(message || 'Google Drive connected');
      router.replace('/dashboard/settings/backup');
      fetchAll();
    } else if (google === 'error') {
      toast.error(message || 'Google Drive connection failed');
      router.replace('/dashboard/settings/backup');
    }
  }, [searchParams, router, fetchAll]);

  const startExport = async () => {
    if (!driveStatus?.connected) {
      toast.error('Connect Google Drive first');
      return;
    }
    setExporting(true);
    try {
      const { data } = await api.post('/backup/export');
      toast.success(`Backup created: ${data.filename}`);
      fetchAll();
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Backup failed');
    } finally {
      setExporting(false);
    }
  };

  const startJsonExport = async () => {
    setJsonExporting(true);
    try {
      const res = await api.get('/backup/export-json', { responseType: 'blob' });
      const disposition = (res.headers as any)?.['content-disposition'] as string | undefined;
      const match = disposition?.match(/filename="?([^"]+)"?/);
      const filename = match?.[1] ?? `erp-data-${Date.now()}.zip`;
      const blob = new Blob([res.data], { type: 'application/zip' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success('Data export downloaded');
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'JSON export failed');
    } finally {
      setJsonExporting(false);
    }
  };

  const downloadBackup = async (record: BackupRecord) => {
    try {
      const res = await api.get(`/backup/download/${record.id}`, { responseType: 'blob' });
      const blob = new Blob([res.data], { type: 'application/gzip' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = record.filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Download failed');
    }
  };

  const deleteBackup = async (record: BackupRecord) => {
    if (!confirm(`Delete backup ${record.filename}? This removes the archive from Google Drive too.`)) {
      return;
    }
    try {
      await api.delete(`/backup/${record.id}`);
      toast.success('Backup deleted');
      fetchAll();
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Delete failed');
    }
  };

  const connectDrive = async () => {
    try {
      const { data } = await api.post<{ url: string }>('/backup/google/auth');
      window.location.href = data.url;
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Could not start OAuth');
    }
  };

  const disconnectDrive = async () => {
    if (!confirm('Disconnect Google Drive? New backups will fail until you reconnect.')) return;
    try {
      await api.post('/backup/google/disconnect');
      toast.success('Google Drive disconnected');
      fetchAll();
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Disconnect failed');
    }
  };

  const openRestoreUpload = () => {
    setRestoreMode('upload');
    setSelectedBackupId(null);
    setPickedFile(null);
    setPhrase('');
    setPassword('');
    setAckChecked(false);
    setRestoreJob(null);
    setRestoreModalOpen(true);
  };

  const openRestoreExisting = (id: string) => {
    setRestoreMode('existing');
    setSelectedBackupId(id);
    setPickedFile(null);
    setPhrase('');
    setPassword('');
    setAckChecked(false);
    setRestoreJob(null);
    setRestoreModalOpen(true);
  };

  const closeRestoreModal = () => {
    if (submittingRestore) return;
    if (restoreJob?.status === 'running') return;
    setRestoreModalOpen(false);
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  };

  const submitRestore = async () => {
    if (phrase.trim() !== CONFIRM_PHRASE) {
      toast.error(`Type exactly: ${CONFIRM_PHRASE}`);
      return;
    }
    if (!password) {
      toast.error('Password required');
      return;
    }
    if (!ackChecked) {
      toast.error('Please acknowledge data loss risk');
      return;
    }
    if (restoreMode === 'upload' && !pickedFile) {
      toast.error('Select a backup file');
      return;
    }
    if (restoreMode === 'existing' && !selectedBackupId) {
      toast.error('No backup selected');
      return;
    }

    setSubmittingRestore(true);
    try {
      let jobId: string;
      if (restoreMode === 'upload' && pickedFile) {
        const fd = new FormData();
        fd.append('file', pickedFile);
        fd.append('confirmPhrase', phrase);
        fd.append('password', password);
        const { data } = await api.post('/backup/import', fd, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        jobId = data.jobId;
      } else {
        const { data } = await api.post('/backup/import/existing', {
          backupId: selectedBackupId,
          confirmPhrase: phrase,
          password,
        });
        jobId = data.jobId;
      }
      toast.success('Restore started — do not refresh');
      // Begin polling
      pollingRef.current = setInterval(async () => {
        try {
          const { data } = await api.get<RestoreJob>(`/backup/import/${jobId}`);
          setRestoreJob(data);
          if (data.status !== 'running') {
            if (pollingRef.current) clearInterval(pollingRef.current);
            pollingRef.current = null;
            if (data.status === 'succeeded') toast.success('Restore completed');
            else toast.error(data.error ?? 'Restore failed');
            fetchAll();
          }
        } catch {
          // ignore polling errors (server likely restarting)
        }
      }, 3000);
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Restore failed');
    } finally {
      setSubmittingRestore(false);
    }
  };

  useEffect(() => () => {
    if (pollingRef.current) clearInterval(pollingRef.current);
  }, []);

  if (loading) return <PageLoader />;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Database className="w-6 h-6" />
            Database Backup
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Export, import, and schedule full database backups.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchAll} className="gap-2">
          <RefreshCw className="w-4 h-4" /> Refresh
        </Button>
      </div>

      {/* Google Drive connection card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <HardDrive className="w-5 h-5" />
            Storage: Google Drive
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {driveStatus?.connected ? (
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircle2 className="w-5 h-5" />
                  <span className="font-medium">Connected</span>
                  {driveStatus.email && (
                    <Badge variant="secondary">{driveStatus.email}</Badge>
                  )}
                </div>
                {driveStatus.connectedAt && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Since {new Date(driveStatus.connectedAt).toLocaleString()}
                  </p>
                )}
              </div>
              <Button variant="outline" size="sm" onClick={disconnectDrive} className="gap-2">
                <Link2Off className="w-4 h-4" /> Disconnect
              </Button>
            </div>
          ) : (
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-2 text-amber-600">
                <AlertTriangle className="w-5 h-5" />
                <span>
                  Google Drive is not connected. Backups cannot run until you connect a Google account.
                </span>
              </div>
              <Button onClick={connectDrive} className="gap-2">
                <Link2 className="w-4 h-4" /> Connect Google Drive
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Manual actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Actions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-3">
            <Button
              onClick={startExport}
              disabled={!canExport || exporting || !driveStatus?.connected}
              className="gap-2"
            >
              <Download className="w-4 h-4" />
              {exporting ? 'Exporting…' : 'Export Database Now'}
            </Button>
            <Button
              variant="outline"
              onClick={startJsonExport}
              disabled={!canExport || jsonExporting}
              className="gap-2"
            >
              <Download className="w-4 h-4" />
              {jsonExporting ? 'Preparing…' : 'Download Full Data (JSON)'}
            </Button>
            <Button
              variant="destructive"
              onClick={openRestoreUpload}
              disabled={!canImport}
              className="gap-2"
            >
              <Upload className="w-4 h-4" /> Import / Restore Database
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            <strong>Download Full Data (JSON)</strong> is a manual local archive: a ZIP containing one JSON
            file per collection plus a manifest. Useful for offline inspection — cannot be used to restore
            the database.
          </p>
        </CardContent>
      </Card>

      {/* History */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Backup History</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {records.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              No backups yet. Run your first export above.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b bg-muted/50">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-xs uppercase text-muted-foreground">Created</th>
                    <th className="px-4 py-3 text-left font-medium text-xs uppercase text-muted-foreground">Filename</th>
                    <th className="px-4 py-3 text-left font-medium text-xs uppercase text-muted-foreground">Size</th>
                    <th className="px-4 py-3 text-left font-medium text-xs uppercase text-muted-foreground">Source</th>
                    <th className="px-4 py-3 text-left font-medium text-xs uppercase text-muted-foreground">Status</th>
                    <th className="px-4 py-3 text-left font-medium text-xs uppercase text-muted-foreground">SHA-256</th>
                    <th className="px-4 py-3 text-right font-medium text-xs uppercase text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {records.map((r) => (
                    <tr key={r.id} className="hover:bg-muted/50">
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                          {new Date(r.createdAt).toLocaleString()}
                        </div>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs break-all">{r.filename}</td>
                      <td className="px-4 py-3 whitespace-nowrap">{formatBytes(r.sizeBytes)}</td>
                      <td className="px-4 py-3">
                        <Badge variant={r.source === 'scheduled' ? 'outline' : 'secondary'}>
                          {r.source}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        {r.status === 'succeeded' && (
                          <span className="flex items-center gap-1 text-green-600">
                            <CheckCircle2 className="w-4 h-4" /> Succeeded
                          </span>
                        )}
                        {r.status === 'failed' && (
                          <span className="flex items-center gap-1 text-red-600" title={r.errorMessage ?? ''}>
                            <XCircle className="w-4 h-4" /> Failed
                          </span>
                        )}
                        {r.status === 'running' && (
                          <span className="flex items-center gap-1 text-amber-600">
                            <Clock className="w-4 h-4 animate-pulse" /> Running
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                        {r.sha256 ? r.sha256.slice(0, 12) + '…' : '-'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="inline-flex gap-1">
                          {r.status === 'succeeded' && (
                            <Button size="sm" variant="ghost" onClick={() => downloadBackup(r)} title="Download">
                              <Download className="w-4 h-4" />
                            </Button>
                          )}
                          {r.status === 'succeeded' && canImport && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => openRestoreExisting(r.id)}
                              title="Restore from this backup"
                            >
                              <Upload className="w-4 h-4" />
                            </Button>
                          )}
                          {canDelete && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => deleteBackup(r)}
                              className="text-red-600 hover:text-red-700"
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Automatic Backups</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>
            A GitHub Actions workflow triggers the backend at <code className="px-1.5 py-0.5 bg-muted rounded">02:00 UTC</code> every day.
            The backend runs <code className="px-1.5 py-0.5 bg-muted rounded">mongodump --archive --gzip</code> and streams the result
            directly to Google Drive (no file ever lands on the server disk).
          </p>
          <p>
            Retention policy: <strong>7 daily</strong> + <strong>4 weekly</strong> + <strong>6 monthly</strong> snapshots.
            Older scheduled backups are pruned automatically after each run.
          </p>
          <p>
            <a
              href="https://drive.google.com/drive/search?q=ERP-Backups"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-primary hover:underline"
            >
              Open backups folder in Google Drive
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </p>
        </CardContent>
      </Card>

      {/* Restore modal */}
      <Dialog open={restoreModalOpen} onOpenChange={(o) => !o && closeRestoreModal()}>
        <DialogContent className="max-w-xl border-red-500/50">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="w-5 h-5" />
              Destructive: Restore Database
            </DialogTitle>
            <DialogDescription>
              This wipes all current collections and replaces them with the backup contents. There is no undo.
            </DialogDescription>
          </DialogHeader>

          {restoreJob ? (
            <div className="space-y-3 py-4">
              <div className="text-sm">
                <div className="font-medium">{restoreJob.filename}</div>
                <div className="text-xs text-muted-foreground">
                  Started {new Date(restoreJob.startedAt).toLocaleTimeString()}
                </div>
              </div>
              {restoreJob.status === 'running' && (
                <div className="flex items-center gap-2 text-amber-600">
                  <Clock className="w-4 h-4 animate-pulse" />
                  Restore in progress — keep this window open.
                </div>
              )}
              {restoreJob.status === 'succeeded' && (
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircle2 className="w-4 h-4" /> Restore completed successfully.
                </div>
              )}
              {restoreJob.status === 'failed' && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-red-600">
                    <XCircle className="w-4 h-4" /> Restore failed.
                  </div>
                  {restoreJob.error && (
                    <pre className="text-xs bg-red-50 dark:bg-red-950/20 p-2 rounded border border-red-200 dark:border-red-900 whitespace-pre-wrap">
                      {restoreJob.error}
                    </pre>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4 py-2">
              {restoreMode === 'upload' && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Backup file (.archive.gz)</label>
                  <Input
                    ref={fileInputRef}
                    type="file"
                    accept=".gz,application/gzip"
                    onChange={(e) => setPickedFile(e.target.files?.[0] ?? null)}
                  />
                  {pickedFile && (
                    <div className="text-xs text-muted-foreground">
                      {pickedFile.name} — {formatBytes(pickedFile.size)}
                    </div>
                  )}
                </div>
              )}

              {restoreMode === 'existing' && selectedBackupId && (
                <div className="text-sm p-3 bg-muted rounded">
                  Restoring from:{' '}
                  <span className="font-mono">
                    {records.find((r) => r.id === selectedBackupId)?.filename}
                  </span>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Type <code className="bg-muted px-1.5 py-0.5 rounded text-xs">{CONFIRM_PHRASE}</code> to confirm
                </label>
                <Input
                  value={phrase}
                  onChange={(e) => setPhrase(e.target.value)}
                  placeholder={CONFIRM_PHRASE}
                  autoComplete="off"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Your account password</label>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                />
              </div>

              <label className="flex items-start gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={ackChecked}
                  onChange={(e) => setAckChecked(e.target.checked)}
                  className="mt-0.5"
                />
                <span>
                  I understand this will <strong>permanently overwrite</strong> the current database.
                  All data not present in the backup will be lost.
                </span>
              </label>
            </div>
          )}

          <DialogFooter>
            {!restoreJob ? (
              <>
                <Button variant="outline" onClick={closeRestoreModal} disabled={submittingRestore}>
                  Cancel
                </Button>
                <Button variant="destructive" onClick={submitRestore} disabled={submittingRestore}>
                  {submittingRestore ? 'Starting…' : 'Restore Database'}
                </Button>
              </>
            ) : (
              <Button
                variant="outline"
                onClick={closeRestoreModal}
                disabled={restoreJob.status === 'running'}
              >
                {restoreJob.status === 'running' ? 'Waiting…' : 'Close'}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
