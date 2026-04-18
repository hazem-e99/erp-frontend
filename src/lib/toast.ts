import { toast } from "sonner";

// ─── Finance-specific human-friendly error messages ────────────────────────
const ERROR_CODE_MESSAGES: Record<string, string> = {
  // Subscriptions
  SUBSCRIPTION_NOT_FOUND: "Subscription not found.",
  SUBSCRIPTION_ALREADY_CANCELLED: "This subscription is already cancelled.",
  SUBSCRIPTION_COMPLETED_CANCEL: "A completed subscription cannot be cancelled.",
  MISSING_INSTALLMENT_ITEMS: "Please add installment details before submitting.",
  SPLIT2_REQUIRES_2_ITEMS: "Split payment requires exactly 2 installments.",
  INVALID_TOTAL_PRICE: "Total price must be greater than zero.",

  // Installments
  INSTALLMENT_NOT_FOUND: "Installment not found.",
  INSTALLMENT_ALREADY_PAID: "This installment has already been fully paid.",
  INSTALLMENT_CANCELLED_SUBSCRIPTION: "Cannot record a payment for a cancelled subscription.",

  // Payments
  PAYMENT_AMOUNT_ZERO: "Payment amount must be greater than zero.",
  PAYMENT_CONCURRENT_CONFLICT: "A conflict occurred. Please refresh and try again.",

  // Expenses
  EXPENSE_INVALID_AMOUNT: "Expense amount must be greater than zero.",
  EXPENSE_INVALID_FILE: "Only JPEG, PNG, WebP and PDF files up to 5 MB are allowed.",

  // Auth
  UNAUTHORIZED: "Your session has expired. Please log in again.",
};

// ─── Parse API error into a human-friendly string ──────────────────────────
export function parseApiError(error: unknown): { message: string; field?: string; code?: string } {
  if (!error || typeof error !== "object") {
    return { message: "Something went wrong. Please try again." };
  }

  const err = error as any;
  const data = err?.response?.data;

  if (!data) {
    // Network error
    if (err?.code === "ERR_NETWORK") {
      return { message: "Cannot connect to the server. Please check your connection." };
    }
    return { message: "Something went wrong. Please try again." };
  }

  const code: string | undefined = data.code;
  const field: string | undefined = data.field;

  // Use friendly message from code map
  if (code && ERROR_CODE_MESSAGES[code]) {
    return { message: ERROR_CODE_MESSAGES[code], field, code };
  }

  // Fallback to backend message
  const message =
    (Array.isArray(data.errors) ? data.errors[0] : null) ??
    data.message ??
    "Something went wrong. Please try again.";

  return { message: cleanMessage(message), field, code };
}

function cleanMessage(msg: string): string {
  if (!msg) return "Something went wrong.";
  // Capitalize and ensure period at end
  const clean = msg.charAt(0).toUpperCase() + msg.slice(1);
  return clean.endsWith(".") ? clean : clean + ".";
}

// ─── Toast helpers ──────────────────────────────────────────────────────────
export const toast$ = {
  success: (message: string, description?: string) =>
    toast.success(message, { description }),

  error: (message: string, description?: string) =>
    toast.error(message, { description, duration: 6000 }),

  warning: (message: string, description?: string) =>
    toast.warning(message, { description, duration: 5000 }),

  info: (message: string, description?: string) =>
    toast.info(message, { description }),

  /** Parse an axios error and show an error toast automatically */
  apiError: (error: unknown, fallback = "Something went wrong. Please try again.") => {
    const { message } = parseApiError(error);
    toast.error(message || fallback, { duration: 6000 });
  },
};

// ─── Finance-specific success toasts ────────────────────────────────────────
export const financeToast = {
  subscriptionCreated: () =>
    toast$.success("Subscription created", "Payment schedule and revenue entries have been generated."),

  subscriptionCancelled: () =>
    toast$.success("Subscription cancelled", "Pending revenue entries have been cleared."),

  paymentRecorded: (amount: number, overflow: number) => {
    if (overflow > 0) {
      toast$.warning(
        "Payment recorded with overflow",
        `$${amount.toFixed(2)} recorded. $${overflow.toFixed(2)} will be applied to the next installment.`,
      );
    } else {
      toast$.success("Payment recorded successfully", `$${amount.toFixed(2)} has been applied to the installment.`);
    }
  },

  expenseAdded: () =>
    toast$.success("Expense added", "The expense has been recorded successfully."),

  expenseDeleted: () =>
    toast$.success("Expense deleted"),
};
