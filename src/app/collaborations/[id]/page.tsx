import { notFound } from "next/navigation";
import Link from "next/link";
import { Header } from "@/components/header";
import { getCollaborationById } from "@/lib/data/api";
import {
  actionUpdateCollaborationStatus,
  actionCreateTask,
  actionToggleTask,
  actionAddSponsoredPost,
  actionAddPostSnapshot,
} from "@/app/actions";
import { formatMoney, formatDate, formatNumber } from "@/lib/format";
import { COLLAB_STATUSES } from "@/lib/constants";
import {
  engagementRateByReach,
  engagementRateByViews,
  viewToReachRatio,
  costPerThousandViews,
  costPerThousandReached,
} from "@/lib/analytics/post-metrics";
import { Handshake, Calendar, CheckSquare, FileText, Activity, Plus } from "lucide-react";
import { Instagram } from "@/components/icons";
import { AutoSubmitSelect, AutoSubmitCheckbox } from "@/components/auto-submit";

export const dynamic = "force-dynamic";

export default async function CollaborationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await getCollaborationById(id);

  if (!data) notFound();

  const { collab, brand, contact, tasks, invoices, payments, events, posts, snapshots } = data;

  const totalInvoiced = invoices.filter((i) => i.status !== "draft" && i.status !== "cancelled").reduce((s, i) => s + i.total_amount, 0);
  const totalReceived = payments.reduce((s, p) => s + p.amount, 0);
  const remainingBalance = Math.max(0, collab.deal_amount - totalReceived);

  return (
    <div className="flex-1 flex flex-col min-h-screen">
      <Header
        title={collab.title}
        subtitle={`${brand?.name ?? "Brand"} • Deal fee: ${formatMoney(collab.deal_amount, collab.currency)}`}
        action={{ label: "New Invoice", href: `/invoices/new?collabId=${collab.id}` }}
      />

      <div className="p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-6">
        {/* Commercial & Status Control Header */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-lg)] p-4">
            <span className="text-xs text-[var(--muted)] block">Agreed Deal Value</span>
            <span className="text-xl font-semibold text-[var(--foreground)] font-mono tnum">
              {formatMoney(collab.deal_amount, collab.currency)}
            </span>
          </div>

          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-lg)] p-4">
            <span className="text-xs text-[var(--muted)] block">Total Invoiced</span>
            <span className="text-xl font-semibold text-[var(--foreground)] font-mono tnum">
              {formatMoney(totalInvoiced, collab.currency)}
            </span>
          </div>

          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-lg)] p-4">
            <span className="text-xs text-[var(--muted)] block">Cash Collected</span>
            <span className="text-xl font-semibold text-[var(--cash-text)] font-mono tnum">
              {formatMoney(totalReceived, collab.currency)}
            </span>
          </div>

          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-lg)] p-4">
            <span className="text-xs text-[var(--muted)] block">Current Deal Stage</span>
            <form action={async (fd: FormData) => {
              "use server";
              const s = fd.get("stage") as string;
              await actionUpdateCollaborationStatus(collab.id, s);
            }} className="mt-1">
              <AutoSubmitSelect
                name="stage"
                defaultValue={collab.status}
                className="w-full text-sm h-9 px-2 rounded-md border border-[var(--border)] bg-[var(--surface-2)] font-medium"
              >
                {COLLAB_STATUSES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </AutoSubmitSelect>
            </form>
          </div>
        </div>

        {/* Deliverables & Real-Time Tasks */}
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-lg)] p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-[var(--foreground)]">Tasks & Production Deadlines</h2>
              <p className="text-xs text-[var(--muted)]">Track campaign milestone deliverables</p>
            </div>
          </div>

          <div className="divide-y divide-[var(--border)]">
            {tasks.length === 0 ? (
              <p className="text-xs text-[var(--muted)] py-3">No tasks added to this deal yet.</p>
            ) : (
              tasks.map((task) => (
                <div key={task.id} className="py-2.5 flex items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-3">
                    <form action={async () => {
                      "use server";
                      await actionToggleTask(task.id, collab.id);
                    }}>
                      <AutoSubmitCheckbox
                        label={`Mark ${task.title} complete`}
                        checked={task.status === "completed"}
                        className="h-4 w-4 rounded cursor-pointer"
                      />
                    </form>
                    <span className={task.status === "completed" ? "line-through text-[var(--muted)]" : "font-medium text-[var(--foreground)]"}>
                      {task.title}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-[var(--muted)] font-mono">
                    {task.due_date && <span>Due: {formatDate(task.due_date)}</span>}
                    <span className="uppercase text-[9px] px-1.5 py-0.5 rounded border border-[var(--border)] font-semibold">
                      {task.priority}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Quick add task inline */}
          <form action={actionCreateTask} className="pt-3 border-t border-[var(--border)] flex items-center gap-2 text-xs">
            <input type="hidden" name="collaboration_id" value={collab.id} />
            <input
              type="text"
              name="title"
              required
              placeholder="Add new task (e.g. Script approval, Draft Reel handover)..."
              className="flex-1 px-3 py-1.5 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-2)]"
            />
            <input
              type="date"
              name="due_date"
              className="px-2.5 py-1.5 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-2)]"
            />
            <button
              type="submit"
              className="px-3.5 py-1.5 rounded-[var(--radius-md)] bg-[var(--primary)] text-[var(--primary-foreground)] font-medium hover:opacity-95"
            >
              Add Task
            </button>
          </form>
        </div>

        {/* Section 23 & 24: Sponsored Posts & Campaign Analytics */}
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-lg)] p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Instagram className="w-4 h-4 text-pink-600" />
                <h2 className="text-sm font-semibold text-[var(--foreground)]">Sponsored Posts & Campaign Metrics</h2>
              </div>
              <p className="text-xs text-[var(--muted)]">Track published posts and evaluate engagement rate by reach/views</p>
            </div>
          </div>

          {posts.length === 0 ? (
            <div className="p-4 rounded-[var(--radius-md)] bg-[var(--surface-2)] text-xs text-[var(--muted)]">
              No sponsored posts linked to this collaboration yet. Add published content URLs below to record performance metrics.
            </div>
          ) : (
            <div className="space-y-4">
              {posts.map((post) => {
                return (
                  <div key={post.id} className="p-4 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-2)] space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-semibold text-xs text-[var(--foreground)]">{post.title}</span>
                        <span className="text-xs ml-2 px-1.5 py-0.5 rounded bg-[var(--border)] uppercase font-mono">
                          {post.content_type}
                        </span>
                      </div>
                      {post.post_url && (
                        <a
                          href={post.post_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-[var(--primary)] hover:underline font-mono"
                        >
                          View Post URL ↗
                        </a>
                      )}
                    </div>

                    {/* Inline snapshot recorder form */}
                    <form action={actionAddPostSnapshot} className="pt-2 border-t border-[var(--border)] grid grid-cols-2 sm:grid-cols-6 gap-2 text-xs">
                      <input type="hidden" name="sponsored_post_id" value={post.id} />
                      <input type="hidden" name="collaboration_id" value={collab.id} />
                      <input
                        type="number"
                        name="views"
                        placeholder="Views"
                        className="px-2 py-1 rounded border border-[var(--border)] bg-[var(--surface)] text-xs font-mono"
                      />
                      <input
                        type="number"
                        name="reach"
                        placeholder="Reach"
                        className="px-2 py-1 rounded border border-[var(--border)] bg-[var(--surface)] text-xs font-mono"
                      />
                      <input
                        type="number"
                        name="likes"
                        placeholder="Likes"
                        className="px-2 py-1 rounded border border-[var(--border)] bg-[var(--surface)] text-xs font-mono"
                      />
                      <input
                        type="number"
                        name="comments"
                        placeholder="Comments"
                        className="px-2 py-1 rounded border border-[var(--border)] bg-[var(--surface)] text-xs font-mono"
                      />
                      <input
                        type="number"
                        name="shares"
                        placeholder="Shares"
                        className="px-2 py-1 rounded border border-[var(--border)] bg-[var(--surface)] text-xs font-mono"
                      />
                      <button
                        type="submit"
                        className="px-2 py-1 rounded bg-[var(--primary)] text-[var(--primary-foreground)] font-medium hover:opacity-95"
                      >
                        Record Snapshot
                      </button>
                    </form>
                  </div>
                );
              })}
            </div>
          )}

          {/* Quick add post form */}
          <form action={actionAddSponsoredPost} className="pt-3 border-t border-[var(--border)] grid grid-cols-1 sm:grid-cols-4 gap-2 text-xs">
            <input type="hidden" name="collaboration_id" value={collab.id} />
            <input
              type="text"
              name="title"
              required
              placeholder="Post Title (e.g. Dedicated Festive Reel)..."
              className="px-2.5 py-1.5 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-2)]"
            />
            <input
              type="url"
              name="post_url"
              placeholder="https://instagram.com/reel/..."
              className="px-2.5 py-1.5 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-2)]"
            />
            <select
              name="content_type"
              defaultValue="reel"
              className="px-2.5 py-1.5 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-2)]"
            >
              <option value="reel">Reel</option>
              <option value="feed_post">Feed Post</option>
              <option value="carousel">Carousel</option>
              <option value="story">Story</option>
            </select>
            <button
              type="submit"
              className="px-3 py-1.5 rounded-[var(--radius-md)] bg-[var(--primary)] text-[var(--primary-foreground)] font-medium hover:opacity-95"
            >
              + Link Post
            </button>
          </form>
        </div>

        {/* Invoices & Activity Timeline Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Related Invoices */}
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-lg)] p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-[var(--foreground)]">Related Invoices</h3>
              <Link
                href={`/invoices/new?collabId=${collab.id}`}
                className="text-xs text-[var(--primary)] font-medium hover:underline"
              >
                + New Invoice
              </Link>
            </div>

            {invoices.length === 0 ? (
              <p className="text-xs text-[var(--muted)] py-2">No invoices billed for this deal yet.</p>
            ) : (
              <div className="divide-y divide-[var(--border)] text-xs">
                {invoices.map((inv) => (
                  <div key={inv.id} className="py-2.5 flex items-center justify-between">
                    <div>
                      <Link href={`/invoices/${inv.id}`} className="font-semibold text-[var(--foreground)] hover:underline block font-mono">
                        {inv.invoice_number}
                      </Link>
                      <span className="text-xs text-[var(--muted)]">Due: {formatDate(inv.due_date)}</span>
                    </div>
                    <div className="text-right">
                      <span className="font-mono font-medium block tnum">{formatMoney(inv.total_amount, inv.currency)}</span>
                      <span className="text-xs uppercase font-mono px-1.5 py-0.5 rounded border border-[var(--border)]">
                        {inv.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Activity Event Log (Real Persisted History) */}
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-lg)] p-5 space-y-3">
            <h3 className="text-sm font-semibold text-[var(--foreground)]">Activity Timeline</h3>
            <div className="space-y-3 text-xs">
              {events.length === 0 ? (
                <p className="text-xs text-[var(--muted)] py-2">No timeline events logged.</p>
              ) : (
                events.map((e) => (
                  <div key={e.id} className="flex items-start gap-2 text-xs">
                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--primary)] mt-1.5 flex-shrink-0" />
                    <div>
                      <p className="text-[var(--foreground)] font-medium">{e.description}</p>
                      <span className="text-xs text-[var(--muted)] font-mono">{formatDate(e.created_at)}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
