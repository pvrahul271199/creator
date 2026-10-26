import React from "react";
import { formatMoney, formatDate } from "@/lib/format";
import type { Currency, PartyDetails } from "@/lib/types";

export interface InvoiceDocumentProps {
  invoiceNumber: string;
  issueDate: string;
  dueDate?: string | null;
  paymentTerms?: string | null;
  currency: Currency;
  status?: string;
  deliveredOn?: string | null;
  sender: PartyDetails;
  recipient: PartyDetails;
  items: Array<{
    description: string;
    quantity: number;
    unit_price: number;
    line_total?: number;
  }>;
  subtotal: number;
  discountType?: "percent" | "fixed";
  discountValue?: number;
  discountAmount?: number;
  taxRate?: number;
  taxAmount?: number;
  totalAmount: number;
  paidAmount?: number;
  balanceDue?: number;
  notes?: string | null;
  terms?: string | null;
  isDraft?: boolean;
}

export function InvoiceDocument({
  invoiceNumber,
  issueDate,
  dueDate,
  paymentTerms,
  currency,
  status,
  deliveredOn,
  sender,
  recipient,
  items,
  subtotal,
  discountAmount = 0,
  taxRate = 0,
  taxAmount = 0,
  totalAmount,
  paidAmount = 0,
  balanceDue,
  notes,
  terms,
  isDraft = false,
}: InvoiceDocumentProps) {
  const businessName = sender.name || "Creator Studio";
  const creatorName = sender.legal_name || sender.name || "Creator";
  const creatorHandle =
    sender.handle ||
    sender.instagram ||
    (sender.name ? `@${sender.name.toLowerCase().replace(/\s+/g, "")}` : "");

  const bank = sender.bank || {};
  const bankAccountHolder = bank.account_holder || sender.legal_name || sender.name || "—";
  const bankAccountNumber = bank.account_number || "—";
  const bankIfsc = bank.ifsc || "—";
  const bankName = bank.bank_name || "—";
  const bankBranch = bank.branch || "—";
  const pan = sender.pan || "—";
  const gstStatus =
    sender.gst_status ||
    (sender.tax_id ? `GSTIN: ${sender.tax_id}` : "Not registered for GST (under threshold limit)");

  // Default declarations for creator invoice
  const declarations = [
    "I declare that this invoice shows the actual price of the services described and that all particulars are true and correct.",
    gstStatus.toLowerCase().includes("not registered")
      ? "I am not registered under GST as my aggregate annual turnover does not exceed the threshold limit under Section 22 of the CGST Act, 2017."
      : "Applicable GST has been charged as per statutory guidelines.",
    gstStatus.toLowerCase().includes("not registered")
      ? "No GST is charged on this invoice pursuant to the GST exemption for unregistered suppliers."
      : "GST input tax credit can be claimed against the GSTIN mentioned above.",
    "TDS may be deducted as applicable under Section 194J/194C of the Income Tax Act, 1961. Please furnish Form 16A TDS certificate.",
    "The payment shall be credited exclusively to the bank account specified above in the name of the payee.",
    "Any dispute arising in relation to this invoice is subject to the exclusive jurisdiction of the competent courts.",
  ];

  return (
    <div className="invoice-document paper bg-white text-zinc-900 border border-zinc-200 rounded-[var(--radius-lg)] p-8 sm:p-12 shadow-sm text-xs leading-relaxed max-w-[820px] mx-auto print:border-0 print:shadow-none print:p-0 print:max-w-none">
      {/* 1. Header: Clean Monochrome / Neutral */}
      <div className="flex justify-between items-start border-b border-zinc-200 pb-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-zinc-900">
            {businessName}
          </h2>
          <div className="text-xs text-zinc-600 mt-1 flex items-center gap-1.5 flex-wrap">
            <span className="font-semibold text-zinc-800">{creatorName}</span>
            {creatorHandle && <span className="text-zinc-400">|</span>}
            {creatorHandle && <span>{creatorHandle}</span>}
          </div>
          {sender.address && (
            <p className="text-xs text-zinc-600 mt-1 whitespace-pre-line leading-relaxed">
              {sender.address}
            </p>
          )}
          <div className="text-xs text-zinc-600 mt-0.5 space-x-2">
            {sender.email && <span>{sender.email}</span>}
            {sender.phone && <span>• {sender.phone}</span>}
          </div>
        </div>

        <div className="text-right">
          <span className="text-2xl font-extrabold tracking-wider text-zinc-900 block font-mono">
            TAX INVOICE
          </span>
          <span className="font-mono text-sm font-semibold text-zinc-700 block mt-1">
            {invoiceNumber}
          </span>
          {status && (
            <span className="inline-block px-2 py-0.5 rounded border border-zinc-300 text-[11px] uppercase font-mono tracking-wider mt-2 bg-zinc-50 text-zinc-700">
              {status.replace("_", " ")}
            </span>
          )}
        </div>
      </div>

      {/* 2. Metadata Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 py-4 border-b border-zinc-200 text-xs">
        <div>
          <span className="block text-[10px] uppercase font-semibold text-zinc-500 tracking-wider">
            Invoice Number
          </span>
          <span className="font-mono font-bold text-zinc-900 text-xs block mt-0.5">
            {invoiceNumber}
          </span>
        </div>

        <div>
          <span className="block text-[10px] uppercase font-semibold text-zinc-500 tracking-wider">
            Invoice Date
          </span>
          <span className="text-zinc-900 font-medium block mt-0.5">
            {formatDate(issueDate)}
          </span>
        </div>

        <div>
          <span className="block text-[10px] uppercase font-semibold text-zinc-500 tracking-wider">
            Payment Due
          </span>
          <span className="text-zinc-900 font-medium block mt-0.5">
            {dueDate ? formatDate(dueDate) : "On Receipt"}
          </span>
        </div>

        <div>
          <span className="block text-[10px] uppercase font-semibold text-zinc-500 tracking-wider">
            Payment Terms
          </span>
          <span className="text-zinc-900 font-medium block mt-0.5">
            {paymentTerms || "Net 30"}
          </span>
        </div>

        <div className="col-span-2 sm:col-span-1">
          <span className="block text-[10px] uppercase font-semibold text-zinc-500 tracking-wider">
            Delivered On
          </span>
          <span className="text-zinc-900 font-medium block mt-0.5">
            {deliveredOn ? formatDate(deliveredOn) : "—"}
          </span>
        </div>
      </div>

      {/* 3. Billed From & Billed To */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 py-6 border-b border-zinc-200 text-xs">
        {/* Bill From */}
        <div>
          <span className="text-xs uppercase tracking-wider font-semibold text-zinc-500 block mb-2">
            Bill From
          </span>
          <div className="space-y-1.5 text-xs text-zinc-800">
            <div className="flex justify-between sm:justify-start sm:gap-2">
              <span className="text-zinc-500 w-32 flex-none">Full Name (PAN):</span>
              <span className="font-semibold text-zinc-900">{creatorName}</span>
            </div>
            {pan && pan !== "—" && (
              <div className="flex justify-between sm:justify-start sm:gap-2 font-mono">
                <span className="text-zinc-500 w-32 flex-none font-sans">PAN:</span>
                <span className="font-semibold text-zinc-900">{pan}</span>
              </div>
            )}
            {sender.address && (
              <div className="flex justify-between sm:justify-start sm:gap-2">
                <span className="text-zinc-500 w-32 flex-none">Address:</span>
                <span className="text-zinc-800 whitespace-pre-line">{sender.address}</span>
              </div>
            )}
            {sender.phone && (
              <div className="flex justify-between sm:justify-start sm:gap-2">
                <span className="text-zinc-500 w-32 flex-none">Phone:</span>
                <span>{sender.phone}</span>
              </div>
            )}
            {sender.email && (
              <div className="flex justify-between sm:justify-start sm:gap-2">
                <span className="text-zinc-500 w-32 flex-none">Email:</span>
                <span>{sender.email}</span>
              </div>
            )}
            {creatorHandle && (
              <div className="flex justify-between sm:justify-start sm:gap-2">
                <span className="text-zinc-500 w-32 flex-none">Instagram:</span>
                <span className="font-medium text-zinc-900">{creatorHandle}</span>
              </div>
            )}
            <div className="flex justify-between sm:justify-start sm:gap-2">
              <span className="text-zinc-500 w-32 flex-none">GST Status:</span>
              <span className="text-zinc-700 italic">{gstStatus}</span>
            </div>
          </div>
        </div>

        {/* Bill To */}
        <div>
          <span className="text-xs uppercase tracking-wider font-semibold text-zinc-500 block mb-2">
            Billed To
          </span>
          <div className="space-y-1.5 text-xs text-zinc-800">
            <div className="flex justify-between sm:justify-start sm:gap-2">
              <span className="text-zinc-500 w-24 flex-none">Company:</span>
              <span className="font-bold text-zinc-900 text-sm">
                {recipient.name || "Client Name"}
              </span>
            </div>
            {recipient.tax_id && (
              <div className="flex justify-between sm:justify-start sm:gap-2 font-mono">
                <span className="text-zinc-500 w-24 flex-none font-sans">GSTIN:</span>
                <span className="font-semibold text-zinc-900">{recipient.tax_id}</span>
              </div>
            )}
            {recipient.address && (
              <div className="flex justify-between sm:justify-start sm:gap-2">
                <span className="text-zinc-500 w-24 flex-none">Address:</span>
                <span className="text-zinc-800 whitespace-pre-line">{recipient.address}</span>
              </div>
            )}
            {recipient.contact && (
              <div className="flex justify-between sm:justify-start sm:gap-2">
                <span className="text-zinc-500 w-24 flex-none">Attention:</span>
                <span>{recipient.contact}</span>
              </div>
            )}
            {recipient.email && (
              <div className="flex justify-between sm:justify-start sm:gap-2">
                <span className="text-zinc-500 w-24 flex-none">Email:</span>
                <span>{recipient.email}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 4. Description of Services & Itemized Table */}
      <div className="py-6 border-b border-zinc-200">
        <span className="text-xs uppercase tracking-wider font-semibold text-zinc-500 block mb-3">
          Description of Services
        </span>

        <div className="border border-zinc-200 rounded-md overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-zinc-50 text-zinc-700 border-b border-zinc-200 font-semibold">
                <th className="py-2.5 px-4 text-left">Description</th>
                <th className="py-2.5 px-4 text-right w-36">Amount ({currency})</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200">
              {items.map((it, idx) => (
                <tr key={idx} className={idx % 2 === 1 ? "bg-zinc-50/50" : "bg-white"}>
                  <td className="py-3 px-4 text-zinc-900">
                    <div className="font-medium leading-relaxed">
                      {it.description || <span className="text-zinc-400 italic">Deliverable description</span>}
                    </div>
                    {it.quantity > 1 && (
                      <div className="text-[11px] text-zinc-500 mt-0.5">
                        Qty: {it.quantity} × {formatMoney(it.unit_price, currency)}
                      </div>
                    )}
                  </td>
                  <td className="py-3 px-4 text-right font-mono font-semibold text-zinc-900">
                    {formatMoney(it.line_total ?? it.quantity * it.unit_price, currency)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              {discountAmount > 0 && (
                <tr className="border-t border-zinc-200 text-xs">
                  <td className="py-2 px-4 text-right text-emerald-700 font-medium">Discount</td>
                  <td className="py-2 px-4 text-right font-mono text-emerald-700 font-medium">
                    -{formatMoney(discountAmount, currency)}
                  </td>
                </tr>
              )}
              {taxAmount > 0 && (
                <tr className="border-t border-zinc-200 text-xs">
                  <td className="py-2 px-4 text-right text-zinc-600">GST / Tax ({taxRate}%)</td>
                  <td className="py-2 px-4 text-right font-mono text-zinc-900">
                    {formatMoney(taxAmount, currency)}
                  </td>
                </tr>
              )}
              <tr className="border-t-2 border-zinc-900 bg-zinc-50/70">
                <td className="py-3 px-4 font-bold text-sm tracking-wider uppercase text-zinc-900">
                  TOTAL AMOUNT
                </td>
                <td className="py-3 px-4 text-right font-mono text-base font-extrabold tracking-tight text-zinc-900">
                  {formatMoney(totalAmount, currency)}
                </td>
              </tr>
              {paidAmount > 0 && (
                <>
                  <tr className="border-t border-zinc-200 text-xs">
                    <td className="py-1.5 px-4 text-right text-emerald-700 font-medium">
                      Amount Paid
                    </td>
                    <td className="py-1.5 px-4 text-right font-mono text-emerald-700 font-medium">
                      {formatMoney(paidAmount, currency)}
                    </td>
                  </tr>
                  <tr className="border-t border-zinc-200 text-xs font-bold">
                    <td className="py-2 px-4 text-right text-zinc-900">Balance Due</td>
                    <td className="py-2 px-4 text-right font-mono text-rose-700">
                      {formatMoney(balanceDue ?? Math.max(0, totalAmount - paidAmount), currency)}
                    </td>
                  </tr>
                </>
              )}
            </tfoot>
          </table>
        </div>
      </div>

      {/* 5. Payee's Bank Account Details */}
      <div className="py-6 border-b border-zinc-200">
        <div className="flex items-baseline gap-2 mb-3">
          <span className="text-xs uppercase tracking-wider font-semibold text-zinc-500">
            Payee&apos;s Bank Account Details
          </span>
          <span className="text-[11px] text-zinc-500 italic">
            (Must match the Bill From details above)
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-1.5 text-xs text-zinc-800 border border-zinc-200 rounded-md p-3.5 bg-zinc-50/50 print:bg-transparent">
          <div className="flex justify-between sm:justify-start sm:gap-2">
            <span className="text-zinc-500 w-36 flex-none">Account Holder Name:</span>
            <span className="font-semibold text-zinc-900">{bankAccountHolder}</span>
          </div>
          <div className="flex justify-between sm:justify-start sm:gap-2 font-mono">
            <span className="text-zinc-500 w-36 flex-none font-sans">Account Number:</span>
            <span className="font-semibold text-zinc-900">{bankAccountNumber}</span>
          </div>
          <div className="flex justify-between sm:justify-start sm:gap-2 font-mono">
            <span className="text-zinc-500 w-36 flex-none font-sans">IFSC Code:</span>
            <span className="font-semibold text-zinc-900">{bankIfsc}</span>
          </div>
          <div className="flex justify-between sm:justify-start sm:gap-2">
            <span className="text-zinc-500 w-36 flex-none">Bank Name:</span>
            <span className="text-zinc-800">{bankName}</span>
          </div>
          <div className="flex justify-between sm:justify-start sm:gap-2">
            <span className="text-zinc-500 w-36 flex-none">Branch Name:</span>
            <span className="text-zinc-800">{bankBranch}</span>
          </div>
          <div className="flex justify-between sm:justify-start sm:gap-2 font-mono">
            <span className="text-zinc-500 w-36 flex-none font-sans">PAN:</span>
            <span className="font-semibold text-zinc-900">{pan}</span>
          </div>
        </div>
      </div>

      {/* 6. Declaration */}
      <div className="py-6 border-b border-zinc-200">
        <span className="text-xs uppercase tracking-wider font-semibold text-zinc-500 block mb-2.5">
          Declaration
        </span>

        <ol className="list-decimal list-inside space-y-1 text-[11px] text-zinc-600 leading-relaxed">
          {declarations.map((d, i) => (
            <li key={i} className="pl-1">
              <span>{d}</span>
            </li>
          ))}
        </ol>
      </div>

      {/* 7. Signature & Notes */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-end pt-6">
        <div>
          {notes && (
            <div className="text-[11px] text-zinc-600">
              <span className="font-semibold text-zinc-800 block mb-0.5">Notes:</span>
              <p className="whitespace-pre-line">{notes}</p>
            </div>
          )}
        </div>

        <div className="sm:text-right">
          <span className="text-xs uppercase tracking-wider font-semibold text-zinc-500 block mb-2">
            Signature
          </span>
          <div className="text-sm font-semibold text-zinc-900 py-1">
            {creatorName}
          </div>
          <p className="text-[10px] text-zinc-500 italic mt-0.5">
            This is a system generated invoice and requires no physical signature.
          </p>
        </div>
      </div>
    </div>
  );
}
