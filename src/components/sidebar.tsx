"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "@/components/theme-provider";
import {
  LayoutDashboard,
  Handshake,
  Building2,
  CheckSquare,
  FileText,
  CreditCard,
  Settings,
  Menu,
  X,
  Moon,
  Sun,
} from "lucide-react";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/collaborations", label: "Collaborations", icon: Handshake },
  { href: "/brands", label: "Brands & Contacts", icon: Building2 },
  { href: "/tasks", label: "Tasks", icon: CheckSquare },
  { href: "/invoices", label: "Invoices", icon: FileText },
  { href: "/payments", label: "Payments", icon: CreditCard },
  { href: "/settings", label: "Settings", icon: Settings },
];

function NavContent({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="flex h-full flex-col justify-between">
      <div>
        <div className="h-14 flex items-center px-5 border-b border-[var(--border)]">
          <Link href="/dashboard" onClick={onNavigate} className="flex items-center gap-2">
            <span className="w-7 h-7 rounded-md bg-[var(--primary)] text-[var(--primary-foreground)] flex items-center justify-center font-bold text-sm">
              B
            </span>
            <span className="font-semibold text-base tracking-tight">Boardroom</span>
          </Link>
        </div>

        <nav className="p-3 space-y-0.5" aria-label="Main">
          {NAV_ITEMS.map((item) => {
            const active =
              pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onNavigate}
                aria-current={active ? "page" : undefined}
                className={`flex items-center gap-3 px-3 h-10 rounded-md text-sm font-medium transition-colors ${
                  active
                    ? "bg-[var(--surface-2)] text-[var(--foreground)]"
                    : "text-[var(--muted)] hover:bg-[var(--surface-2)] hover:text-[var(--foreground)]"
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="p-3 border-t border-[var(--border)] space-y-2">
        <button
          type="button"
          onClick={toggleTheme}
          className="w-full flex items-center gap-3 px-3 h-9 rounded-md text-sm text-[var(--muted)] hover:bg-[var(--surface-2)] hover:text-[var(--foreground)] transition-colors"
        >
          {theme === "flight" ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
          <span>{theme === "flight" ? "Dark theme" : "Light theme"}</span>
        </button>
        <div className="flex items-center gap-3 px-3 py-1">
          <div className="w-8 h-8 rounded-full bg-[var(--surface-2)] border border-[var(--border)] flex items-center justify-center font-semibold text-xs">
            AS
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium truncate">Aanya Sharma</p>
            <p className="text-xs text-[var(--muted)] truncate">Aanya Studios</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export function Sidebar() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <>
      {/* Desktop rail */}
      <aside className="hidden lg:block w-60 flex-shrink-0 h-screen sticky top-0 bg-[var(--surface)] border-r border-[var(--border)] no-print">
        <NavContent />
      </aside>

      {/* Mobile / tablet top bar */}
      <div className="lg:hidden sticky top-0 z-30 h-14 flex items-center justify-between px-4 bg-[var(--surface)] border-b border-[var(--border)] no-print">
        <Link href="/dashboard" className="flex items-center gap-2">
          <span className="w-7 h-7 rounded-md bg-[var(--primary)] text-[var(--primary-foreground)] flex items-center justify-center font-bold text-sm">
            B
          </span>
          <span className="font-semibold tracking-tight">Boardroom</span>
        </Link>
        <button
          type="button"
          aria-label="Open menu"
          aria-expanded={open}
          onClick={() => setOpen(true)}
          className="h-10 w-10 flex items-center justify-center rounded-md hover:bg-[var(--surface-2)]"
        >
          <Menu className="w-5 h-5" />
        </button>
      </div>

      {/* Mobile drawer */}
      {open && (
        <div className="lg:hidden fixed inset-0 z-50 no-print">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-0 h-full w-72 max-w-[85%] bg-[var(--surface)] border-r border-[var(--border)] shadow-xl">
            <button
              type="button"
              aria-label="Close menu"
              onClick={() => setOpen(false)}
              className="absolute right-2 top-2 h-10 w-10 flex items-center justify-center rounded-md hover:bg-[var(--surface-2)]"
            >
              <X className="w-5 h-5" />
            </button>
            <NavContent onNavigate={() => setOpen(false)} />
          </div>
        </div>
      )}
    </>
  );
}
