"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageLoader } from "@/components/ui/loading";
import api from "@/lib/api";
import { ArrowLeft, FolderKanban, Calendar, DollarSign, Users, CheckSquare, Flag, Building2, FileText, Clock } from "lucide-react";

const statusColors: Record<string, any> = {
  planning: 'secondary', 'in-progress': 'default', 'on-hold': 'warning', completed: 'success', cancelled: 'destructive'
};
const priorityColors: Record<string, any> = { low: 'secondary', medium: 'default', high: 'warning', critical: 'destructive' };

export default function ProjectDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [project, setProject] = useState<any>(null);
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [pRes, tRes] = await Promise.all([
          api.get(`/projects/${id}`),
          api.get('/tasks', { params: { limit: 200 } }),
        ]);
        setProject(pRes.data);
        const allTasks = tRes.data.data || [];
        setTasks(allTasks.filter((t: any) => t.projectId?._id === id || t.projectId === id));
      } catch (e) { console.error(e); }
      setLoading(false);
    };
    fetchData();
  }, [id]);

  if (loading) return <PageLoader />;
  if (!project) return <div className="text-center py-20 text-muted-foreground">Project not found</div>;

  const completedTasks = tasks.filter(t => t.status === 'completed').length;
  const progress = tasks.length > 0 ? Math.round((completedTasks / tasks.length) * 100) : 0;
  const daysLeft = project.deadline ? Math.ceil((new Date(project.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : null;

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.push('/dashboard/projects')}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <FolderKanban className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">{project.name}</h1>
              <p className="text-sm text-muted-foreground">{project.clientId?.name || 'No client'}</p>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Badge variant={statusColors[project.status]} className="text-sm px-3 py-1">{project.status}</Badge>
          <Badge variant={priorityColors[project.priority]} className="text-sm px-3 py-1">{project.priority}</Badge>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <CheckSquare className="w-6 h-6 mx-auto mb-1.5 text-green-500" />
            <p className="text-xl font-bold">{completedTasks}/{tasks.length}</p>
            <p className="text-xs text-muted-foreground">Tasks Done</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <DollarSign className="w-6 h-6 mx-auto mb-1.5 text-blue-500" />
            <p className="text-xl font-bold">${(project.budget || 0).toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">Budget</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Clock className="w-6 h-6 mx-auto mb-1.5 text-orange-500" />
            <p className="text-xl font-bold">{daysLeft !== null ? (daysLeft > 0 ? `${daysLeft}d` : 'Overdue') : '—'}</p>
            <p className="text-xs text-muted-foreground">Days Left</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Flag className="w-6 h-6 mx-auto mb-1.5 text-purple-500" />
            <p className="text-xl font-bold">{progress}%</p>
            <p className="text-xs text-muted-foreground">Progress</p>
          </CardContent>
        </Card>
      </div>

      {/* Progress Bar */}
      <Card>
        <CardContent className="p-5">
          <div className="flex justify-between mb-2">
            <span className="text-sm font-medium">Overall Progress</span>
            <span className="text-sm text-muted-foreground">{progress}%</span>
          </div>
          <div className="w-full h-3 rounded-full bg-accent/50 overflow-hidden">
            <div className="h-full rounded-full bg-gradient-to-r from-primary to-orange-500 transition-all duration-500" style={{ width: `${progress}%` }} />
          </div>
        </CardContent>
      </Card>

      {/* Project Details */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><FileText className="w-4 h-4" /> Project Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-accent/30">
              <Building2 className="w-4 h-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Client</p>
                <p className="text-sm font-medium cursor-pointer text-primary hover:underline"
                  onClick={() => project.clientId?._id && router.push(`/dashboard/clients/${project.clientId._id}`)}>
                  {project.clientId?.name || 'N/A'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg bg-accent/30">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Start Date</p>
                <p className="text-sm font-medium">{project.startDate ? new Date(project.startDate).toLocaleDateString() : 'N/A'}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg bg-accent/30">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Deadline</p>
                <p className="text-sm font-medium">{project.deadline ? new Date(project.deadline).toLocaleDateString() : 'N/A'}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg bg-accent/30">
              <DollarSign className="w-4 h-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Budget</p>
                <p className="text-sm font-medium">${(project.budget || 0).toLocaleString()}</p>
              </div>
            </div>
          </div>
          {project.description && (
            <div className="mt-4 p-3 rounded-lg bg-accent/30">
              <p className="text-xs text-muted-foreground mb-1">Description</p>
              <p className="text-sm">{project.description}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Team Members */}
      {project.teamMembers?.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2"><Users className="w-4 h-4" /> Team ({project.teamMembers.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              {project.teamMembers.map((m: any) => (
                <div key={m._id || m} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-accent/30">
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary to-orange-600 flex items-center justify-center text-white text-xs font-bold">
                    {(m.userId?.name || m.name || '?')[0]?.toUpperCase()}
                  </div>
                  <span className="text-sm">{m.userId?.name || m.name || m.employeeId || 'Team Member'}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tasks */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><CheckSquare className="w-4 h-4" /> Tasks ({tasks.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {tasks.length === 0 ? (
            <p className="text-sm text-muted-foreground">No tasks for this project</p>
          ) : (
            <div className="space-y-2">
              {tasks.map(t => (
                <div key={t._id} className="flex items-center justify-between p-3 rounded-lg bg-accent/30">
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${t.status === 'completed' ? 'bg-green-500' : t.status === 'in-progress' ? 'bg-blue-500' : 'bg-gray-400'}`} />
                    <p className="text-sm font-medium">{t.title}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={priorityColors[t.priority]}>{t.priority}</Badge>
                    <Badge variant={t.status === 'completed' ? 'success' : t.status === 'in-progress' ? 'default' : 'secondary'}>{t.status}</Badge>
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
            <div><span className="text-muted-foreground">Created:</span> <span className="ml-2">{new Date(project.createdAt).toLocaleString()}</span></div>
            <div><span className="text-muted-foreground">Updated:</span> <span className="ml-2">{new Date(project.updatedAt).toLocaleString()}</span></div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
