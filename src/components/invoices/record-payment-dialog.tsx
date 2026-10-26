"use client";

import { useState } from "react";
import { actionRecordPayment } from "@/app/actions";
import { formatMoney, todayISO } from "@/lib/format";
import type { Currency, PaymentMethod } from "@/lib/types";
import { CreditCard, Check, X } from "lucide-react";

interface RecordPaymentDialogProps {
  invoiceId: string;
  invoiceNumber: string;
  currency: Currency;
  balanceDue: number;
}

export function RecordPaymentDialog({
  invoiceId,
  invoiceNumber,
  currency,
  balanceDue,
}: RecordPaymentDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [amount, setAmount] = useState<number>(balanceDue);
  const [paymentDate, setPaymentDate] = useState<string>(todayISO());
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("bank_transfer");
  const [referenceNumber, setReferenceNumber] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (amount <= 0) {
      setError("Payment amount must be greater than zero");
      return;
    }
    if (amount > balanceDue) {
      setError(`Amount cannot exceed the balance due of ${formatMoney(balanceDue, currency)}`);
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const formData = new FormData();
    formData.append("invoice_id", invoiceId);
    formData.append("amount", amount.toString());
    formData.append("payment_date", paymentDate);
    formData.append("payment_method", paymentMethod);
    formData.append("reference_number", referenceNumber);
    formData.append("notes", notes);

    try {
      await actionRecordPayment(formData);
      setIsOpen(false);
    } catch (err: any) {
      setError(err.message || "Failed to record payment");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <button
        onClick={() => {
          setAmount(balanceDue);
          setIsOpen(true);
        }}
        className="inline-flex items-center gap-1.5 h-8 px-3 rounded-[var(--radius-md)] bg-[var(--cash)] text-white text-xs font-medium hover:opacity-95 shadow-sm transition"
      >
        <CreditCard className="w-3.5 h-3.5" />
        <span>Record Payment</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-lg)] p-6 max-w-md w-full shadow-xl animate-in fade-in zoom-in-95 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--border)]">
              <div>
                <h3 className="font-semibold text-sm text-[var(--foreground)]">Record Payment</h3>
                <p className="text-xs text-[var(--muted)]">Invoice {invoiceNumber}</p>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="text-[var(--muted)] hover:text-[var(--foreground)] p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {error && (
              <div className="mt-3 p-2.5 rounded-[var(--radius-md)] bg-rose-500/10 border border-rose-500/20 text-rose-600 text-xs">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4 mt-4">
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="font-medium text-[var(--foreground)]">Payment Amount *</label>
                  <span className="text-xs text-[var(--muted)]">
                    Balance: {formatMoney(balanceDue, currency)}
                  </span>
                </div>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    max={balanceDue}
                    required
                    value={amount}
                    onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                    className="w-full h-9 px-3 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] font-mono text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setAmount(balanceDue)}
                    className="absolute right-2 top-2 text-xs text-[var(--primary)] hover:underline font-medium"
                  >
                    Pay Full
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-[var(--foreground)] mb-1">
                    Payment Date
                  </label>
                  <input
                    type="date"
                    required
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                    className="w-full h-8 px-2 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] font-mono text-xs"
                  />
                </div>
                <div>
                  <label className="block font-medium text-[var(--foreground)] mb-1">
                    Method
                  </label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                    className="w-full h-8 px-2 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)]"
                  >
                    <option value="bank_transfer">Bank Transfer (NEFT/IMPS)</option>
                    <option value="upi">UPI</option>
                    <option value="cash">Cash</option>
                    <option value="other">Other / Cheque</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-medium text-[var(--foreground)] mb-1">
                  Reference / Transaction ID
                </label>
                <input
                  value={referenceNumber}
                  onChange={(e) => setReferenceNumber(e.target.value)}
                  placeholder="e.g. UTR / UPI Ref / Transaction #"
                  className="w-full h-8 px-2.5 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] font-mono text-xs"
                />
              </div>

              <div>
                <label className="block font-medium text-[var(--foreground)] mb-1">Notes</label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Payment receipt note"
                  className="w-full p-2 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[var(--border)]">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="px-3.5 py-1.5 rounded-[var(--radius-md)] border border-[var(--border)] text-[var(--muted)] hover:bg-[var(--surface-2)]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-1.5 rounded-[var(--radius-md)] bg-[var(--cash)] text-white font-medium hover:opacity-95 disabled:opacity-50"
                >
                  {isSubmitting ? "Saving..." : "Record Payment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
