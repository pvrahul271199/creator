import Link from "next/link";
import { Header } from "@/components/header";
import { getPayments } from "@/lib/data/api";
import { formatMoney, formatDate } from "@/lib/format";
import { DeletePaymentButton } from "@/components/invoices/invoice-view-actions";
import { CreditCard, ArrowUpRight, CheckCircle2 } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function PaymentsPage() {
  const payments = await getPayments();

  const totalCollected = payments.reduce((sum, p) => sum + p.amount, 0);
  const averagePayment = payments.length > 0 ? totalCollected / payments.length : 0;

  return (
    <div className="flex-1 flex flex-col min-h-screen">
      <Header
        title="Payments Ledger"
        subtitle="Receipt records, bank transfers, UPI transactions, and cleared payments"
      />

      <div className="p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-6">
        {/* Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 rounded-[var(--radius-lg)] bg-[var(--surface)] border border-[var(--border)]">
            <span className="text-xs text-[var(--muted)] block">Total Collected</span>
            <span className="text-xl font-bold font-mono tnum text-[var(--cash)] mt-1 block">
              {formatMoney(totalCollected, "INR")}
            </span>
            <span className="text-xs text-[var(--muted)] mt-0.5 block">
              Across {payments.length} transactions
            </span>
          </div>

          <div className="p-4 rounded-[var(--radius-lg)] bg-[var(--surface)] border border-[var(--border)]">
            <span className="text-xs text-[var(--muted)] block">Transactions Recorded</span>
            <span className="text-xl font-bold font-mono tnum text-[var(--foreground)] mt-1 block">
              {payments.length}
            </span>
            <span className="text-xs text-[var(--muted)] mt-0.5 block">Confirmed deposits</span>
          </div>

          <div className="p-4 rounded-[var(--radius-lg)] bg-[var(--surface)] border border-[var(--border)]">
            <span className="text-xs text-[var(--muted)] block">Average Payment Size</span>
            <span className="text-xl font-bold font-mono tnum text-[var(--primary)] mt-1 block">
              {formatMoney(averagePayment, "INR")}
            </span>
            <span className="text-xs text-[var(--muted)] mt-0.5 block">Per remittance</span>
          </div>
        </div>

        {/* Payments Table */}
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-lg)] overflow-hidden">
          {payments.length === 0 ? (
            <div className="p-12 text-center">
              <CreditCard className="w-8 h-8 text-[var(--muted)] mx-auto mb-2 opacity-50" />
              <h3 className="text-sm font-semibold text-[var(--foreground)]">No payments recorded yet</h3>
              <p className="text-xs text-[var(--muted)] mt-1 max-w-sm mx-auto">
                Payments recorded against issued invoices will appear here in your master transaction ledger.
              </p>
              <Link
                href="/invoices"
                className="mt-4 inline-flex items-center gap-1.5 text-xs font-medium px-4 py-2 bg-[var(--primary)] text-[var(--primary-foreground)] rounded-[var(--radius-md)]"
              >
                <span>View Invoices to Record Payment</span>
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[var(--border)] text-[var(--muted)] bg-[var(--surface-2)]">
                    <th className="py-3 px-4 font-medium">Payment Date</th>
                    <th className="py-3 px-4 font-medium">Invoice #</th>
                    <th className="py-3 px-4 font-medium">Brand / Deal</th>
                    <th className="py-3 px-4 font-medium">Method</th>
                    <th className="py-3 px-4 font-medium">Reference Number</th>
                    <th className="py-3 px-4 font-medium text-right">Amount</th>
                    <th className="py-3 px-4 font-medium text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {payments.map((p) => (
                    <tr key={p.id} className="hover:bg-[var(--surface-2)] transition">
                      <td className="py-3.5 px-4 font-mono font-medium text-[var(--foreground)]">
                        {formatDate(p.payment_date)}
                      </td>
                      <td className="py-3.5 px-4 font-mono font-semibold">
                        {p.invoice ? (
                          <Link
                            href={`/invoices/${p.invoice.id}`}
                            className="text-[var(--primary)] hover:underline inline-flex items-center gap-1"
                          >
                            <span>{p.invoice.invoice_number}</span>
                            <ArrowUpRight className="w-3 h-3" />
                          </Link>
                        ) : (
                          <span className="text-[var(--muted)]">Direct</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-medium text-[var(--foreground)] block">
                          {p.brand?.name ?? "Direct Client"}
                        </span>
                        {p.collaboration && (
                          <span className="text-xs text-[var(--muted)] block">
                            {p.collaboration.title}
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 capitalize">
                        <span className="px-2 py-0.5 rounded-[var(--radius-sm)] border border-[var(--border)] text-xs bg-[var(--surface-2)] font-mono">
                          {p.payment_method.replace("_", " ")}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-[var(--muted)]">
                        {p.reference_number || "—"}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-semibold tnum text-sm text-[var(--cash)]">
                        {formatMoney(p.amount, p.currency)}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        {p.invoice && (
                          <DeletePaymentButton paymentId={p.id} invoiceId={p.invoice.id} />
                        )}
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
