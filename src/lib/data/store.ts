import fs from "fs";
import path from "path";
import {
  initialBrands,
  initialContacts,
  initialCollaborations,
  initialTasks,
  initialInvoices,
  initialInvoiceItems,
  initialPayments,
  initialActivityEvents,
  initialInvoiceSettings,
  initialCreatorSnapshots,
  initialSponsoredPosts,
  initialPostSnapshots,
} from "./initial-data";
import type {
  Brand,
  BrandContact,
  Collaboration,
  Task,
  Invoice,
  InvoiceItem,
  Payment,
  ActivityEvent,
  InvoiceProfileSettings,
  CreatorSnapshot,
  SponsoredPost,
  PostSnapshot,
} from "@/lib/types";

interface StorageSchema {
  brands: Brand[];
  contacts: BrandContact[];
  collaborations: Collaboration[];
  tasks: Task[];
  invoices: Invoice[];
  invoiceItems: InvoiceItem[];
  payments: Payment[];
  activityEvents: ActivityEvent[];
  invoiceSettings: InvoiceProfileSettings;
  creatorSnapshots: CreatorSnapshot[];
  sponsoredPosts: SponsoredPost[];
  postSnapshots: PostSnapshot[];
  invoiceCounter: number;
}

const DATA_FILE = path.join(process.cwd(), ".boardroom-data.json");

function getDefaultState(): StorageSchema {
  return {
    brands: [...initialBrands],
    contacts: [...initialContacts],
    collaborations: [...initialCollaborations],
    tasks: [...initialTasks],
    invoices: [...initialInvoices],
    invoiceItems: [...initialInvoiceItems],
    payments: [...initialPayments],
    activityEvents: [...initialActivityEvents],
    invoiceSettings: { ...initialInvoiceSettings },
    creatorSnapshots: [...initialCreatorSnapshots],
    sponsoredPosts: [...initialSponsoredPosts],
    postSnapshots: [...initialPostSnapshots],
    invoiceCounter: 2,
  };
}

export function readStore(): StorageSchema {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const raw = fs.readFileSync(DATA_FILE, "utf-8");
      return JSON.parse(raw);
    }
  } catch (err) {
    console.error("Failed to read .boardroom-data.json, resetting to default state", err);
  }
  const defaults = getDefaultState();
  writeStore(defaults);
  return defaults;
}

export function writeStore(data: StorageSchema): void {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), "utf-8");
  } catch (err) {
    console.error("Failed to write to .boardroom-data.json", err);
  }
}
