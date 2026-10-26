/**
 * Invoice arithmetic. This mirrors save_invoice() in supabase/migrations exactly, and is used
 * for the live preview and tests. The database recomputes every value on save; the browser's
 * numbers are never trusted.
 *
 * Money is handled in integer cents (minor units) so no floating-point drift can enter a total.
 * Rounding policy: round half away from zero to 2 decimals, per line, then per tax.
 */

export interface CalcItem {
  quantity: number;
  unit_price: number;
}

export interface InvoiceTotals {
  subtotal: number;
  discount_amount: number;
  tax_amount: number;
  total: number;
}

const toCents = (value: number) => Math.round((value + Number.EPSILON) * 100);
const fromCents = (cents: number) => cents / 100;

/** Round half away from zero on a value expressed in cents. */
function roundCents(value: number) {
  return value < 0 ? -Math.round(-value) : Math.round(value);
}

export function lineTotal(quantity: number, unitPrice: number) {
  const q = toCents(quantity); // hundredths of a unit
  const p = toCents(unitPrice); // cents
  // (q/100) * p cents, rounded to a whole cent
  return fromCents(roundCents((q * p) / 100));
}

export function calculateInvoice(
  items: CalcItem[],
  discountType: "percent" | "fixed",
  discountValue: number,
  taxRate: number,
): InvoiceTotals {
  const subtotalC = items.reduce((sum, i) => sum + toCents(lineTotal(i.quantity, i.unit_price)), 0);
  const dv = Math.max(0, discountValue);
  let discountC = 0;
  if (dv > 0) {
    discountC = discountType === "percent" ? roundCents((subtotalC * dv) / 100) : Math.min(toCents(dv), subtotalC);
  }
  const taxableC = subtotalC - discountC;
  const taxC = roundCents((taxableC * Math.max(0, taxRate)) / 100);
  return {
    subtotal: fromCents(subtotalC),
    discount_amount: fromCents(discountC),
    tax_amount: fromCents(taxC),
    total: fromCents(taxableC + taxC),
  };
}

export function balanceDue(total: number, paid: number) {
  return fromCents(Math.max(0, toCents(total) - toCents(paid)));
}

/** True when adding `amount` to existing payments would exceed the invoice total. */
export function wouldOverpay(total: number, paidSoFar: number, amount: number) {
  return toCents(paidSoFar) + toCents(amount) > toCents(total);
}

export type StoredStatus = "draft" | "issued" | "partially_paid" | "paid" | "cancelled";

/** Status after payments change, mirroring refresh_invoice_status(). */
export function statusAfterPayments(status: StoredStatus, total: number, paid: number): StoredStatus {
  if (status === "draft" || status === "cancelled") return status;
  if (toCents(total) > 0 && toCents(paid) >= toCents(total)) return "paid";
  if (toCents(paid) > 0) return "partially_paid";
  return "issued";
}

/** Overdue is derived, never stored: an issued invoice with a balance and a past due date. */
export function effectiveStatus(
  status: StoredStatus,
  total: number,
  paid: number,
  dueDate: string | null,
  today: string,
): StoredStatus | "overdue" {
  if ((status === "issued" || status === "partially_paid") && dueDate && dueDate < today && toCents(total) > toCents(paid)) {
    return "overdue";
  }
  return status;
}
