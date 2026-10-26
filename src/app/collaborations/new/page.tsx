import Link from "next/link";
import { Header } from "@/components/header";
import { getBrands } from "@/lib/data/api";
import { actionCreateCollaboration } from "@/app/actions";
import { CURRENCIES, COLLAB_STATUSES } from "@/lib/constants";
import { Instagram } from "@/components/icons";

export const dynamic = "force-dynamic";

export default async function NewCollaborationPage({
  searchParams,
}: {
  searchParams: Promise<{ brandId?: string }>;
}) {
  const { brandId } = await searchParams;
  const brands = await getBrands();

  return (
    <div className="flex-1 flex flex-col min-h-screen">
      <Header title="New Collaboration" subtitle="Record a commercial agreement, deliverables, and audience snapshot" />

      <div className="p-4 sm:p-6 lg:p-8 max-w-3xl w-full mx-auto">
        <form action={actionCreateCollaboration} className="bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-lg)] p-6 space-y-6">
          {/* Brand & Title */}
          <div className="space-y-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">1. Collaboration Basics</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[var(--foreground)] mb-1">
                  Brand Partner <span className="text-red-500">*</span>
                </label>
                <select
                  name="brand_id"
                  required
                  defaultValue={brandId ?? ""}
                  className="w-full text-xs px-3 py-2 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-2)] text-[var(--foreground)]"
                >
                  <option value="" disabled>
                    Select brand...
                  </option>
                  {brands.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--foreground)] mb-1">
                  Campaign Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="title"
                  required
                  placeholder="e.g. Diwali Festive Launch Reel"
                  className="w-full text-xs px-3 py-2 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-2)] text-[var(--foreground)]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[var(--foreground)] mb-1">Deliverables Description</label>
              <textarea
                name="description"
                rows={2}
                placeholder="e.g. 1 Reel (60s) + 3 Stories + 30-day digital usage rights"
                className="w-full text-xs px-3 py-2 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-2)] text-[var(--foreground)] resize-none"
              />
            </div>
          </div>

          {/* Commercials & Stage */}
          <div className="space-y-4 pt-4 border-t border-[var(--border)]">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">2. Commercial Terms</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[var(--foreground)] mb-1">
                  Agreed Deal Fee <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  name="deal_amount"
                  required
                  placeholder="50000"
                  className="w-full text-xs px-3 py-2 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-2)] text-[var(--foreground)] font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--foreground)] mb-1">Currency</label>
                <select
                  name="currency"
                  defaultValue="INR"
                  className="w-full text-xs px-3 py-2 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-2)] text-[var(--foreground)]"
                >
                  {CURRENCIES.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.code} ({c.label.split(", ")[1]})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--foreground)] mb-1">Initial Status</label>
                <select
                  name="status"
                  defaultValue="confirmed"
                  className="w-full text-xs px-3 py-2 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-2)] text-[var(--foreground)] capitalize"
                >
                  {COLLAB_STATUSES.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[var(--foreground)] mb-1">Start / Confirmation Date</label>
                <input
                  type="date"
                  name="start_date"
                  className="w-full text-xs px-3 py-2 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-2)] text-[var(--foreground)]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[var(--foreground)] mb-1">Delivery Deadline</label>
                <input
                  type="date"
                  name="end_date"
                  className="w-full text-xs px-3 py-2 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-2)] text-[var(--foreground)]"
                />
              </div>
            </div>
          </div>

          {/* Section 21: Creator Profile Snapshot at Deal Creation */}
          <div className="space-y-4 pt-4 border-t border-[var(--border)] bg-[var(--surface-2)] p-4 rounded-[var(--radius-md)]">
            <div className="flex items-center gap-2">
              <Instagram className="w-4 h-4 text-pink-600" />
              <h3 className="text-xs font-semibold text-[var(--foreground)]">Creator Profile Snapshot (Optional)</h3>
            </div>
            <p className="text-xs text-[var(--muted)]">
              Record your current audience size on Instagram when signing this deal to evaluate growth and pricing leverage over time.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[var(--foreground)] mb-1">Follower Count at Deal Signing</label>
                <input
                  type="number"
                  name="follower_snapshot"
                  placeholder="e.g. 142500"
                  className="w-full text-xs px-3 py-2 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] font-mono"
                />
              </div>
              <div className="text-xs text-[var(--muted)] flex items-center">
                <span>Recorded as manual entry. Synced Instagram OAuth available under Settings.</span>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-[var(--foreground)] mb-1">Internal Notes</label>
            <textarea
              name="notes"
              rows={2}
              placeholder="Exclusivity windows, raw footage handover guidelines..."
              className="w-full text-xs px-3 py-2 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-2)] text-[var(--foreground)] resize-none"
            />
          </div>

          <div className="pt-4 flex items-center justify-end gap-3 border-t border-[var(--border)]">
            <Link
              href="/collaborations"
              className="text-xs px-4 py-2 rounded-[var(--radius-md)] border border-[var(--border)] hover:bg-[var(--surface-2)] font-medium"
            >
              Cancel
            </Link>
            <button
              type="submit"
              className="text-xs px-4 py-2 rounded-[var(--radius-md)] bg-[var(--primary)] text-[var(--primary-foreground)] font-medium hover:opacity-95"
            >
              Save Collaboration
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
