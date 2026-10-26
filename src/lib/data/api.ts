/**
 * Data facade. Pages and actions import from here; the backend is chosen at runtime:
 * Supabase when NEXT_PUBLIC_SUPABASE_URL and a key are set, otherwise the local JSON demo store.
 * api-supabase.ts must stay type-compatible with api-local.ts (enforced by the casts below).
 */
import { hasSupabaseEnv } from "@/lib/supabase/config";
import * as local from "./api-local";
import * as remote from "./api-supabase";

const impl = (): typeof local => (hasSupabaseEnv() ? (remote as typeof local) : local);

export const getBrands: typeof local.getBrands = (...args: Parameters<typeof local.getBrands>) =>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (impl().getBrands as any)(...args);

export const getBrandById: typeof local.getBrandById = (...args: Parameters<typeof local.getBrandById>) =>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (impl().getBrandById as any)(...args);

export const createBrand: typeof local.createBrand = (...args: Parameters<typeof local.createBrand>) =>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (impl().createBrand as any)(...args);

export const updateBrand: typeof local.updateBrand = (...args: Parameters<typeof local.updateBrand>) =>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (impl().updateBrand as any)(...args);

export const createBrandContact: typeof local.createBrandContact = (...args: Parameters<typeof local.createBrandContact>) =>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (impl().createBrandContact as any)(...args);

export const deleteBrandContact: typeof local.deleteBrandContact = (...args: Parameters<typeof local.deleteBrandContact>) =>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (impl().deleteBrandContact as any)(...args);

export const getCollaborations: typeof local.getCollaborations = (...args: Parameters<typeof local.getCollaborations>) =>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (impl().getCollaborations as any)(...args);

export const getCollaborationById: typeof local.getCollaborationById = (...args: Parameters<typeof local.getCollaborationById>) =>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (impl().getCollaborationById as any)(...args);

export const createCollaboration: typeof local.createCollaboration = (...args: Parameters<typeof local.createCollaboration>) =>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (impl().createCollaboration as any)(...args);

export const updateCollaboration: typeof local.updateCollaboration = (...args: Parameters<typeof local.updateCollaboration>) =>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (impl().updateCollaboration as any)(...args);

export const getTasks: typeof local.getTasks = (...args: Parameters<typeof local.getTasks>) =>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (impl().getTasks as any)(...args);

export const createTask: typeof local.createTask = (...args: Parameters<typeof local.createTask>) =>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (impl().createTask as any)(...args);

export const toggleTaskStatus: typeof local.toggleTaskStatus = (...args: Parameters<typeof local.toggleTaskStatus>) =>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (impl().toggleTaskStatus as any)(...args);

export const deleteTask: typeof local.deleteTask = (...args: Parameters<typeof local.deleteTask>) =>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (impl().deleteTask as any)(...args);

export const getInvoices: typeof local.getInvoices = (...args: Parameters<typeof local.getInvoices>) =>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (impl().getInvoices as any)(...args);

export const getInvoiceById: typeof local.getInvoiceById = (...args: Parameters<typeof local.getInvoiceById>) =>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (impl().getInvoiceById as any)(...args);

export const saveInvoiceData: typeof local.saveInvoiceData = (...args: Parameters<typeof local.saveInvoiceData>) =>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (impl().saveInvoiceData as any)(...args);

export const issueInvoice: typeof local.issueInvoice = (...args: Parameters<typeof local.issueInvoice>) =>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (impl().issueInvoice as any)(...args);

export const cancelInvoice: typeof local.cancelInvoice = (...args: Parameters<typeof local.cancelInvoice>) =>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (impl().cancelInvoice as any)(...args);

export const getPayments: typeof local.getPayments = (...args: Parameters<typeof local.getPayments>) =>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (impl().getPayments as any)(...args);

export const recordPayment: typeof local.recordPayment = (...args: Parameters<typeof local.recordPayment>) =>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (impl().recordPayment as any)(...args);

export const deletePayment: typeof local.deletePayment = (...args: Parameters<typeof local.deletePayment>) =>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (impl().deletePayment as any)(...args);

export const getInvoiceProfileSettings: typeof local.getInvoiceProfileSettings = (...args: Parameters<typeof local.getInvoiceProfileSettings>) =>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (impl().getInvoiceProfileSettings as any)(...args);

export const updateInvoiceProfileSettings: typeof local.updateInvoiceProfileSettings = (...args: Parameters<typeof local.updateInvoiceProfileSettings>) =>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (impl().updateInvoiceProfileSettings as any)(...args);

export const createSponsoredPost: typeof local.createSponsoredPost = (...args: Parameters<typeof local.createSponsoredPost>) =>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (impl().createSponsoredPost as any)(...args);

export const addPostSnapshot: typeof local.addPostSnapshot = (...args: Parameters<typeof local.addPostSnapshot>) =>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (impl().addPostSnapshot as any)(...args);

