import Link from "next/link";
import { Plus } from "lucide-react";

interface HeaderProps {
  title: string;
  subtitle?: string;
  action?: {
    label: string;
    href: string;
  };
}

export function Header({ title, subtitle, action }: HeaderProps) {
  return (
    <header className="px-4 sm:px-6 lg:px-8 py-4 min-h-16 flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] bg-[var(--surface)] no-print">
      <div className="min-w-0">
        <h1 className="text-xl font-semibold tracking-tight text-[var(--foreground)]">{title}</h1>
        {subtitle && <p className="text-sm text-[var(--muted)]">{subtitle}</p>}
      </div>

      {action && (
        <Link
          href={action.href}
          className="inline-flex items-center gap-1.5 h-9 px-4 rounded-md bg-[var(--primary)] text-[var(--primary-foreground)] text-sm font-medium hover:opacity-90 transition"
        >
          <Plus className="w-4 h-4" />
          <span>{action.label}</span>
        </Link>
      )}
    </header>
  );
}
