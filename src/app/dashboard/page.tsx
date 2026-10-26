import Link from "next/link";
import { Header } from "@/components/header";
import { getCollaborations, getInvoices, getTasks, getPayments, getBrands } from "@/lib/data/api";
import { formatMoney, formatDate } from "@/lib/format";
import { CheckSquare, ArrowUpRight, Clock, AlertTriangle } from "lucide-react";
import { Instagram } from "@/components/icons";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const [collabs, invoices, tasks, payments, brands] = await Promise.all([
    getCollaborations(),
    getInvoices(),
    getTasks(),
    getPayments(),
    getBrands(),
  ]);

  // Financial & Dashboard Calculations
  const activeCollabs = collabs.filter((c) => c.status === "in_progress" || c.status === "confirmed");
  const activeCollabsCount = activeCollabs.length;

  // Outstanding Invoice balance (excluding draft & cancelled)
  const outstandingInvoices = invoices.filter(
    (i) => i.status === "issued" || i.status === "partially_paid" || i.effective_status === "overdue"
  );
  const outstandingPaymentsTotal = outstandingInvoices.reduce((sum, i) => sum + i.balance_due, 0);

  // Revenue this month (based on payment records in current month)
  const currentMonth = "2026-10";
  const revenueThisMonth = payments
    .filter((p) => p.payment_date.startsWith(currentMonth))
    .reduce((sum, p) => sum + p.amount, 0);

  // Overdue Invoices
  const overdueInvoices = invoices.filter((i) => i.effective_status === "overdue");
  const overdueInvoicesTotal = overdueInvoices.reduce((sum, i) => sum + i.balance_due, 0);

  const upcomingTasks = tasks.filter((t) => t.status === "pending").slice(0, 5);

  return (
    <div className="flex-1 flex flex-col min-h-screen">
      <Header
        title="Creator Dashboard"
        subtitle="Business overview, timeline flights, and cash collections"
        action={{ label: "New Deal", href: "/collaborations/new" }}
      />

      <div className="p-8 space-y-6 max-w-7xl w-full mx-auto">
        {/* Core Financial Metric Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Active Deals */}
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-lg)] p-5">
            <div className="text-xs font-medium text-[var(--muted)] flex items-center justify-between">
              <span>Active Collaborations</span>
              <span className="w-2 h-2 rounded-full bg-[var(--primary)]" />
            </div>
            <div className="text-2xl font-semibold tracking-tight text-[var(--foreground)] mt-2 tnum">
              {activeCollabsCount}
            </div>
            <div className="text-xs text-[var(--muted)] mt-1">Confirmed & in progress</div>
          </div>

          {/* Outstanding Payments */}
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-lg)] p-5">
            <div className="text-xs font-medium text-[var(--muted)] flex items-center justify-between">
              <span>Outstanding Payments</span>
              <span className="w-2 h-2 rounded-full bg-[var(--deadline)]" />
            </div>
            <div className="text-2xl font-semibold tracking-tight text-[var(--foreground)] mt-2 tnum">
              {formatMoney(outstandingPaymentsTotal, "INR")}
            </div>
            <div className="text-xs text-[var(--muted)] mt-1">{outstandingInvoices.length} invoices pending balance</div>
          </div>

          {/* Revenue This Month */}
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-lg)] p-5">
            <div className="text-xs font-medium text-[var(--muted)] flex items-center justify-between">
              <span>Revenue This Month</span>
              <span className="w-2 h-2 rounded-full bg-[var(--cash)]" />
            </div>
            <div className="text-2xl font-semibold tracking-tight text-[var(--foreground)] mt-2 tnum">
              {formatMoney(revenueThisMonth, "INR")}
            </div>
            <div className="text-xs text-[var(--muted)] mt-1">Payments collected in October</div>
          </div>

          {/* Overdue Invoices */}
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-lg)] p-5">
            <div className="text-xs font-medium text-[var(--muted)] flex items-center justify-between">
              <span>Overdue Invoices</span>
              <span className="w-2 h-2 rounded-full bg-[var(--overdue)]" />
            </div>
            <div className="text-2xl font-semibold tracking-tight text-[var(--overdue-text)] mt-2 tnum">
              {formatMoney(overdueInvoicesTotal, "INR")}
            </div>
            <div className="text-xs text-[var(--muted)] mt-1">
              {overdueInvoices.length > 0 ? `${overdueInvoices.length} past due date` : "Zero overdue invoices"}
            </div>
          </div>
        </div>


        {/* Two-column layout: Recent Deals & Next Deliverables */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Collaborations (2 cols) */}
          <div className="lg:col-span-2 bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-lg)] p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-sm font-semibold text-[var(--foreground)]">Recent Brand Collaborations</h2>
                <p className="text-xs text-[var(--muted)]">Agreed deals and current production stages</p>
              </div>
              <Link href="/collaborations" className="text-xs text-[var(--primary)] font-medium hover:underline flex items-center gap-1">
                <span>View all</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[var(--border)] text-[var(--muted)]">
                    <th className="py-2.5 font-medium">Brand & Deal</th>
                    <th className="py-2.5 font-medium">Stage</th>
                    <th className="py-2.5 font-medium text-right">Fee</th>
                    <th className="py-2.5 font-medium text-right">End Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {collabs.slice(0, 5).map((c) => (
                    <tr key={c.id} className="hover:bg-[var(--surface-2)] transition">
                      <td className="py-3">
                        <Link href={`/collaborations/${c.id}`} className="font-semibold text-[var(--foreground)] hover:underline block">
                          {c.brand?.name ?? "Brand"}
                        </Link>
                        <span className="text-xs text-[var(--muted)]">{c.title}</span>
                      </td>
                      <td className="py-3">
                        <span className="inline-block px-2 py-0.5 rounded-[var(--radius-sm)] border border-[var(--border)] text-xs font-medium capitalize">
                          {c.status.replace("_", " ")}
                        </span>
                      </td>
                      <td className="py-3 text-right font-mono font-medium tnum text-[var(--foreground)]">
                        {formatMoney(c.deal_amount, c.currency)}
                      </td>
                      <td className="py-3 text-right text-[var(--muted)] font-mono">{formatDate(c.end_date)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Upcoming Tasks & Deadlines (1 col) */}
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-lg)] p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-sm font-semibold text-[var(--foreground)]">Upcoming Tasks</h2>
                <p className="text-xs text-[var(--muted)]">Next deliverables to complete</p>
              </div>
              <Link href="/tasks" className="text-xs text-[var(--primary)] font-medium hover:underline flex items-center gap-1">
                <span>All tasks</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="space-y-3">
              {upcomingTasks.length === 0 ? (
                <p className="text-xs text-[var(--muted)] py-4 text-center">All caught up! No pending tasks.</p>
              ) : (
                upcomingTasks.map((task) => (
                  <div key={task.id} className="p-2.5 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-2)] space-y-1">
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-xs font-medium text-[var(--foreground)] leading-tight">{task.title}</span>
                      <span
                        className={`text-[9px] px-1.5 py-0.5 rounded font-mono uppercase ${
                          task.priority === "high"
                            ? "bg-red-100 text-red-700"
                            : task.priority === "medium"
                            ? "bg-amber-100 text-amber-800"
                            : "bg-zinc-100 text-zinc-700"
                        }`}
                      >
                        {task.priority}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-[var(--muted)]">
                      <Clock className="w-3 h-3 text-[var(--deadline)]" />
                      <span>Due: {formatDate(task.due_date)}</span>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Quick Actions Footer */}
            <div className="mt-6 pt-4 border-t border-[var(--border)] grid grid-cols-2 gap-2">
              <Link
                href="/invoices/new"
                className="text-xs text-center py-2 px-2.5 rounded-[var(--radius-md)] bg-[var(--surface-2)] text-[var(--foreground)] hover:bg-[var(--border)] font-medium transition"
              >
                + New Invoice
              </Link>
              <Link
                href="/tasks"
                className="text-xs text-center py-2 px-2.5 rounded-[var(--radius-md)] bg-[var(--surface-2)] text-[var(--foreground)] hover:bg-[var(--border)] font-medium transition"
              >
                + Add Task
              </Link>
            </div>
          </div>
        </div>

        {/* Feature Flag Notice: Instagram Integration */}
        <div className="bg-[var(--surface)] border border-dashed border-[var(--border-strong)] rounded-[var(--radius-lg)] p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-pink-100 text-pink-700 flex items-center justify-center">
              <Instagram className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-[var(--foreground)]">Meta Instagram Graph API Sync</span>
                <span className="text-xs font-mono uppercase px-1.5 py-0.5 bg-amber-100 text-amber-800 rounded">
                  Coming Soon
                </span>
              </div>
              <p className="text-xs text-[var(--muted)] mt-0.5">
                Direct Instagram OAuth connection is staged. All follower snapshots and sponsored post metrics work via manual entry today.
              </p>
            </div>
          </div>
          <Link
            href="/settings"
            className="text-xs text-[var(--primary)] font-medium px-3 py-1.5 rounded-[var(--radius-md)] border border-[var(--border)] hover:bg-[var(--surface-2)] transition"
          >
            Settings
          </Link>
        </div>
      </div>
    </div>
  );
}
