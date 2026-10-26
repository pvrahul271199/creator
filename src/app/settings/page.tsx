import { Header } from "@/components/header";
import { getInvoiceProfileSettings } from "@/lib/data/api";
import { SettingsForm } from "@/components/settings/settings-form";
import { Sparkles, Lock, ArrowUpRight } from "lucide-react";
import { Instagram, Youtube } from "@/components/icons";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const settings = await getInvoiceProfileSettings();

  return (
    <div className="flex-1 flex flex-col min-h-screen">
      <Header
        title="Settings"
        subtitle="Creator profile, invoice defaults, and platform integrations"
      />

      <div className="p-4 sm:p-6 lg:p-8 max-w-5xl w-full mx-auto space-y-8">
        {/* Creator profile form */}
        <SettingsForm settings={settings} />

        {/* Platform Integrations Section */}
        <div className="p-6 rounded-[var(--radius-lg)] bg-[var(--surface)] border border-[var(--border)] space-y-5 text-xs">
          <div>
            <h3 className="font-semibold text-sm text-[var(--foreground)] flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-500" />
              Connected Social Accounts
            </h3>
            <p className="text-xs text-[var(--muted)]">
              Direct OAuth synchronization for automatic post metrics and engagement rate tracking
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Instagram Card */}
            <div className="p-4 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-2)]/50 relative overflow-hidden space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-white">
                    <Instagram className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-semibold text-sm text-[var(--foreground)] block">
                      Instagram Graph API
                    </span>
                    <span className="text-xs text-[var(--muted)] font-mono">Meta Verified</span>
                  </div>
                </div>

                <span className="px-2 py-0.5 rounded-[var(--radius-sm)] bg-amber-500/10 text-amber-600 border border-amber-500/20 text-xs font-mono uppercase font-medium">
                  Coming Soon
                </span>
              </div>

              <p className="text-xs text-[var(--muted)] leading-relaxed">
                Connect your Instagram Creator or Business account to sync follower counts, story
                impressions, reels reach, and automatic engagement calculations without manual data
                entry.
              </p>

              <div className="pt-2 border-t border-[var(--border)] flex items-center justify-between text-xs">
                <span className="text-[var(--muted)] flex items-center gap-1">
                  <Lock className="w-3 h-3" />
                  Manual logging active
                </span>
                <span className="text-[var(--muted)] italic">Awaiting Meta App Review</span>
              </div>
            </div>

            {/* YouTube Card */}
            <div className="p-4 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-2)]/50 relative overflow-hidden space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-red-600 flex items-center justify-center text-white">
                    <Youtube className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-semibold text-sm text-[var(--foreground)] block">
                      YouTube Analytics
                    </span>
                    <span className="text-xs text-[var(--muted)] font-mono">Google Cloud API</span>
                  </div>
                </div>

                <span className="px-2 py-0.5 rounded-[var(--radius-sm)] bg-zinc-500/10 text-zinc-600 border border-zinc-500/20 text-xs font-mono uppercase font-medium">
                  Coming Soon
                </span>
              </div>

              <p className="text-xs text-[var(--muted)] leading-relaxed">
                Sync long-form video views, watch time hours, shorts retention rates, and subscriber
                growth for brand sponsor reporting.
              </p>

              <div className="pt-2 border-t border-[var(--border)] flex items-center justify-between text-xs">
                <span className="text-[var(--muted)] flex items-center gap-1">
                  <Lock className="w-3 h-3" />
                  Planned roadmap
                </span>
                <span className="text-[var(--muted)] italic">Phase 2 release</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
