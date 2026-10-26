import Link from "next/link";
import { Header } from "@/components/header";
import { getInvoices } from "@/lib/data/api";
import { formatMoney, formatDate } from "@/lib/format";
import { FileText, Plus, AlertCircle, CheckCircle2, Clock } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function InvoicesPage() {
  const invoices = await getInvoices();

  const totalInvoiced = invoices
    .filter((i) => i.status !== "cancelled")
    .reduce((sum, i) => sum + i.total_amount, 0);

  const totalCollected = invoices
    .filter((i) => i.status !== "cancelled")
    .reduce((sum, i) => sum + i.paid_amount, 0);

  const totalBalanceDue = invoices
    .filter((i) => i.status !== "cancelled")
    .reduce((sum, i) => sum + i.balance_due, 0);

  const overdueCount = invoices.filter((i) => i.effective_status === "overdue").length;

  return (
    <div className="flex-1 flex flex-col min-h-screen">
      <Header
        title="Invoices"
        subtitle="Itemized billing, tax records, and client payment tracking"
        action={{ label: "New Invoice", href: "/invoices/new" }}
      />

      <div className="p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-6">
        {/* Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-[var(--radius-lg)] bg-[var(--surface)] border border-[var(--border)]">
            <span className="text-xs text-[var(--muted)] block">Total Invoiced</span>
            <span className="text-xl font-bold font-mono tnum text-[var(--foreground)] mt-1 block">
              {formatMoney(totalInvoiced, "INR")}
            </span>
            <span className="text-xs text-[var(--muted)] mt-0.5 block">Excluding cancelled</span>
          </div>

          <div className="p-4 rounded-[var(--radius-lg)] bg-[var(--surface)] border border-[var(--border)]">
            <span className="text-xs text-[var(--muted)] block">Collected</span>
            <span className="text-xl font-bold font-mono tnum text-[var(--cash)] mt-1 block">
              {formatMoney(totalCollected, "INR")}
            </span>
            <span className="text-xs text-[var(--muted)] mt-0.5 block">Cleared in ledger</span>
          </div>

          <div className="p-4 rounded-[var(--radius-lg)] bg-[var(--surface)] border border-[var(--border)]">
            <span className="text-xs text-[var(--muted)] block">Balance Due</span>
            <span className="text-xl font-bold font-mono tnum text-[var(--primary)] mt-1 block">
              {formatMoney(totalBalanceDue, "INR")}
            </span>
            <span className="text-xs text-[var(--muted)] mt-0.5 block">Awaiting payment</span>
          </div>

          <div className="p-4 rounded-[var(--radius-lg)] bg-[var(--surface)] border border-[var(--border)]">
            <span className="text-xs text-[var(--muted)] block">Overdue Invoices</span>
            <span
              className={`text-xl font-bold font-mono tnum mt-1 block ${
                overdueCount > 0 ? "text-[var(--overdue)]" : "text-[var(--muted)]"
              }`}
            >
              {overdueCount}
            </span>
            <span className="text-xs text-[var(--muted)] mt-0.5 block">
              Past payment deadline
            </span>
          </div>
        </div>

        {/* Invoice Table */}
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-lg)] overflow-hidden">
          {invoices.length === 0 ? (
            <div className="p-12 text-center">
              <FileText className="w-8 h-8 text-[var(--muted)] mx-auto mb-2 opacity-50" />
              <h3 className="text-sm font-semibold text-[var(--foreground)]">No invoices yet</h3>
              <p className="text-xs text-[var(--muted)] mt-1 max-w-sm mx-auto">
                Generate an A4 tax-compliant invoice from your brand deals or create a standalone bill.
              </p>
              <Link
                href="/invoices/new"
                className="mt-4 inline-flex items-center gap-1.5 text-xs font-medium px-4 py-2 bg-[var(--primary)] text-[var(--primary-foreground)] rounded-[var(--radius-md)]"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Create First Invoice</span>
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[var(--border)] text-[var(--muted)] bg-[var(--surface-2)]">
                    <th className="py-3 px-4 font-medium">Invoice Number</th>
                    <th className="py-3 px-4 font-medium">Client / Deal</th>
                    <th className="py-3 px-4 font-medium">Issue / Due Date</th>
                    <th className="py-3 px-4 font-medium text-right">Total</th>
                    <th className="py-3 px-4 font-medium text-right">Balance Due</th>
                    <th className="py-3 px-4 font-medium">Status</th>
                    <th className="py-3 px-4 font-medium text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {invoices.map((inv) => {
                    const eff = inv.effective_status;
                    let badgeClass = "bg-zinc-500/10 text-zinc-600 border-zinc-500/20";
                    if (eff === "paid") {
                      badgeClass = "bg-emerald-500/10 text-emerald-600 border-emerald-500/20";
                    } else if (eff === "partially_paid") {
                      badgeClass = "bg-amber-500/10 text-amber-600 border-amber-500/20";
                    } else if (eff === "overdue") {
                      badgeClass = "bg-rose-500/10 text-rose-600 border-rose-500/20 font-semibold";
                    } else if (eff === "issued") {
                      badgeClass = "bg-blue-500/10 text-blue-600 border-blue-500/20";
                    } else if (eff === "cancelled") {
                      badgeClass = "bg-zinc-500/10 text-zinc-500 border-zinc-500/20 line-through";
                    }

                    return (
                      <tr key={inv.id} className="hover:bg-[var(--surface-2)] transition">
                        <td className="py-3.5 px-4 font-mono font-medium">
                          <Link
                            href={`/invoices/${inv.id}`}
                            className="text-[var(--foreground)] hover:underline font-semibold"
                          >
                            {inv.invoice_number}
                          </Link>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="font-medium text-[var(--foreground)] block">
                            {inv.brand?.name ?? inv.recipient_snapshot.name ?? "Direct Client"}
                          </span>
                          {inv.collaboration && (
                            <span className="text-xs text-[var(--muted)] block">
                              {inv.collaboration.title}
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 font-mono text-xs text-[var(--muted)]">
                          <span>{formatDate(inv.issue_date)}</span>
                          <span className="block text-xs">Due: {formatDate(inv.due_date)}</span>
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono font-medium tnum text-sm text-[var(--foreground)]">
                          {formatMoney(inv.total_amount, inv.currency)}
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono font-medium tnum text-sm">
                          {inv.balance_due > 0 ? (
                            <span
                              className={
                                eff === "overdue"
                                  ? "text-[var(--overdue)] font-semibold"
                                  : "text-[var(--foreground)]"
                              }
                            >
                              {formatMoney(inv.balance_due, inv.currency)}
                            </span>
                          ) : (
                            <span className="text-[var(--cash)]">Settled</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`px-2 py-0.5 rounded-[var(--radius-sm)] border text-xs uppercase font-mono tracking-wider ${badgeClass}`}
                          >
                            {eff.replace("_", " ")}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <Link
                            href={`/invoices/${inv.id}`}
                            className="px-2.5 py-1 rounded-[var(--radius-sm)] border border-[var(--border)] text-xs font-medium hover:bg-[var(--surface-2)] transition"
                          >
                            View
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
