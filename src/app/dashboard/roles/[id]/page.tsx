"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageLoader } from "@/components/ui/loading";
import api from "@/lib/api";
import { ArrowLeft, Shield, Users, Check } from "lucide-react";

export default function RoleDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [role, setRole] = useState<any>(null);
  const [assignedUsers, setAssignedUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [roleRes, usersRes] = await Promise.all([
          api.get(`/roles/${id}`),
          api.get('/users', { params: { limit: 200 } }),
        ]);
        setRole(roleRes.data);
        const users = usersRes.data.data || [];
        setAssignedUsers(users.filter((u: any) => u.role?._id === id || u.role === id));
      } catch (e) { console.error(e); }
      setLoading(false);
    };
    fetchData();
  }, [id]);

  // Group permissions by resource
  const permGroups: Record<string, string[]> = {};
  (role?.permissions || []).forEach((p: string) => {
    if (p === '*') { permGroups['ALL'] = ['* (Full Access)']; return; }
    const [resource] = p.split(':');
    if (!permGroups[resource]) permGroups[resource] = [];
    permGroups[resource].push(p);
  });

  if (loading) return <PageLoader />;
  if (!role) return <div className="text-center py-20 text-muted-foreground">Role not found</div>;

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.push('/dashboard/roles')}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <Shield className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">{role.name}</h1>
              <p className="text-sm text-muted-foreground">{role.description || 'No description'}</p>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          {role.isSystem && <Badge variant="secondary" className="text-sm px-3 py-1">System Role</Badge>}
          <Badge variant="default" className="text-sm px-3 py-1">{role.permissions?.length || 0} Permissions</Badge>
        </div>
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-5 text-center">
            <Shield className="w-8 h-8 mx-auto mb-2 text-primary" />
            <p className="text-2xl font-bold">{role.permissions?.length || 0}</p>
            <p className="text-xs text-muted-foreground">Permissions</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5 text-center">
            <Users className="w-8 h-8 mx-auto mb-2 text-blue-500" />
            <p className="text-2xl font-bold">{assignedUsers.length}</p>
            <p className="text-xs text-muted-foreground">Users Assigned</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5 text-center">
            <Check className="w-8 h-8 mx-auto mb-2 text-green-500" />
            <p className="text-2xl font-bold">{role.isSystem ? 'Yes' : 'No'}</p>
            <p className="text-xs text-muted-foreground">System Protected</p>
          </CardContent>
        </Card>
      </div>

      {/* Permissions Grid */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Permissions</CardTitle>
        </CardHeader>
        <CardContent>
          {Object.keys(permGroups).length === 0 ? (
            <p className="text-sm text-muted-foreground">No permissions assigned</p>
          ) : (
            <div className="space-y-4">
              {Object.entries(permGroups).map(([group, perms]) => (
                <div key={group} className="p-4 rounded-lg bg-accent/50">
                  <p className="text-xs font-semibold text-muted-foreground uppercase mb-3">{group}</p>
                  <div className="flex flex-wrap gap-2">
                    {perms.map(p => (
                      <Badge key={p} variant="default" className="px-3 py-1.5">
                        <Check className="w-3 h-3 mr-1.5" />
                        {p.includes(':') ? p.split(':')[1] : p}
                      </Badge>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Assigned Users */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Assigned Users ({assignedUsers.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {assignedUsers.length === 0 ? (
            <p className="text-sm text-muted-foreground">No users assigned to this role</p>
          ) : (
            <div className="space-y-3">
              {assignedUsers.map(user => (
                <div key={user._id} className="flex items-center gap-3 p-3 rounded-lg bg-accent/30">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary to-orange-600 flex items-center justify-center text-white font-bold text-sm">
                    {user.name?.[0]?.toUpperCase() || '?'}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{user.name}</p>
                    <p className="text-xs text-muted-foreground">{user.email}</p>
                  </div>
                  <Badge variant={user.isActive ? 'success' : 'destructive'}>{user.isActive ? 'Active' : 'Inactive'}</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Meta */}
      <Card>
        <CardContent className="p-5">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div><span className="text-muted-foreground">Created:</span> <span className="ml-2">{new Date(role.createdAt).toLocaleString()}</span></div>
            <div><span className="text-muted-foreground">Updated:</span> <span className="ml-2">{new Date(role.updatedAt).toLocaleString()}</span></div>
            <div><span className="text-muted-foreground">ID:</span> <span className="ml-2 font-mono text-xs">{role._id}</span></div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
