import { notFound } from "next/navigation";
import Link from "next/link";
import { getInvoiceById } from "@/lib/data/api";
import { formatMoney, formatDate } from "@/lib/format";
import { InvoiceViewActions, DeletePaymentButton } from "@/components/invoices/invoice-view-actions";
import { InvoiceDocument } from "@/components/invoices/invoice-document";
import { ArrowLeft, CheckCircle2, AlertCircle, Clock, ShieldCheck, CreditCard } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function InvoiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const data = await getInvoiceById(id);

  if (!data) notFound();

  const { invoice, brand, collab, items, payments, paid_amount, balance_due, effective_status } = data;

  let badgeClass = "bg-zinc-500/10 text-zinc-600 border-zinc-500/20";
  if (effective_status === "paid") {
    badgeClass = "bg-emerald-500/10 text-emerald-600 border-emerald-500/20";
  } else if (effective_status === "partially_paid") {
    badgeClass = "bg-amber-500/10 text-amber-600 border-amber-500/20";
  } else if (effective_status === "overdue") {
    badgeClass = "bg-rose-500/10 text-rose-600 border-rose-500/20 font-semibold";
  } else if (effective_status === "issued") {
    badgeClass = "bg-blue-500/10 text-blue-600 border-blue-500/20";
  } else if (effective_status === "cancelled") {
    badgeClass = "bg-zinc-500/10 text-zinc-500 border-zinc-500/20 line-through";
  }

  return (
    <div className="flex-1 flex flex-col min-h-screen">
      {/* Top action bar - hidden on print */}
      <div className="h-16 px-8 flex items-center justify-between border-b border-[var(--border)] bg-[var(--surface)] sticky top-0 z-10 no-print">
        <div className="flex items-center gap-3">
          <Link
            href="/invoices"
            className="text-[var(--muted)] hover:text-[var(--foreground)] transition p-1 rounded"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-semibold tracking-tight text-[var(--foreground)] font-mono">
                {invoice.invoice_number}
              </h1>
              <span
                className={`px-2 py-0.5 rounded-[var(--radius-sm)] border text-xs uppercase font-mono tracking-wider ${badgeClass}`}
              >
                {effective_status.replace("_", " ")}
              </span>
            </div>
            {brand && <p className="text-xs text-[var(--muted)]">{brand.name}</p>}
          </div>
        </div>

        <InvoiceViewActions
          invoice={invoice}
          balanceDue={balance_due}
          hasPayments={payments.length > 0}
        />
      </div>

      <div className="p-4 sm:p-6 lg:p-8 max-w-5xl w-full mx-auto space-y-8">
        {/* Rendered Indian Creator Tax Invoice Document */}
        <InvoiceDocument
          invoiceNumber={invoice.invoice_number}
          issueDate={invoice.issue_date}
          dueDate={invoice.due_date}
          paymentTerms={invoice.payment_terms}
          currency={invoice.currency}
          status={effective_status}
          deliveredOn={invoice.sender_snapshot?.delivered_on || collab?.end_date}
          sender={invoice.sender_snapshot}
          recipient={invoice.recipient_snapshot}
          items={items}
          subtotal={invoice.subtotal}
          discountType={invoice.discount_type}
          discountValue={invoice.discount_value}
          discountAmount={invoice.discount_amount}
          taxRate={invoice.tax_rate}
          taxAmount={invoice.tax_amount}
          totalAmount={invoice.total_amount}
          paidAmount={paid_amount}
          balanceDue={balance_due}
          notes={invoice.notes}
          terms={invoice.terms}
        />

        {/* Payments Ledger Section - hidden on print */}
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-lg)] p-6 space-y-4 no-print text-xs">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-sm text-[var(--foreground)] flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-[var(--primary)]" />
                Payments Recorded ({payments.length})
              </h3>
              <p className="text-xs text-[var(--muted)]">
                All ledger entries applied towards this invoice
              </p>
            </div>

            {invoice.status !== "draft" && invoice.status !== "cancelled" && balance_due > 0 && (
              <InvoiceViewActions
                invoice={invoice}
                balanceDue={balance_due}
                hasPayments={payments.length > 0}
              />
            )}
          </div>

          {payments.length === 0 ? (
            <div className="p-6 text-center border border-dashed border-[var(--border)] rounded-[var(--radius-md)] text-[var(--muted)]">
              No payments have been recorded for this invoice yet.
            </div>
          ) : (
            <div className="border border-[var(--border)] rounded-[var(--radius-md)] overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-[var(--surface-2)] text-[var(--muted)] border-b border-[var(--border)]">
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3">Method</th>
                    <th className="py-2.5 px-3">Reference #</th>
                    <th className="py-2.5 px-3 text-right">Amount</th>
                    <th className="py-2.5 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {payments.map((p) => (
                    <tr key={p.id} className="hover:bg-[var(--surface-2)]">
                      <td className="py-2.5 px-3 font-mono">{formatDate(p.payment_date)}</td>
                      <td className="py-2.5 px-3 capitalize">{p.payment_method.replace("_", " ")}</td>
                      <td className="py-2.5 px-3 font-mono text-[var(--muted)]">
                        {p.reference_number || "—"}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-semibold text-[var(--cash)]">
                        {formatMoney(p.amount, p.currency)}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <DeletePaymentButton paymentId={p.id} invoiceId={invoice.id} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
