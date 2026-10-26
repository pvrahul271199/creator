import Link from "next/link";
import { Header } from "@/components/header";
import { actionCreateBrand } from "@/app/actions";

export default function NewBrandPage() {
  return (
    <div className="flex-1 flex flex-col min-h-screen">
      <Header title="Add Brand" subtitle="Register a new brand or client to partner with" />

      <div className="p-4 sm:p-6 lg:p-8 max-w-2xl w-full mx-auto">
        <form action={actionCreateBrand} className="bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-lg)] p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[var(--foreground)] mb-1">
              Brand Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="name"
              required
              placeholder="e.g. Nykaa Beauty, Boat, L'Oreal"
              className="w-full text-xs px-3 py-2 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-2)] text-[var(--foreground)]"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[var(--foreground)] mb-1">Industry</label>
              <input
                type="text"
                name="industry"
                placeholder="e.g. Cosmetics, Tech, Fashion"
                className="w-full text-xs px-3 py-2 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-2)] text-[var(--foreground)]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[var(--foreground)] mb-1">Website URL</label>
              <input
                type="url"
                name="website"
                placeholder="https://brand.com"
                className="w-full text-xs px-3 py-2 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-2)] text-[var(--foreground)]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[var(--foreground)] mb-1">Notes / Relationship Context</label>
            <textarea
              name="notes"
              rows={3}
              placeholder="Agency contacts, payment terms requirements, brief guidelines..."
              className="w-full text-xs px-3 py-2 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-2)] text-[var(--foreground)] resize-none"
            />
          </div>

          <div className="pt-4 flex items-center justify-end gap-3 border-t border-[var(--border)]">
            <Link
              href="/brands"
              className="text-xs px-4 py-2 rounded-[var(--radius-md)] border border-[var(--border)] hover:bg-[var(--surface-2)] font-medium"
            >
              Cancel
            </Link>
            <button
              type="submit"
              className="text-xs px-4 py-2 rounded-[var(--radius-md)] bg-[var(--primary)] text-[var(--primary-foreground)] font-medium hover:opacity-95"
            >
              Save Brand
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
