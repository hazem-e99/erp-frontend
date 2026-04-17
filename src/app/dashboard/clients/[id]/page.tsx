"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageLoader } from "@/components/ui/loading";
import api from "@/lib/api";
import { ArrowLeft, Building2, Mail, Phone, Globe, MapPin, User, FileText, FolderKanban, Tag } from "lucide-react";

const statusColors: Record<string, any> = { lead: 'warning', active: 'success', inactive: 'secondary' };

export default function ClientDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [client, setClient] = useState<any>(null);
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [cRes, pRes] = await Promise.all([
          api.get(`/clients/${id}`),
          api.get('/projects', { params: { limit: 100 } }),
        ]);
        setClient(cRes.data);
        const all = pRes.data.data || [];
        setProjects(all.filter((p: any) => p.clientId?._id === id || p.clientId === id));
      } catch (e) { console.error(e); }
      setLoading(false);
    };
    fetchData();
  }, [id]);

  if (loading) return <PageLoader />;
  if (!client) return <div className="text-center py-20 text-muted-foreground">Client not found</div>;

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.push('/dashboard/clients')}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex items-center gap-4 flex-1">
          <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center">
            <Building2 className="w-7 h-7 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">{client.name}</h1>
            <p className="text-sm text-muted-foreground">{client.company || 'Independent Client'}</p>
          </div>
        </div>
        <Badge variant={statusColors[client.status]} className="text-sm px-3 py-1">{client.status}</Badge>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <FolderKanban className="w-6 h-6 mx-auto mb-1.5 text-blue-500" />
            <p className="text-xl font-bold">{projects.length}</p>
            <p className="text-xs text-muted-foreground">Projects</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Tag className="w-6 h-6 mx-auto mb-1.5 text-green-500" />
            <p className="text-xl font-bold">{client.industry || '—'}</p>
            <p className="text-xs text-muted-foreground">Industry</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Building2 className="w-6 h-6 mx-auto mb-1.5 text-purple-500" />
            <p className="text-xl font-bold capitalize">{client.status}</p>
            <p className="text-xs text-muted-foreground">Status</p>
          </CardContent>
        </Card>
      </div>

      {/* Contact Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><User className="w-4 h-4" /> Contact Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { icon: Mail, label: 'Email', value: client.email },
              { icon: Phone, label: 'Phone', value: client.phone },
              { icon: User, label: 'Contact Person', value: client.contactPerson },
              { icon: Globe, label: 'Website', value: client.website },
              { icon: MapPin, label: 'Address', value: client.address },
              { icon: Tag, label: 'Industry', value: client.industry },
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} className="flex items-center gap-3 p-3 rounded-lg bg-accent/30">
                <Icon className="w-4 h-4 text-muted-foreground shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <p className="text-sm font-medium">{value || 'N/A'}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Notes */}
      {client.notes && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2"><FileText className="w-4 h-4" /> Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{client.notes}</p>
          </CardContent>
        </Card>
      )}

      {/* Linked Projects */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><FolderKanban className="w-4 h-4" /> Projects ({projects.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {projects.length === 0 ? (
            <p className="text-sm text-muted-foreground">No projects linked to this client</p>
          ) : (
            <div className="space-y-3">
              {projects.map(p => (
                <div key={p._id} className="flex items-center justify-between p-3 rounded-lg bg-accent/30 cursor-pointer hover:bg-accent/50 transition-colors"
                  onClick={() => router.push(`/dashboard/projects/${p._id}`)}>
                  <div>
                    <p className="text-sm font-medium">{p.name}</p>
                    <p className="text-xs text-muted-foreground">{p.deadline ? `Deadline: ${new Date(p.deadline).toLocaleDateString()}` : 'No deadline'}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={p.status === 'completed' ? 'success' : p.status === 'in-progress' ? 'default' : 'secondary'}>
                      {p.status}
                    </Badge>
                  </div>
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
            <div><span className="text-muted-foreground">Created:</span> <span className="ml-2">{new Date(client.createdAt).toLocaleString()}</span></div>
            <div><span className="text-muted-foreground">Updated:</span> <span className="ml-2">{new Date(client.updatedAt).toLocaleString()}</span></div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
