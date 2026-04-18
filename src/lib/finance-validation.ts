import { z } from "zod";

// ─── Constants ─────────────────────────────────────────────────────────────
export const MAX_FINANCIAL_AMOUNT = 1_000_000;
export const MAX_EXPENSE_AMOUNT   = 500_000;

// ─── Utilities ─────────────────────────────────────────────────────────────

/** Round to 2 decimal places using integer math (safe for currency) */
export function roundCents(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Returns true if `value`, when rounded to 2 decimal places, is within
 * floating-point epsilon of the original (accepts 0.30000000000000004 as valid).
 */
export function hasTwoDecimalsOrLess(value: number): boolean {
  if (!isFinite(value) || isNaN(value)) return false;
  return Math.abs(roundCents(value) - value) < 1e-9;
}

/**
 * Safely parse a string to a financial number.
 * Returns NaN on failure (never throws).
 */
export function parseFinancialInput(raw: string): number {
  const trimmed = raw.trim();
  if (!trimmed) return NaN;
  const n = parseFloat(trimmed);
  // Reject if string has trailing non-numeric chars ("100abc")
  if (isNaN(n) || !/^-?\d+(\.\d+)?$/.test(trimmed)) return NaN;
  return n;
}

// ─── Shared Zod schema builder ─────────────────────────────────────────────

interface FinancialAmountOptions {
  label?: string;
  max?: number;
  /** If true, the field can be absent/undefined */
  optional?: boolean;
}

/**
 * Creates a strict Zod schema for a financial amount field.
 * Accepts a pre-parsed number (form state is strings, callers parse before passing).
 *
 * Validates:
 *  - Must be a number (not NaN, not Infinity)
 *  - Must be > 0
 *  - Must be ≤ max (default 1,000,000)
 *  - Must have at most 2 decimal places
 */
export function financialAmountSchema(options?: FinancialAmountOptions) {
  const label = options?.label ?? "Amount";
  const max   = options?.max ?? MAX_FINANCIAL_AMOUNT;

  const base = z
    .number({
      required_error: `${label} is required`,
      invalid_type_error: `${label} must be a valid number`,
    })
    .refine((v) => isFinite(v), {
      message: `${label} must be a finite number`,
    })
    .refine((v) => v > 0, {
      message: `${label} must be greater than 0`,
    })
    .refine((v) => v <= max, {
      message: `${label} cannot exceed ${max.toLocaleString()}`,
    })
    .refine(hasTwoDecimalsOrLess, {
      message: `${label} must have at most 2 decimal places`,
    });

  return options?.optional ? base.optional() : base;
}

// ─── Pre-built schemas for each entity ─────────────────────────────────────

export const subscriptionAmountSchema = financialAmountSchema({
  label: "Total price",
  max: MAX_FINANCIAL_AMOUNT,
});

export const installmentRowAmountSchema = financialAmountSchema({
  label: "Installment amount",
  max: MAX_FINANCIAL_AMOUNT,
});

export const paymentAmountSchema = financialAmountSchema({
  label: "Payment amount",
  max: MAX_FINANCIAL_AMOUNT,
});

export const expenseAmountSchema = financialAmountSchema({
  label: "Expense amount",
  max: MAX_EXPENSE_AMOUNT,
});

// ─── Installment row validator ─────────────────────────────────────────────

export interface InstallmentRow {
  amount: string;
  dueDate: string;
}

export interface InstallmentRowError {
  amount?: string;
  dueDate?: string;
}

/**
 * Validate all installment rows.
 * Returns a map of row index → { amount?, dueDate? } errors.
 * Also returns totalAmountError if total > 1,000,000.
 */
export function validateInstallmentRows(rows: InstallmentRow[]): {
  rowErrors: Record<number, InstallmentRowError>;
  totalAmountError: string | null;
} {
  const rowErrors: Record<number, InstallmentRowError> = {};

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const errs: InstallmentRowError = {};

    if (!row.amount.trim()) {
      errs.amount = "Amount is required";
    } else {
      const n = parseFinancialInput(row.amount);
      if (isNaN(n))                         errs.amount = "Must be a valid number";
      else if (!isFinite(n))                errs.amount = "Must be a finite number";
      else if (n <= 0)                      errs.amount = "Must be greater than 0";
      else if (n > MAX_FINANCIAL_AMOUNT)    errs.amount = `Cannot exceed ${MAX_FINANCIAL_AMOUNT.toLocaleString()}`;
      else if (!hasTwoDecimalsOrLess(n))    errs.amount = "Max 2 decimal places allowed";
    }

    if (!row.dueDate) {
      errs.dueDate = "Due date is required";
    }

    if (Object.keys(errs).length > 0) rowErrors[i] = errs;
  }

  // Validate total
  const validRows = rows.filter((_, i) => !rowErrors[i]?.amount);
  const total = roundCents(validRows.reduce((s, r) => s + parseFinancialInput(r.amount), 0));
  const totalAmountError =
    total > MAX_FINANCIAL_AMOUNT
      ? `Total of all installments cannot exceed ${MAX_FINANCIAL_AMOUNT.toLocaleString()}`
      : null;

  return { rowErrors, totalAmountError };
}
