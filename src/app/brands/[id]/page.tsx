import { notFound } from "next/navigation";
import Link from "next/link";
import { Header } from "@/components/header";
import { getBrandById } from "@/lib/data/api";
import { actionAddContact } from "@/app/actions";
import { formatMoney, formatDate } from "@/lib/format";
import { Building2, Globe, Mail, Phone, Briefcase, Plus } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function BrandDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await getBrandById(id);

  if (!data) notFound();

  const { brand, contacts, collabs, invoices } = data;

  return (
    <div className="flex-1 flex flex-col min-h-screen">
      <Header
        title={brand.name}
        subtitle={`${brand.industry ?? "Brand partner"} • ${collabs.length} collaborations`}
        action={{ label: "New Deal", href: `/collaborations/new?brandId=${brand.id}` }}
      />

      <div className="p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-6">
        {/* Brand Overview & Contacts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Brand Info Card */}
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-lg)] p-5 space-y-3">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">Brand Details</h2>
            <div className="space-y-2 text-xs">
              <div>
                <span className="text-[var(--muted)] block">Industry:</span>
                <span className="font-medium text-[var(--foreground)]">{brand.industry ?? "—"}</span>
              </div>
              <div>
                <span className="text-[var(--muted)] block">Website:</span>
                {brand.website ? (
                  <a href={brand.website} target="_blank" rel="noopener noreferrer" className="text-[var(--primary)] hover:underline flex items-center gap-1 font-mono">
                    <Globe className="w-3 h-3" />
                    <span>{brand.website}</span>
                  </a>
                ) : (
                  "—"
                )}
              </div>
              <div>
                <span className="text-[var(--muted)] block">Internal Notes:</span>
                <p className="text-[var(--foreground)] mt-0.5 leading-relaxed">{brand.notes ?? "No notes added."}</p>
              </div>
            </div>
          </div>

          {/* Contacts Section (2 cols) */}
          <div className="lg:col-span-2 bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-lg)] p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">Brand Contacts</h2>
                <p className="text-xs text-[var(--muted)]">Key points of contact for briefings and payment sign-offs</p>
              </div>
            </div>

            {/* Existing contacts list */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {contacts.length === 0 ? (
                <p className="text-xs text-[var(--muted)] col-span-2 py-2">No individual contacts registered for this brand yet.</p>
              ) : (
                contacts.map((c) => (
                  <div key={c.id} className="p-3 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-2)] text-xs space-y-1">
                    <div className="font-semibold text-[var(--foreground)]">{c.name}</div>
                    {c.job_title && <div className="text-xs text-[var(--muted)]">{c.job_title}</div>}
                    <div className="pt-1 space-y-0.5 text-xs text-[var(--muted)] font-mono">
                      {c.email && (
                        <div className="flex items-center gap-1.5">
                          <Mail className="w-3 h-3" /> {c.email}
                        </div>
                      )}
                      {c.phone && (
                        <div className="flex items-center gap-1.5">
                          <Phone className="w-3 h-3" /> {c.phone}
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Quick add contact form */}
            <form action={actionAddContact} className="pt-3 border-t border-[var(--border)] grid grid-cols-1 sm:grid-cols-4 gap-2 text-xs">
              <input type="hidden" name="brandId" value={brand.id} />
              <input
                type="text"
                name="name"
                required
                placeholder="Contact Name *"
                className="px-2.5 py-1.5 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-2)]"
              />
              <input
                type="email"
                name="email"
                placeholder="Email address"
                className="px-2.5 py-1.5 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-2)]"
              />
              <input
                type="text"
                name="job_title"
                placeholder="Role / Title"
                className="px-2.5 py-1.5 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-2)]"
              />
              <button
                type="submit"
                className="px-3 py-1.5 rounded-[var(--radius-md)] bg-[var(--primary)] text-[var(--primary-foreground)] font-medium hover:opacity-95"
              >
                + Add Contact
              </button>
            </form>
          </div>
        </div>

        {/* Collaborations History */}
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-lg)] p-5">
          <h2 className="text-sm font-semibold text-[var(--foreground)] mb-3">Collaborations with {brand.name}</h2>
          {collabs.length === 0 ? (
            <p className="text-xs text-[var(--muted)] py-4">No collaborations created with this brand yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[var(--border)] text-[var(--muted)]">
                    <th className="py-2.5 font-medium">Title</th>
                    <th className="py-2.5 font-medium">Stage</th>
                    <th className="py-2.5 font-medium text-right">Fee</th>
                    <th className="py-2.5 font-medium text-right">Timeline</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {collabs.map((c) => (
                    <tr key={c.id} className="hover:bg-[var(--surface-2)] transition">
                      <td className="py-3">
                        <Link href={`/collaborations/${c.id}`} className="font-semibold text-[var(--foreground)] hover:underline">
                          {c.title}
                        </Link>
                      </td>
                      <td className="py-3">
                        <span className="px-2 py-0.5 rounded-[var(--radius-sm)] border border-[var(--border)] font-medium capitalize text-xs">
                          {c.status.replace("_", " ")}
                        </span>
                      </td>
                      <td className="py-3 text-right font-mono font-medium tnum">
                        {formatMoney(c.deal_amount, c.currency)}
                      </td>
                      <td className="py-3 text-right font-mono text-[var(--muted)]">
                        {formatDate(c.start_date)} → {formatDate(c.end_date)}
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
