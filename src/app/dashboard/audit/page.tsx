'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { formatDistanceToNow } from 'date-fns';
import { arSA } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { PageLoader, EmptyState } from '@/components/ui/loading';
import {
  FileText,
  Search,
  Filter,
  X,
  ChevronLeft,
  ChevronRight,
  Eye,
  User,
  Activity,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface AuditLog {
  _id: string;
  userId: string;
  userEmail: string;
  userName: string;
  action: string;
  entity: string;
  entityId?: string;
  description?: string;
  status: 'success' | 'failed';
  errorMessage?: string;
  ipAddress?: string;
  userAgent?: string;
  oldData?: any;
  newData?: any;
  createdAt: string;
}

interface PaginatedResponse {
  data: AuditLog[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

const ACTION_LABELS: Record<string, string> = {
  create: 'إنشاء',
  update: 'تعديل',
  delete: 'حذف',
  login: 'تسجيل دخول',
  logout: 'تسجيل خروج',
  export: 'تصدير',
  approve: 'موافقة',
  reject: 'رفض',
  generate: 'توليد',
  send: 'إرسال',
  upload: 'رفع ملف',
  download: 'تحميل',
};

const ENTITY_LABELS: Record<string, string> = {
  user: 'مستخدم',
  employee: 'موظف',
  client: 'عميل',
  project: 'مشروع',
  task: 'مهمة',
  attendance: 'حضور',
  leave: 'إجازة',
  payroll: 'رواتب',
  payment: 'دفعة',
  expense: 'مصروف',
  revenue: 'إيراد',
  subscription: 'اشتراك',
  announcement: 'إعلان',
  role: 'صلاحية',
  department: 'قسم',
  position: 'منصب',
  reminder: 'تذكير',
};

export default function AuditLogPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  const [filters, setFilters] = useState({
    action: '',
    entity: '',
    status: '',
    search: '',
    startDate: '',
    endDate: '',
  });

  useEffect(() => {
    fetchLogs();
  }, [page]);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const params: any = { page, limit: 50 };

      if (filters.action) params.action = filters.action;
      if (filters.entity) params.entity = filters.entity;
      if (filters.status) params.status = filters.status;
      if (filters.search) params.search = filters.search;
      if (filters.startDate) params.startDate = filters.startDate;
      if (filters.endDate) params.endDate = filters.endDate;

      const response = await api.get<PaginatedResponse>('/audit', { params });
      setLogs(response.data.data);
      setTotal(response.data.total);
      setTotalPages(response.data.totalPages);
    } catch (error: any) {
      console.error('Failed to fetch audit logs:', error);
      toast.error('Failed to load audit logs');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const applyFilters = () => {
    setPage(1);
    fetchLogs();
  };

  const resetFilters = () => {
    setFilters({
      action: '',
      entity: '',
      status: '',
      search: '',
      startDate: '',
      endDate: '',
    });
    setPage(1);
    setTimeout(fetchLogs, 100);
  };

  const getActionBadgeVariant = (action: string): 'default' | 'secondary' | 'destructive' | 'outline' => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      create: 'default',
      update: 'secondary',
      delete: 'destructive',
      login: 'outline',
      logout: 'outline',
    };
    return variants[action] || 'outline';
  };

  if (loading && logs.length === 0) {
    return <PageLoader />;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Audit Log</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Track all system activities and changes
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className="gap-2"
          >
            <Filter className="w-4 h-4" />
            {showFilters ? 'Hide Filters' : 'Show Filters'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchLogs}
            className="gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Filters Card */}
      {showFilters && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Filter className="w-5 h-5" />
              Filters
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Search */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Search</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    value={filters.search}
                    onChange={(e) => handleFilterChange('search', e.target.value)}
                    placeholder="User, email, description..."
                    className="pl-9"
                  />
                </div>
              </div>

              {/* Action Filter */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Action Type</label>
                <select
                  value={filters.action}
                  onChange={(e) => handleFilterChange('action', e.target.value)}
                  className="w-full h-10 px-3 rounded-md border border-input bg-background"
                >
                  <option value="">All Actions</option>
                  {Object.entries(ACTION_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Entity Filter */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Entity Type</label>
                <select
                  value={filters.entity}
                  onChange={(e) => handleFilterChange('entity', e.target.value)}
                  className="w-full h-10 px-3 rounded-md border border-input bg-background"
                >
                  <option value="">All Entities</option>
                  {Object.entries(ENTITY_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Status Filter */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Status</label>
                <select
                  value={filters.status}
                  onChange={(e) => handleFilterChange('status', e.target.value)}
                  className="w-full h-10 px-3 rounded-md border border-input bg-background"
                >
                  <option value="">All Status</option>
                  <option value="success">Success</option>
                  <option value="failed">Failed</option>
                </select>
              </div>

              {/* Start Date */}
              <div className="space-y-2">
                <label className="text-sm font-medium">From Date</label>
                <Input
                  type="date"
                  value={filters.startDate}
                  onChange={(e) => handleFilterChange('startDate', e.target.value)}
                />
              </div>

              {/* End Date */}
              <div className="space-y-2">
                <label className="text-sm font-medium">To Date</label>
                <Input
                  type="date"
                  value={filters.endDate}
                  onChange={(e) => handleFilterChange('endDate', e.target.value)}
                />
              </div>
            </div>

            <div className="flex gap-2">
              <Button onClick={applyFilters} size="sm">
                Apply Filters
              </Button>
              <Button onClick={resetFilters} variant="outline" size="sm">
                Reset
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats Card */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 text-sm">
            <Activity className="w-4 h-4 text-muted-foreground" />
            <span className="text-muted-foreground">Total Records:</span>
            <Badge variant="secondary">{total.toLocaleString()}</Badge>
            {(filters.action || filters.entity || filters.search) && (
              <span className="text-muted-foreground text-xs">(filtered)</span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Logs Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-12 text-center">
              <PageLoader />
            </div>
          ) : logs.length === 0 ? (
            <EmptyState
              icon={<FileText className="w-12 h-12" />}
              title="No audit logs found"
              description="No activity has been recorded yet"
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b bg-muted/50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Time
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      User
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Action
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Entity
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Description
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {logs.map((log) => (
                    <tr key={log._id} className="hover:bg-muted/50">
                      <td className="px-4 py-3 text-sm whitespace-nowrap">
                        <div className="flex flex-col">
                          <span className="font-medium">
                            {formatDistanceToNow(new Date(log.createdAt), {
                              addSuffix: true,
                              locale: arSA,
                            })}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {new Date(log.createdAt).toLocaleString('en-US', {
                              dateStyle: 'short',
                              timeStyle: 'short',
                            })}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-muted-foreground" />
                          <div className="flex flex-col">
                            <span className="font-medium">{log.userName}</span>
                            <span className="text-xs text-muted-foreground">
                              {log.userEmail}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <Badge variant={getActionBadgeVariant(log.action)}>
                          {ACTION_LABELS[log.action] || log.action}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <span className="font-medium">
                          {ENTITY_LABELS[log.entity] || log.entity}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm max-w-xs truncate">
                        {log.description || '-'}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {log.status === 'success' ? (
                          <div className="flex items-center gap-1 text-green-600">
                            <CheckCircle2 className="w-4 h-4" />
                            <span>Success</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 text-red-600">
                            <AlertCircle className="w-4 h-4" />
                            <span>Failed</span>
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <Button
                          onClick={() => setSelectedLog(log)}
                          variant="ghost"
                          size="sm"
                          className="gap-2"
                        >
                          <Eye className="w-4 h-4" />
                          View
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-4 py-3 border-t flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                Page {page} of {totalPages}
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  variant="outline"
                  size="sm"
                  className="gap-2"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Previous
                </Button>
                <Button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  variant="outline"
                  size="sm"
                  className="gap-2"
                >
                  Next
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Details Dialog */}
      <Dialog open={!!selectedLog} onOpenChange={() => setSelectedLog(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Audit Log Details
            </DialogTitle>
          </DialogHeader>

          {selectedLog && (
            <div className="space-y-6">
              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground uppercase">
                    User
                  </label>
                  <p className="text-sm font-medium">
                    {selectedLog.userName} ({selectedLog.userEmail})
                  </p>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground uppercase">
                    Time
                  </label>
                  <p className="text-sm font-medium">
                    {new Date(selectedLog.createdAt).toLocaleString()}
                  </p>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground uppercase">
                    Action
                  </label>
                  <Badge variant={getActionBadgeVariant(selectedLog.action)}>
                    {ACTION_LABELS[selectedLog.action] || selectedLog.action}
                  </Badge>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground uppercase">
                    Entity
                  </label>
                  <p className="text-sm font-medium">
                    {ENTITY_LABELS[selectedLog.entity] || selectedLog.entity}
                  </p>
                </div>
                {selectedLog.ipAddress && (
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground uppercase">
                      IP Address
                    </label>
                    <p className="text-sm font-mono">{selectedLog.ipAddress}</p>
                  </div>
                )}
                {selectedLog.entityId && (
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground uppercase">
                      Entity ID
                    </label>
                    <p className="text-sm font-mono">{selectedLog.entityId}</p>
                  </div>
                )}
              </div>

              {selectedLog.description && (
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground uppercase">
                    Description
                  </label>
                  <p className="text-sm">{selectedLog.description}</p>
                </div>
              )}

              {selectedLog.errorMessage && (
                <div className="space-y-1">
                  <label className="text-xs font-medium text-red-600 uppercase">
                    Error Message
                  </label>
                  <div className="text-sm text-red-600 bg-red-50 dark:bg-red-950/20 p-3 rounded-md border border-red-200 dark:border-red-900">
                    {selectedLog.errorMessage}
                  </div>
                </div>
              )}

              {selectedLog.oldData && (
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground uppercase">
                    Old Data
                  </label>
                  <pre className="text-xs bg-muted p-3 rounded-md overflow-x-auto border">
                    {JSON.stringify(selectedLog.oldData, null, 2)}
                  </pre>
                </div>
              )}

              {selectedLog.newData && (
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground uppercase">
                    New Data
                  </label>
                  <pre className="text-xs bg-muted p-3 rounded-md overflow-x-auto border">
                    {JSON.stringify(selectedLog.newData, null, 2)}
                  </pre>
                </div>
              )}

              {selectedLog.userAgent && (
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground uppercase">
                    User Agent
                  </label>
                  <p className="text-xs font-mono break-all text-muted-foreground">
                    {selectedLog.userAgent}
                  </p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
