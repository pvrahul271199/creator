"use client";

import { useTransition } from "react";
import { actionIssueInvoice, actionCancelInvoice, actionDeletePayment } from "@/app/actions";
import { RecordPaymentDialog } from "@/components/invoices/record-payment-dialog";
import type { Invoice, Currency } from "@/lib/types";
import { Printer, Send, Ban, Trash2 } from "lucide-react";

interface InvoiceViewActionsProps {
  invoice: Invoice;
  balanceDue: number;
  hasPayments: boolean;
}

export function InvoiceViewActions({
  invoice,
  balanceDue,
  hasPayments,
}: InvoiceViewActionsProps) {
  const [isPending, startTransition] = useTransition();

  const handleIssue = () => {
    if (confirm(`Issue invoice ${invoice.invoice_number}? It will be locked from further edits.`)) {
      startTransition(async () => {
        await actionIssueInvoice(invoice.id);
      });
    }
  };

  const handleCancel = () => {
    if (confirm(`Cancel invoice ${invoice.invoice_number}? This action marks the bill as cancelled.`)) {
      startTransition(async () => {
        await actionCancelInvoice(invoice.id);
      });
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const isDraft = invoice.status === "draft";
  const isIssued = invoice.status === "issued" || invoice.status === "partially_paid";
  const canCancel = (isDraft || isIssued) && !hasPayments;

  return (
    <div className="flex flex-wrap items-center gap-2 no-print">
      {/* Print / PDF button */}
      <button
        onClick={handlePrint}
        className="inline-flex items-center gap-1.5 h-8 px-3 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] text-xs font-medium hover:bg-[var(--surface-2)] shadow-xs transition"
      >
        <Printer className="w-3.5 h-3.5" />
        <span>Print / PDF</span>
      </button>

      {/* Issue button if draft */}
      {isDraft && (
        <button
          onClick={handleIssue}
          disabled={isPending}
          className="inline-flex items-center gap-1.5 h-8 px-3 rounded-[var(--radius-md)] bg-[var(--primary)] text-[var(--primary-foreground)] text-xs font-medium hover:opacity-95 shadow-xs transition disabled:opacity-50"
        >
          <Send className="w-3.5 h-3.5" />
          <span>Issue Invoice</span>
        </button>
      )}

      {/* Record payment if issued and balance remains */}
      {isIssued && balanceDue > 0 && (
        <RecordPaymentDialog
          invoiceId={invoice.id}
          invoiceNumber={invoice.invoice_number}
          currency={invoice.currency}
          balanceDue={balanceDue}
        />
      )}

      {/* Cancel button */}
      {canCancel && (
        <button
          onClick={handleCancel}
          disabled={isPending}
          className="inline-flex items-center gap-1.5 h-8 px-3 rounded-[var(--radius-md)] border border-rose-500/20 text-rose-600 hover:bg-rose-500/10 text-xs font-medium transition disabled:opacity-50"
        >
          <Ban className="w-3.5 h-3.5" />
          <span>Cancel</span>
        </button>
      )}
    </div>
  );
}

export function DeletePaymentButton({
  paymentId,
  invoiceId,
}: {
  paymentId: string;
  invoiceId: string;
}) {
  const [isPending, startTransition] = useTransition();

  const handleDelete = () => {
    if (confirm("Remove this payment entry from the ledger?")) {
      startTransition(async () => {
        await actionDeletePayment(paymentId, invoiceId);
      });
    }
  };

  return (
    <button
      onClick={handleDelete}
      disabled={isPending}
      className="text-zinc-400 hover:text-rose-500 p-1 rounded transition disabled:opacity-50"
      title="Delete payment"
    >
      <Trash2 className="w-3.5 h-3.5" />
    </button>
  );
}
