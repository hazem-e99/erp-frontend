"use client";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calculator } from "lucide-react";

export default function CommissionCalculatorPage() {
  const [amount, setAmount] = useState<string>("");
  const [percentage, setPercentage] = useState<string>("");
  const [result, setResult] = useState<{ commission: number; total: number } | null>(null);

  const handleCalculate = (e: React.FormEvent) => {
    e.preventDefault();
    const a = parseFloat(amount);
    const p = parseFloat(percentage);
    if (!Number.isFinite(a) || !Number.isFinite(p)) {
      setResult(null);
      return;
    }
    const commission = (a * p) / 100;
    setResult({ commission, total: a + commission });
  };

  const handleReset = () => {
    setAmount("");
    setPercentage("");
    setResult(null);
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Calculator className="w-6 h-6" />
          Commission Calculator
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Quick utility to calculate a commission from an amount and a percentage.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Calculate</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCalculate} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Amount</label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="e.g. 5000"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Percentage (%)</label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="e.g. 10"
                  value={percentage}
                  onChange={(e) => setPercentage(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="flex gap-2">
              <Button type="submit">Calculate</Button>
              <Button type="button" variant="outline" onClick={handleReset}>
                Reset
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {result && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Result</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-lg bg-accent/30">
                <p className="text-xs text-muted-foreground">Amount</p>
                <p className="text-lg font-semibold">{parseFloat(amount).toLocaleString()}</p>
              </div>
              <div className="p-4 rounded-lg bg-accent/30">
                <p className="text-xs text-muted-foreground">Commission ({percentage}%)</p>
                <p className="text-lg font-semibold text-primary">
                  {result.commission.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                </p>
              </div>
              <div className="p-4 rounded-lg bg-accent/30">
                <p className="text-xs text-muted-foreground">Amount + Commission</p>
                <p className="text-lg font-semibold">
                  {result.total.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
