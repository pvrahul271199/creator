"use client";

import { useState, useTransition } from "react";
import { actionUpdateSettings } from "@/app/actions";
import type { InvoiceProfileSettings } from "@/lib/types";
import { Check, Building2, Save, CreditCard, FileText } from "lucide-react";

interface SettingsFormProps {
  settings: InvoiceProfileSettings;
}

export function SettingsForm({ settings }: SettingsFormProps) {
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  const handleSubmit = (formData: FormData) => {
    setSaved(false);
    startTransition(async () => {
      await actionUpdateSettings(formData);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    });
  };

  return (
    <form action={handleSubmit} className="space-y-6 text-xs max-w-4xl">
      {/* 1. Creator & Brand Identity */}
      <div className="p-6 rounded-[var(--radius-lg)] bg-[var(--surface)] border border-[var(--border)] space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-[var(--border)]">
          <div>
            <h3 className="font-semibold text-sm text-[var(--foreground)] flex items-center gap-2">
              <Building2 className="w-4 h-4 text-[var(--primary)]" />
              Creator & Billing Identity
            </h3>
            <p className="text-xs text-[var(--muted)]">
              This information automatically populates the header, &ldquo;Bill From&rdquo;, and signature on your tax invoices
            </p>
          </div>

          {saved && (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-[var(--cash)] bg-emerald-500/10 px-2 py-0.5 rounded-[var(--radius-sm)] border border-emerald-500/20">
              <Check className="w-3 h-3" />
              Saved!
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block font-medium text-[var(--foreground)] mb-1">
              Brand / Business Name *
            </label>
            <input
              name="business_name"
              required
              defaultValue={settings.business_name}
              placeholder="e.g. Aanya Studios"
              className="w-full h-9 px-3 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)]"
            />
          </div>

          <div>
            <label className="block font-medium text-[var(--foreground)] mb-1">
              Full Legal Name (as per PAN) *
            </label>
            <input
              name="legal_name"
              defaultValue={settings.legal_name || settings.business_name}
              placeholder="e.g. Aanya Sharma"
              className="w-full h-9 px-3 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)]"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block font-medium text-[var(--foreground)] mb-1">
              PAN Number
            </label>
            <input
              name="pan"
              defaultValue={settings.pan || ""}
              placeholder="e.g. ABCPS1234F"
              className="w-full h-9 px-3 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] font-mono text-xs text-[var(--foreground)] uppercase"
            />
          </div>

          <div>
            <label className="block font-medium text-[var(--foreground)] mb-1">
              Instagram Handle
            </label>
            <input
              name="instagram_handle"
              defaultValue={settings.instagram_handle || ""}
              placeholder="e.g. @aanyastudios"
              className="w-full h-9 px-3 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)]"
            />
          </div>

          <div>
            <label className="block font-medium text-[var(--foreground)] mb-1">
              GST Status
            </label>
            <input
              name="gst_status"
              defaultValue={settings.gst_status || "Not registered for GST (under threshold limit)"}
              placeholder="e.g. Not registered for GST"
              className="w-full h-9 px-3 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)]"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block font-medium text-[var(--foreground)] mb-1">Business Email</label>
            <input
              name="email"
              type="email"
              defaultValue={settings.email || ""}
              placeholder="contact@creator.com"
              className="w-full h-9 px-3 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)]"
            />
          </div>

          <div>
            <label className="block font-medium text-[var(--foreground)] mb-1">Phone Number</label>
            <input
              name="phone"
              defaultValue={settings.phone || ""}
              placeholder="+91 98765 43210"
              className="w-full h-9 px-3 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)]"
            />
          </div>

          <div>
            <label className="block font-medium text-[var(--foreground)] mb-1">
              GSTIN (if registered)
            </label>
            <input
              name="tax_registration_number"
              defaultValue={settings.tax_registration_number || ""}
              placeholder="e.g. 27ABCDE1234F1Z5"
              className="w-full h-9 px-3 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] font-mono text-xs text-[var(--foreground)] uppercase"
            />
          </div>
        </div>

        <div>
          <label className="block font-medium text-[var(--foreground)] mb-1">Billing Address</label>
          <textarea
            name="address"
            rows={2}
            defaultValue={settings.address || ""}
            placeholder="Studio address or registered personal address"
            className="w-full p-2.5 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)]"
          />
        </div>
      </div>

      {/* 2. Bank Account Details for Invoices */}
      <div className="p-6 rounded-[var(--radius-lg)] bg-[var(--surface)] border border-[var(--border)] space-y-4">
        <div className="pb-3 border-b border-[var(--border)]">
          <h3 className="font-semibold text-sm text-[var(--foreground)] flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-[var(--primary)]" />
            Payee&apos;s Bank Account Details
          </h3>
          <p className="text-xs text-[var(--muted)]">
            Prints on the invoice under &ldquo;Payee&apos;s Bank Account Details&rdquo; so clients know where to send payments
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block font-medium text-[var(--foreground)] mb-1">
              Account Holder Name *
            </label>
            <input
              name="bank_account_holder"
              defaultValue={settings.bank_account_holder || settings.legal_name || settings.business_name}
              placeholder="Must match Bill From name"
              className="w-full h-9 px-3 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)]"
            />
          </div>

          <div>
            <label className="block font-medium text-[var(--foreground)] mb-1">
              Bank Name
            </label>
            <input
              name="bank_name"
              defaultValue={settings.bank_name || ""}
              placeholder="e.g. HDFC Bank, ICICI Bank, SBI"
              className="w-full h-9 px-3 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)]"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block font-medium text-[var(--foreground)] mb-1">
              Account Number
            </label>
            <input
              name="bank_account_number"
              defaultValue={settings.bank_account_number || ""}
              placeholder="e.g. 50200012345678"
              className="w-full h-9 px-3 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] font-mono text-xs text-[var(--foreground)]"
            />
          </div>

          <div>
            <label className="block font-medium text-[var(--foreground)] mb-1">
              IFSC Code
            </label>
            <input
              name="bank_ifsc"
              defaultValue={settings.bank_ifsc || ""}
              placeholder="e.g. HDFC0000123"
              className="w-full h-9 px-3 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] font-mono text-xs text-[var(--foreground)] uppercase"
            />
          </div>

          <div>
            <label className="block font-medium text-[var(--foreground)] mb-1">
              Branch Name
            </label>
            <input
              name="bank_branch"
              defaultValue={settings.bank_branch || ""}
              placeholder="e.g. Bandra West, Mumbai"
              className="w-full h-9 px-3 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)]"
            />
          </div>
        </div>
      </div>

      {/* 3. Additional Defaults & Terms */}
      <div className="p-6 rounded-[var(--radius-lg)] bg-[var(--surface)] border border-[var(--border)] space-y-4">
        <div className="pb-3 border-b border-[var(--border)]">
          <h3 className="font-semibold text-sm text-[var(--foreground)] flex items-center gap-2">
            <FileText className="w-4 h-4 text-[var(--primary)]" />
            Default Notes & Instructions
          </h3>
          <p className="text-xs text-[var(--muted)]">
            Pre-fills onto all new invoices to save time
          </p>
        </div>

        <div>
          <label className="block font-medium text-[var(--foreground)] mb-1">
            Payment Instructions (UPI / Wire text)
          </label>
          <textarea
            name="default_payment_instructions"
            rows={2}
            defaultValue={settings.default_payment_instructions || ""}
            placeholder="UPI: creator@upi or payment reference guidelines"
            className="w-full p-2.5 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] font-mono text-xs"
          />
        </div>

        <div>
          <label className="block font-medium text-[var(--foreground)] mb-1">
            Default Notes
          </label>
          <textarea
            name="default_notes"
            rows={2}
            defaultValue={settings.default_notes || ""}
            placeholder="Thank you for collaborating! For any questions, please contact creator@example.com"
            className="w-full p-2.5 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)]"
          />
        </div>

        <div className="flex justify-end pt-3 border-t border-[var(--border)]">
          <button
            type="submit"
            disabled={isPending}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-[var(--radius-md)] bg-[var(--primary)] text-[var(--primary-foreground)] font-medium hover:opacity-95 shadow-sm transition disabled:opacity-50"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{isPending ? "Saving..." : "Save Profile Settings"}</span>
          </button>
        </div>
      </div>
    </form>
  );
}
