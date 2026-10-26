import { Header } from "@/components/header";
import { getBrands, getCollaborations, getInvoiceProfileSettings } from "@/lib/data/api";
import { InvoiceBuilder } from "@/components/invoices/invoice-builder";

export const dynamic = "force-dynamic";

export default async function NewInvoicePage({
  searchParams,
}: {
  searchParams: Promise<{ collabId?: string }>;
}) {
  const params = await searchParams;
  const [brands, collaborations, settings] = await Promise.all([
    getBrands(),
    getCollaborations(),
    getInvoiceProfileSettings(),
  ]);

  return (
    <div className="flex-1 flex flex-col min-h-screen">
      <Header
        title="Create Invoice"
        subtitle="Itemized commercial billing with live A4 document preview"
      />

      <div className="p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
        <InvoiceBuilder
          brands={brands}
          collaborations={collaborations}
          settings={settings}
          defaultCollabId={params.collabId}
        />
      </div>
    </div>
  );
}
