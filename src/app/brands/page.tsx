import Link from "next/link";
import { Header } from "@/components/header";
import { getBrands } from "@/lib/data/api";
import { formatDate } from "@/lib/format";
import { Building2, Globe, Users, Briefcase } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function BrandsPage() {
  const brands = await getBrands();

  return (
    <div className="flex-1 flex flex-col min-h-screen">
      <Header
        title="Brands & Contacts"
        subtitle="Manage client relationships, media contacts, and partnership history"
        action={{ label: "Add Brand", href: "/brands/new" }}
      />

      <div className="p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-6">
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-lg)] overflow-hidden">
          {brands.length === 0 ? (
            <div className="p-12 text-center">
              <Building2 className="w-8 h-8 text-[var(--muted)] mx-auto mb-2 opacity-50" />
              <h3 className="text-sm font-semibold text-[var(--foreground)]">No brands added yet</h3>
              <p className="text-xs text-[var(--muted)] mt-1 max-w-sm mx-auto">
                Create a brand partner once and link it to collaborations, invoices, and communication contacts.
              </p>
              <Link
                href="/brands/new"
                className="mt-4 inline-block text-xs font-medium px-4 py-2 bg-[var(--primary)] text-[var(--primary-foreground)] rounded-[var(--radius-md)]"
              >
                Add Your First Brand
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[var(--border)] text-[var(--muted)] bg-[var(--surface-2)]">
                    <th className="py-3 px-4 font-medium">Brand Name</th>
                    <th className="py-3 px-4 font-medium">Industry</th>
                    <th className="py-3 px-4 font-medium">Website</th>
                    <th className="py-3 px-4 font-medium">Notes</th>
                    <th className="py-3 px-4 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {brands.map((b) => (
                    <tr key={b.id} className="hover:bg-[var(--surface-2)] transition">
                      <td className="py-3.5 px-4">
                        <Link href={`/brands/${b.id}`} className="font-semibold text-sm text-[var(--foreground)] hover:underline block">
                          {b.name}
                        </Link>
                      </td>
                      <td className="py-3.5 px-4 text-[var(--muted)]">{b.industry ?? "—"}</td>
                      <td className="py-3.5 px-4 text-[var(--muted)]">
                        {b.website ? (
                          <a
                            href={b.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[var(--primary)] hover:underline flex items-center gap-1 font-mono text-xs"
                          >
                            <Globe className="w-3 h-3" />
                            <span>{b.website.replace(/^https?:\/\//, "")}</span>
                          </a>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-[var(--muted)] max-w-xs truncate">{b.notes ?? "—"}</td>
                      <td className="py-3.5 px-4 text-right">
                        <Link
                          href={`/brands/${b.id}`}
                          className="px-2.5 py-1 rounded-[var(--radius-sm)] border border-[var(--border)] text-xs font-medium hover:bg-[var(--surface-2)] transition"
                        >
                          View Details
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
