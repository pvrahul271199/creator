"use client";

import { useState, useMemo, useTransition } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { calculateInvoice } from "@/lib/invoice-calc";
import { formatMoney, formatDate, todayISO } from "@/lib/format";
import { actionSaveInvoice } from "@/app/actions";
import { CURRENCIES } from "@/lib/constants";
import type { Brand, Collaboration, InvoiceProfileSettings, Currency } from "@/lib/types";
import { InvoiceDocument } from "@/components/invoices/invoice-document";
import { Plus, Trash2, ArrowLeft, Check, Sparkles } from "lucide-react";

interface InvoiceBuilderProps {
  brands: Brand[];
  collaborations: Collaboration[];
  settings: InvoiceProfileSettings;
  defaultCollabId?: string;
}

interface ItemRow {
  id: string;
  description: string;
  quantity: number;
  unit_price: number;
}

export function InvoiceBuilder({
  brands,
  collaborations,
  settings,
  defaultCollabId,
}: InvoiceBuilderProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Find initial collaboration and brand if passed via query
  const initialCollab = defaultCollabId
    ? collaborations.find((c) => c.id === defaultCollabId)
    : null;
  const initialBrandId = initialCollab ? initialCollab.brand_id : brands[0]?.id || "";

  const [brandId, setBrandId] = useState<string>(initialBrandId);
  const [collaborationId, setCollaborationId] = useState<string>(defaultCollabId || "");

  const today = todayISO();
  const defaultDue = new Date();
  defaultDue.setDate(defaultDue.getDate() + 14);
  const defaultDueStr = defaultDue.toISOString().slice(0, 10);

  const [issueDate, setIssueDate] = useState<string>(today);
  const [dueDate, setDueDate] = useState<string>(defaultDueStr);
  const [deliveredOn, setDeliveredOn] = useState<string>(initialCollab?.end_date || today);
  const [currency, setCurrency] = useState<Currency>(initialCollab?.currency || "INR");
  const [paymentTerms, setPaymentTerms] = useState<string>("Net 14");
  const [referenceNumber, setReferenceNumber] = useState<string>("");

  const [discountType, setDiscountType] = useState<"percent" | "fixed">("percent");
  const [discountValue, setDiscountValue] = useState<number>(0);
  const [taxRate, setTaxRate] = useState<number>(18); // Default 18% GST

  const [paymentInstructions, setPaymentInstructions] = useState<string>(
    settings.default_payment_instructions || ""
  );
  const [notes, setNotes] = useState<string>(settings.default_notes || "");

  // Line items state
  const initialItems: ItemRow[] = initialCollab
    ? [
        {
          id: "item_1",
          description: `Deliverables for ${initialCollab.title}`,
          quantity: 1,
          unit_price: initialCollab.deal_amount,
        },
      ]
    : [
        {
          id: "item_1",
          description: "Sponsored Content Deliverables",
          quantity: 1,
          unit_price: 25000,
        },
      ];

  const [items, setItems] = useState<ItemRow[]>(initialItems);

  // Selected brand details
  const selectedBrand = useMemo(() => brands.find((b) => b.id === brandId), [brands, brandId]);

  // Recipient details
  const [recipientName, setRecipientName] = useState<string>(selectedBrand?.name || "");
  const [recipientEmail, setRecipientEmail] = useState<string>("");
  const [recipientAddress, setRecipientAddress] = useState<string>(selectedBrand?.address || "");
  const [recipientGstin, setRecipientGstin] = useState<string>(selectedBrand?.gstin || "");

  // Update recipient when brand changes
  const handleBrandChange = (newBrandId: string) => {
    setBrandId(newBrandId);
    const b = brands.find((item) => item.id === newBrandId);
    if (b) {
      setRecipientName(b.name);
      if (b.address) setRecipientAddress(b.address);
      if (b.gstin) setRecipientGstin(b.gstin);
    }
  };

  // Add line item
  const addItem = () => {
    setItems((prev) => [
      ...prev,
      {
        id: "item_" + Date.now(),
        description: "",
        quantity: 1,
        unit_price: 0,
      },
    ]);
  };

  // Remove line item
  const removeItem = (id: string) => {
    if (items.length <= 1) return;
    setItems((prev) => prev.filter((it) => it.id !== id));
  };

  // Update item
  const updateItem = (id: string, field: keyof ItemRow, value: any) => {
    setItems((prev) =>
      prev.map((it) => {
        if (it.id === id) {
          return { ...it, [field]: value };
        }
        return it;
      })
    );
  };

  // Calculate live totals
  const totals = useMemo(() => {
    return calculateInvoice(
      items.map((i) => ({ quantity: i.quantity, unit_price: i.unit_price })),
      discountType,
      discountValue,
      taxRate
    );
  }, [items, discountType, discountValue, taxRate]);

  // Handle Save
  const handleSave = () => {
    if (!brandId) {
      setError("Please select a brand");
      return;
    }
    if (items.some((i) => !i.description.trim())) {
      setError("All line items must have a description");
      return;
    }

    setError(null);
    startTransition(async () => {
      try {
        await actionSaveInvoice({
          brand_id: brandId,
          collaboration_id: collaborationId || null,
          issue_date: issueDate,
          due_date: dueDate || null,
          currency,
          payment_terms: paymentTerms,
          reference_number: referenceNumber,
          notes,
          payment_instructions: paymentInstructions,
          discount_type: discountType,
          discount_value: discountValue,
          tax_rate: taxRate,
          items: items.map((i) => ({
            description: i.description,
            quantity: i.quantity,
            unit_price: i.unit_price,
          })),
          sender: {
            name: settings.business_name,
            legal_name: settings.legal_name || settings.business_name,
            handle: settings.instagram_handle || undefined,
            address: settings.address || undefined,
            email: settings.email || undefined,
            phone: settings.phone || undefined,
            tax_id: settings.tax_registration_number || undefined,
            pan: settings.pan || undefined,
            instagram: settings.instagram_handle || undefined,
            gst_status: settings.gst_status || undefined,
            delivered_on: deliveredOn || undefined,
            bank: {
              account_holder: settings.bank_account_holder || settings.legal_name || settings.business_name,
              account_number: settings.bank_account_number || undefined,
              ifsc: settings.bank_ifsc || undefined,
              bank_name: settings.bank_name || undefined,
              branch: settings.bank_branch || undefined,
            },
          },
          recipient: {
            name: recipientName || selectedBrand?.name || "Client",
            address: recipientAddress || undefined,
            email: recipientEmail || undefined,
            tax_id: recipientGstin || undefined,
          },
        });
      } catch (err: any) {
        if (!err.message?.includes("NEXT_REDIRECT")) {
          setError(err.message || "Failed to save invoice");
        }
      }
    });
  };

  return (
    <div className="space-y-6">
      {error && (
        <div className="p-3 rounded-[var(--radius-md)] bg-rose-500/10 border border-rose-500/20 text-rose-600 text-xs">
          {error}
        </div>
      )}

      {/* Grid: Form on Left, Live Preview on Right */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
        {/* Left Form: 7 cols on XL */}
        <div className="xl:col-span-7 space-y-6 text-xs">
          {/* Card 1: Client & Collaboration */}
          <div className="p-5 rounded-[var(--radius-lg)] bg-[var(--surface)] border border-[var(--border)] space-y-4">
            <h3 className="text-sm font-semibold text-[var(--foreground)]">Client & Agreement</h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-medium text-[var(--foreground)] mb-1">Brand *</label>
                <select
                  value={brandId}
                  onChange={(e) => handleBrandChange(e.target.value)}
                  className="w-full h-9 px-2.5 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)]"
                >
                  <option value="">Select Brand</option>
                  {brands.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-medium text-[var(--foreground)] mb-1">
                  Link Collaboration (Optional)
                </label>
                <select
                  value={collaborationId}
                  onChange={(e) => setCollaborationId(e.target.value)}
                  className="w-full h-9 px-2.5 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)]"
                >
                  <option value="">None (Independent invoice)</option>
                  {collaborations
                    .filter((c) => !brandId || c.brand_id === brandId)
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.title}
                      </option>
                    ))}
                </select>
              </div>
            </div>

            {/* Recipient details override */}
            <div className="pt-2 border-t border-[var(--border)] grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs text-[var(--muted)] mb-1">Company / Recipient</label>
                <input
                  value={recipientName}
                  onChange={(e) => setRecipientName(e.target.value)}
                  placeholder="e.g. Acme Corp"
                  className="w-full h-8 px-2 rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface)] text-xs"
                />
              </div>
              <div>
                <label className="block text-xs text-[var(--muted)] mb-1">Recipient GSTIN</label>
                <input
                  value={recipientGstin}
                  onChange={(e) => setRecipientGstin(e.target.value.toUpperCase())}
                  placeholder="e.g. 29AAAAA0000A1Z5"
                  className="w-full h-8 px-2 rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface)] font-mono text-xs uppercase"
                />
              </div>
              <div>
                <label className="block text-xs text-[var(--muted)] mb-1">Recipient Email</label>
                <input
                  value={recipientEmail}
                  onChange={(e) => setRecipientEmail(e.target.value)}
                  placeholder="billing@brand.com"
                  className="w-full h-8 px-2 rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface)] text-xs"
                />
              </div>
              <div>
                <label className="block text-xs text-[var(--muted)] mb-1">Billing Address</label>
                <input
                  value={recipientAddress}
                  onChange={(e) => setRecipientAddress(e.target.value)}
                  placeholder="City, State"
                  className="w-full h-8 px-2 rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface)] text-xs"
                />
              </div>
            </div>
          </div>

          {/* Card 2: Dates, Currency, Terms */}
          <div className="p-5 rounded-[var(--radius-lg)] bg-[var(--surface)] border border-[var(--border)] space-y-4">
            <h3 className="text-sm font-semibold text-[var(--foreground)]">Invoice Parameters</h3>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              <div>
                <label className="block font-medium text-[var(--foreground)] mb-1">Issue Date</label>
                <input
                  type="date"
                  value={issueDate}
                  onChange={(e) => setIssueDate(e.target.value)}
                  className="w-full h-9 px-2 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] font-mono text-xs"
                />
              </div>
              <div>
                <label className="block font-medium text-[var(--foreground)] mb-1">Due Date</label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full h-9 px-2 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] font-mono text-xs"
                />
              </div>
              <div>
                <label className="block font-medium text-[var(--foreground)] mb-1">Delivered On</label>
                <input
                  type="date"
                  value={deliveredOn}
                  onChange={(e) => setDeliveredOn(e.target.value)}
                  className="w-full h-9 px-2 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] font-mono text-xs"
                />
              </div>
              <div>
                <label className="block font-medium text-[var(--foreground)] mb-1">Currency</label>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value as Currency)}
                  className="w-full h-9 px-2 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)]"
                >
                  {CURRENCIES.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block font-medium text-[var(--foreground)] mb-1">Terms</label>
                <input
                  value={paymentTerms}
                  onChange={(e) => setPaymentTerms(e.target.value)}
                  placeholder="e.g. Net 14"
                  className="w-full h-9 px-2 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)]"
                />
              </div>
            </div>
          </div>

          {/* Card 3: Line Items */}
          <div className="p-5 rounded-[var(--radius-lg)] bg-[var(--surface)] border border-[var(--border)] space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-[var(--foreground)]">Line Items</h3>
              <button
                type="button"
                onClick={addItem}
                className="inline-flex items-center gap-1 text-xs font-medium text-[var(--primary)] hover:underline"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Item</span>
              </button>
            </div>

            <div className="space-y-3">
              {items.map((item, idx) => {
                const rowTotal = item.quantity * item.unit_price;
                return (
                  <div
                    key={item.id}
                    className="p-3 rounded-[var(--radius-md)] bg-[var(--surface-2)]/60 border border-[var(--border)] space-y-2"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[var(--muted)] text-xs">#{idx + 1}</span>
                      <input
                        value={item.description}
                        onChange={(e) => updateItem(item.id, "description", e.target.value)}
                        placeholder="Deliverable description (e.g. Instagram Reel + 30 days usage)"
                        className="flex-1 h-8 px-2.5 rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)]"
                      />
                      {items.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeItem(item.id)}
                          className="text-[var(--muted)] hover:text-rose-500 p-1"
                          title="Remove item"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                      <div>
                        <label className="block text-xs text-[var(--muted)] mb-0.5">Quantity</label>
                        <input
                          type="number"
                          step="0.1"
                          min="0.1"
                          value={item.quantity}
                          onChange={(e) =>
                            updateItem(item.id, "quantity", parseFloat(e.target.value) || 0)
                          }
                          className="w-full h-7 px-2 rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface)] font-mono text-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-[var(--muted)] mb-0.5">
                          Unit Price ({currency})
                        </label>
                        <input
                          type="number"
                          step="1"
                          min="0"
                          value={item.unit_price}
                          onChange={(e) =>
                            updateItem(item.id, "unit_price", parseFloat(e.target.value) || 0)
                          }
                          className="w-full h-7 px-2 rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface)] font-mono text-xs"
                        />
                      </div>
                      <div className="text-right flex flex-col justify-end">
                        <span className="text-xs text-[var(--muted)]">Item Total</span>
                        <span className="font-mono font-medium tnum text-xs text-[var(--foreground)]">
                          {formatMoney(rowTotal, currency)}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Card 4: Discount & Tax */}
          <div className="p-5 rounded-[var(--radius-lg)] bg-[var(--surface)] border border-[var(--border)] space-y-4">
            <h3 className="text-sm font-semibold text-[var(--foreground)]">Adjustments</h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-medium text-[var(--foreground)] mb-1">Discount</label>
                <div className="flex gap-2">
                  <select
                    value={discountType}
                    onChange={(e) => setDiscountType(e.target.value as "percent" | "fixed")}
                    className="h-8 px-2 rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface)]"
                  >
                    <option value="percent">Percentage (%)</option>
                    <option value="fixed">Fixed ({currency})</option>
                  </select>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={discountValue}
                    onChange={(e) => setDiscountValue(parseFloat(e.target.value) || 0)}
                    placeholder="0"
                    className="flex-1 h-8 px-2 rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface)] font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-[var(--foreground)] mb-1">
                  Tax Rate (%) (e.g. 18% GST)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.5"
                  value={taxRate}
                  onChange={(e) => setTaxRate(parseFloat(e.target.value) || 0)}
                  className="w-full h-8 px-2.5 rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface)] font-mono"
                />
              </div>
            </div>
          </div>

          {/* Card 5: Payment Instructions & Notes */}
          <div className="p-5 rounded-[var(--radius-lg)] bg-[var(--surface)] border border-[var(--border)] space-y-4">
            <h3 className="text-sm font-semibold text-[var(--foreground)]">Payment & Terms</h3>

            <div>
              <label className="block font-medium text-[var(--foreground)] mb-1">
                Bank & Payment Instructions
              </label>
              <textarea
                rows={2}
                value={paymentInstructions}
                onChange={(e) => setPaymentInstructions(e.target.value)}
                placeholder="Bank name, Account #, IFSC, UPI ID"
                className="w-full p-2 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)]"
              />
            </div>

            <div>
              <label className="block font-medium text-[var(--foreground)] mb-1">Notes / Terms</label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Payment is due within 14 days of invoice date."
                className="w-full p-2 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)]"
              />
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <Link
              href="/invoices"
              className="px-4 py-2 rounded-[var(--radius-md)] border border-[var(--border)] text-[var(--muted)] hover:bg-[var(--surface-2)] font-medium"
            >
              Cancel
            </Link>
            <button
              onClick={handleSave}
              disabled={isPending}
              className="px-5 py-2 rounded-[var(--radius-md)] bg-[var(--primary)] text-[var(--primary-foreground)] font-medium hover:opacity-95 shadow-sm transition disabled:opacity-50"
            >
              {isPending ? "Creating Invoice..." : "Save Invoice Draft"}
            </button>
          </div>
        </div>

        {/* Right: Live Indian Creator Tax Invoice Preview: 5 cols on XL */}
        <div className="xl:col-span-5 sticky top-20">
          <div className="flex items-center justify-between pb-2 text-xs text-[var(--muted)]">
            <span className="font-medium flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[var(--primary)]" />
              Live Document Preview
            </span>
            <span className="text-xs uppercase font-mono">Prints clean</span>
          </div>

          <InvoiceDocument
            invoiceNumber="INV-DRAFT"
            issueDate={issueDate}
            dueDate={dueDate}
            paymentTerms={paymentTerms}
            currency={currency}
            status="draft"
            deliveredOn={deliveredOn}
            sender={{
              name: settings.business_name,
              legal_name: settings.legal_name || settings.business_name,
              handle: settings.instagram_handle || undefined,
              address: settings.address || undefined,
              email: settings.email || undefined,
              phone: settings.phone || undefined,
              tax_id: settings.tax_registration_number || undefined,
              pan: settings.pan || undefined,
              instagram: settings.instagram_handle || undefined,
              gst_status: settings.gst_status || undefined,
              delivered_on: deliveredOn || undefined,
              bank: {
                account_holder: settings.bank_account_holder || settings.legal_name || settings.business_name,
                account_number: settings.bank_account_number || undefined,
                ifsc: settings.bank_ifsc || undefined,
                bank_name: settings.bank_name || undefined,
                branch: settings.bank_branch || undefined,
              },
            }}
            recipient={{
              name: recipientName || selectedBrand?.name || "Client",
              address: recipientAddress || undefined,
              email: recipientEmail || undefined,
              tax_id: recipientGstin || undefined,
            }}
            items={items.map((i) => ({
              description: i.description,
              quantity: i.quantity,
              unit_price: i.unit_price,
              line_total: i.quantity * i.unit_price,
            }))}
            subtotal={totals.subtotal}
            discountType={discountType}
            discountValue={discountValue}
            discountAmount={totals.discount_amount}
            taxRate={taxRate}
            taxAmount={totals.tax_amount}
            totalAmount={totals.total}
            notes={notes}
            isDraft={true}
          />
        </div>
      </div>
    </div>
  );
}
