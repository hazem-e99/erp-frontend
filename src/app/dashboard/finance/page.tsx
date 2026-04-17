"use client";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { PageLoader, EmptyState } from "@/components/ui/loading";
import api from "@/lib/api";
import { PieChart, Plus, X, Loader2, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight } from "lucide-react";

export default function FinancePage() {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [summary, setSummary]           = useState<any>(null);
  const [loading, setLoading]           = useState(true);
  const [showForm, setShowForm]         = useState(false);
  const [saving, setSaving]             = useState(false);
  const [form, setForm] = useState({
    type: 'income', amount: 0, category: '', description: '',
    date: new Date().toISOString().split('T')[0], reference: '',
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [tRes, sRes] = await Promise.all([api.get('/finance'), api.get('/finance/summary')]);
      setTransactions(tRes.data.data || []);
      setSummary(sRes.data);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    try {
      await api.post('/finance', form);
      setShowForm(false);
      fetchData();
      setForm({ type: 'income', amount: 0, category: '', description: '', date: new Date().toISOString().split('T')[0], reference: '' });
    } catch (e) { console.error(e); }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this transaction?')) return;
    await api.delete(`/finance/${id}`); fetchData();
  };

  if (loading) return <PageLoader />;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Finance</h1>
          <p className="text-sm text-muted-foreground mt-1">Income, expenses & profit tracking</p>
        </div>
        <Button onClick={() => setShowForm(true)}><Plus className="w-4 h-4" /> New Transaction</Button>
      </div>

      {/* ── Summary Cards ────────────────────────────────────────────────────── */}
      {summary && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="border-success/20">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Income</p>
                  <p className="text-2xl font-bold text-success">${summary.totalIncome?.toLocaleString()}</p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-success/10 flex items-center justify-center">
                  <ArrowUpRight className="w-5 h-5 text-success" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-destructive/20">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Expenses</p>
                  <p className="text-2xl font-bold text-destructive">${summary.totalExpenses?.toLocaleString()}</p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-destructive/10 flex items-center justify-center">
                  <ArrowDownRight className="w-5 h-5 text-destructive" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* ✅ removed to-orange-600/5 → primary-active CSS var */}
          <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-[var(--primary-active)]/5">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Net Profit</p>
                  <p className="text-2xl font-bold text-primary">${summary.profit?.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">Margin: {summary.profitMargin}%</p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── New Transaction Form ─────────────────────────────────────────────── */}
      {showForm && (
        <Card className="border-primary/20">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">New Transaction</CardTitle>
            <Button variant="ghost" size="icon" onClick={() => setShowForm(false)}><X className="w-4 h-4" /></Button>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <select className="h-10 rounded-lg border border-input bg-card px-3 text-sm" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                <option value="income">Income</option>
                <option value="expense">Expense</option>
              </select>
              <Input type="number" placeholder="Amount *" value={form.amount || ''} onChange={(e) => setForm({ ...form, amount: +e.target.value })} required />
              <Input placeholder="Category *" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} required />
              <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} required />
              <Input placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              <Input placeholder="Reference" value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })} />
              <div className="md:col-span-2 flex gap-2">
                <Button type="submit" disabled={saving}>
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create'}
                </Button>
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* ── Transactions List ────────────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <PieChart className="w-4 h-4 text-primary" /> Transactions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {transactions.length ? transactions.map(t => (
              <div key={t._id} className="flex items-center justify-between p-3 rounded-lg bg-accent/50 group">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${t.type === 'income' ? 'bg-success/10' : 'bg-destructive/10'}`}>
                    {t.type === 'income'
                      ? <TrendingUp  className="w-4 h-4 text-success" />
                      : <TrendingDown className="w-4 h-4 text-destructive" />
                    }
                  </div>
                  <div>
                    <p className="text-sm font-medium">{t.category}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(t.date).toLocaleDateString()}
                      {t.description && ` • ${t.description}`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <p className={`font-bold ${t.type === 'income' ? 'text-success' : 'text-destructive'}`}>
                    {t.type === 'income' ? '+' : '-'}${t.amount?.toLocaleString()}
                  </p>
                  <Button
                    size="sm" variant="ghost"
                    className="opacity-0 group-hover:opacity-100 text-destructive"
                    onClick={() => handleDelete(t._id)}
                  >×</Button>
                </div>
              </div>
            )) : (
              <p className="text-sm text-muted-foreground text-center py-4">No transactions yet</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
