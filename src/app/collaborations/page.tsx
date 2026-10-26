import Link from "next/link";
import { Header } from "@/components/header";
import { getCollaborations } from "@/lib/data/api";
import { formatMoney, formatDate } from "@/lib/format";
import { Handshake, Calendar, Clock } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function CollaborationsPage() {
  const collabs = await getCollaborations();

  return (
    <div className="flex-1 flex flex-col min-h-screen">
      <Header
        title="Collaborations"
        subtitle="Brand deals, campaign milestones, and production statuses"
        action={{ label: "New Deal", href: "/collaborations/new" }}
      />

      <div className="p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-6">
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-lg)] overflow-hidden">
          {collabs.length === 0 ? (
            <div className="p-12 text-center">
              <Handshake className="w-8 h-8 text-[var(--muted)] mx-auto mb-2 opacity-50" />
              <h3 className="text-sm font-semibold text-[var(--foreground)]">No collaborations found</h3>
              <p className="text-xs text-[var(--muted)] mt-1 max-w-sm mx-auto">
                Log a brand deal once with commercial fee, dates, and audience snapshot.
              </p>
              <Link
                href="/collaborations/new"
                className="mt-4 inline-block text-xs font-medium px-4 py-2 bg-[var(--primary)] text-[var(--primary-foreground)] rounded-[var(--radius-md)]"
              >
                Create First Collaboration
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[var(--border)] text-[var(--muted)] bg-[var(--surface-2)]">
                    <th className="py-3 px-4 font-medium">Deal Title & Brand</th>
                    <th className="py-3 px-4 font-medium">Stage</th>
                    <th className="py-3 px-4 font-medium text-right">Agreed Fee</th>
                    <th className="py-3 px-4 font-medium">Flight Timeline</th>
                    <th className="py-3 px-4 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {collabs.map((c) => (
                    <tr key={c.id} className="hover:bg-[var(--surface-2)] transition">
                      <td className="py-3.5 px-4">
                        <Link href={`/collaborations/${c.id}`} className="font-semibold text-sm text-[var(--foreground)] hover:underline block">
                          {c.title}
                        </Link>
                        <span className="text-xs text-[var(--muted)]">{c.brand?.name ?? "Brand partner"}</span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="px-2 py-0.5 rounded-[var(--radius-sm)] border border-[var(--border)] text-xs font-medium capitalize">
                          {c.status.replace("_", " ")}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-medium tnum text-sm text-[var(--foreground)]">
                        {formatMoney(c.deal_amount, c.currency)}
                      </td>
                      <td className="py-3.5 px-4 text-[var(--muted)] font-mono text-xs">
                        {c.start_date ? formatDate(c.start_date) : "—"} → {c.end_date ? formatDate(c.end_date) : "—"}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <Link
                          href={`/collaborations/${c.id}`}
                          className="px-2.5 py-1 rounded-[var(--radius-sm)] border border-[var(--border)] text-xs font-medium hover:bg-[var(--surface-2)] transition"
                        >
                          Open Deal
                        </Link>
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
