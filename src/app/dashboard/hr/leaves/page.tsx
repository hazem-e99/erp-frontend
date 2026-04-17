"use client";
import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageLoader, EmptyState } from "@/components/ui/loading";
import api from "@/lib/api";
import { CalendarOff, Check, X, Clock, Download, MessageCircle, Loader2 } from "lucide-react";

const statusColors: Record<string, string> = {
  pending: "bg-amber-500/10 text-amber-500",
  approved: "bg-emerald-500/10 text-emerald-500",
  rejected: "bg-red-500/10 text-red-500",
};

export default function HrLeavesPage() {
  const [leaves, setLeaves] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const [processing, setProcessing] = useState<string | null>(null);
  const [comment, setComment] = useState<{ id: string; text: string } | null>(null);

  const fetchLeaves = async () => {
    setLoading(true);
    try {
      const params: any = { limit: 50 };
      if (filter) params.status = filter;
      const { data } = await api.get("/leaves", { params });
      setLeaves(data.data || []);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { fetchLeaves(); }, [filter]);

  const handleApprove = async (id: string) => {
    setProcessing(id);
    try {
      await api.put(`/leaves/${id}/approve`, { status: "approved" });
      fetchLeaves();
    } catch (e: any) { alert(e.response?.data?.message || "Failed"); }
    setProcessing(null);
  };

  const handleReject = async (id: string) => {
    const reason = comment?.id === id ? comment.text : "";
    setProcessing(id);
    try {
      await api.put(`/leaves/${id}/approve`, { status: "rejected", rejectionReason: reason });
      fetchLeaves();
      setComment(null);
    } catch (e: any) { alert(e.response?.data?.message || "Failed"); }
    setProcessing(null);
  };

  const exportToExcel = async () => {
    try {
      const params: any = {};
      if (filter) params.status = filter;
      const { data } = await api.get("/hr/export/leaves", { params, responseType: "blob" });
      const url = URL.createObjectURL(new Blob([data]));
      const a = document.createElement("a"); a.href = url; a.download = `leaves_${Date.now()}.xlsx`; a.click();
    } catch { alert("Export failed"); }
  };

  const counts = {
    pending: leaves.filter(l => filter === "" || l.status === "pending").length,
    all: leaves.length,
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><CalendarOff className="w-6 h-6 text-purple-500" /> Leave Management</h1>
          <p className="text-sm text-muted-foreground mt-1">Review and manage leave requests</p>
        </div>
        <Button variant="outline" size="sm" className="gap-1" onClick={exportToExcel}>
          <Download className="w-3.5 h-3.5" /> Export Excel
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        {[
          { label: "All", value: "" },
          { label: "Pending", value: "pending" },
          { label: "Approved", value: "approved" },
          { label: "Rejected", value: "rejected" },
        ].map(f => (
          <Button key={f.value} size="sm" variant={filter === f.value ? "default" : "outline"} onClick={() => setFilter(f.value)}>
            {f.label}
          </Button>
        ))}
      </div>

      {/* Leave List */}
      {loading ? <PageLoader /> : leaves.length === 0 ? (
        <EmptyState icon={<CalendarOff className="w-12 h-12" />} title={filter ? `No ${filter} leave requests` : "No leave requests"} />
      ) : (
        <div className="space-y-3">
          {leaves.map(l => {
            const emp = l.employeeId as any;
            const isPending = l.status === "pending";
            return (
              <Card key={l._id} className={`transition-all ${isPending ? "border-amber-500/20" : ""}`}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-xl bg-accent flex items-center justify-center shrink-0 text-lg">
                      {l.type === "sick" ? "🤒" : l.type === "annual" ? "🏖️" : l.type === "emergency" ? "🚨" : "📋"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-sm font-semibold">{emp?.name || "Unknown"}</p>
                        <Badge variant="secondary" className="text-[10px] capitalize">{l.type}</Badge>
                        <Badge className={`${statusColors[l.status]} text-[10px] capitalize`}>{l.status}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">{l.reason || "No reason provided"}</p>
                      <div className="flex items-center gap-4 mt-2 text-[11px] text-muted-foreground">
                        <span>📅 {new Date(l.startDate).toLocaleDateString()} → {new Date(l.endDate).toLocaleDateString()}</span>
                        <span>📊 {l.days} day{l.days > 1 ? "s" : ""}</span>
                        {l.approvedBy && <span>✅ by {(l.approvedBy as any)?.name}</span>}
                        {l.rejectionReason && <span className="text-red-400">❌ {l.rejectionReason}</span>}
                      </div>

                      {/* Comment input for pending */}
                      {isPending && comment?.id === l._id && (
                        <div className="mt-2">
                          <input
                            className="w-full text-xs bg-accent rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/20"
                            placeholder="Rejection reason (optional)..."
                            value={comment?.text || ""}
                            onChange={e => setComment({ id: l._id, text: e.target.value })}
                          />
                        </div>
                      )}
                    </div>

                    {/* Action buttons for pending */}
                    {isPending && (
                      <div className="flex gap-1.5 shrink-0">
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1 text-amber-500 border-amber-500/30 hover:bg-amber-500/10"
                          onClick={() => setComment(comment?.id === l._id ? null : { id: l._id, text: "" })}
                        >
                          <MessageCircle className="w-3 h-3" />
                        </Button>
                        <Button
                          size="sm"
                          className="gap-1 bg-emerald-600 hover:bg-emerald-700"
                          disabled={processing === l._id}
                          onClick={() => handleApprove(l._id)}
                        >
                          {processing === l._id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          className="gap-1"
                          disabled={processing === l._id}
                          onClick={() => handleReject(l._id)}
                        >
                          <X className="w-3 h-3" /> Reject
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
