// Shared types for Finance module

export type SupportedCurrency = 'EGP' | 'USD' | 'SAR' | 'EUR' | 'GBP' | 'AED';

export const CURRENCY_SYMBOLS: Record<SupportedCurrency, string> = {
  EGP: 'E£',
  USD: '$',
  SAR: 'SR',
  EUR: '€',
  GBP: '£',
  AED: 'AED',
};

export const CURRENCY_NAMES: Record<SupportedCurrency, string> = {
  EGP: 'Egyptian Pound',
  USD: 'US Dollar',
  SAR: 'Saudi Riyal',
  EUR: 'Euro',
  GBP: 'British Pound',
  AED: 'UAE Dirham',
};

export const BASE_CURRENCY: SupportedCurrency = 'EGP';

export interface Subscription {
  _id: string;
  clientId: string;
  clientName: string;
  planType: "monthly" | "quarterly" | "semi_annual";
  totalPrice: number;
  currency: SupportedCurrency;
  exchangeRate: number;
  baseTotalPrice: number;
  startDate: string;
  endDate: string;
  status: "pending" | "active" | "completed" | "cancelled";
  installmentPlan: "full" | "split_2" | "custom";
  customInstallments?: number;
  paidAmount: number;
  paidInstallmentsCount?: number;
  totalInstallmentsCount?: number;
  description: string;
  createdAt: string;
}

export interface Installment {
  _id: string;
  subscriptionId: string;
  clientId: string;
  clientName: string;
  amount: number;
  currency: SupportedCurrency;
  exchangeRate: number;
  baseAmount: number;
  paidAmount: number; // Always in base currency
  dueDate: string;
  status: "pending" | "paid" | "overdue" | "partially_paid";
  installmentNumber: number;
  totalInstallments: number;
  paidAt?: string;
  createdAt: string;
}

export interface Payment {
  _id: string;
  subscriptionId: string;
  installmentId: string;
  clientId: string;
  clientName: string;
  amount: number;
  currency: SupportedCurrency;
  exchangeRate: number;
  baseAmount: number;
  paymentDate: string;
  method: "cash" | "bank_transfer" | "credit_card" | "cheque" | "online";
  reference?: string;
  notes?: string;
  overpaymentAmount: number;
  createdAt: string;
}

export interface Revenue {
  _id: string;
  subscriptionId: string;
  clientId: string;
  clientName: string;
  amount: number;
  currency: SupportedCurrency;
  exchangeRate: number;
  baseAmount: number;
  recognitionDate: string;
  status: "pending" | "recognized" | "cancelled";
  periodMonth: number;
  description: string;
  createdAt: string;
}

export interface Expense {
  _id: string;
  amount: number;
  currency: SupportedCurrency;
  exchangeRate: number;
  baseAmount: number;
  category: string;
  date: string;
  description: string;
  attachmentUrl?: string;
  createdAt: string;
}

export interface DashboardSummary {
  totalCashIn: number;
  totalCashOut: number;
  netProfit: number;
  recognizedRevenueThisMonth: number;
  outstandingPayments: number;
  activeSubscriptions: number;
  overdueCount: number;
  cashFlowChart: Array<{
    period: string;
    cashIn: number;
    cashOut: number;
    net: number;
  }>;
}

export const PLAN_LABELS: Record<string, string> = {
  monthly: "Monthly",
  quarterly: "Quarterly",
  semi_annual: "Semi-Annual",
};

export const STATUS_VARIANT: Record<string, "default" | "success" | "warning" | "destructive" | "secondary" | "outline"> = {
  pending: "warning",
  active: "success",
  completed: "secondary",
  cancelled: "destructive",
  paid: "success",
  overdue: "destructive",
  partially_paid: "warning",
  recognized: "success",
};

export const METHOD_LABELS: Record<string, string> = {
  cash: "Cash",
  bank_transfer: "Bank Transfer",
  credit_card: "Credit Card",
  cheque: "Cheque",
  online: "Online",
};

export const CATEGORY_LABELS: Record<string, string> = {
  salaries: "Salaries",
  ads: "Ads",
  bank_fees: "Bank Fees",
  tools: "Tools",
  freelancers: "Freelancers",
  other: "Other",
};

export function fmtCurrency(n: number, currency: SupportedCurrency = BASE_CURRENCY): string {
  return new Intl.NumberFormat("en-US", { 
    style: "currency", 
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0 
  }).format(n);
}

export function fmtBaseCurrency(n: number): string {
  return fmtCurrency(n, BASE_CURRENCY);
}

export function fmtDate(d: string | Date): string {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(new Date(d));
}

/**
 * Calculate base currency amount from original amount and exchange rate.
 * Same logic as backend: amount * exchangeRate, rounded to 2 decimal places.
 */
export function calculateBaseAmount(amount: number, exchangeRate: number): number {
  return Math.round(amount * exchangeRate * 100) / 100;
}
