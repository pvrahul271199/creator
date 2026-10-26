import { format, formatDistanceToNowStrict, isValid, parseISO } from "date-fns";
import { CURRENCIES } from "@/lib/constants";
import type { Currency } from "@/lib/types";

export function formatMoney(amount: number | null | undefined, currency: Currency | string = "INR") {
  if (amount === null || amount === undefined || Number.isNaN(amount)) return "Unavailable";
  const locale = CURRENCIES.find((c) => c.code === currency)?.locale ?? "en-IN";
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/** Compact money for chart axes and dense figures: no decimals. */
export function formatMoneyShort(amount: number, currency: Currency | string = "INR") {
  const locale = CURRENCIES.find((c) => c.code === currency)?.locale ?? "en-IN";
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(amount);
}

export function formatNumber(n: number | null | undefined) {
  if (n === null || n === undefined) return "Unavailable";
  return new Intl.NumberFormat("en-IN").format(n);
}

export function formatPercent(n: number | null | undefined, digits = 1) {
  if (n === null || n === undefined || !Number.isFinite(n)) return "Unavailable";
  return `${n.toFixed(digits)}%`;
}

function toDate(value: string | Date) {
  return typeof value === "string" ? parseISO(value) : value;
}

/** Date-only strings (yyyy-mm-dd) and timestamps both format without timezone drift. */
export function formatDate(value: string | Date | null | undefined, fallback = "Not set") {
  if (!value) return fallback;
  const d = toDate(value);
  return isValid(d) ? format(d, "d MMM yyyy") : fallback;
}

export function formatDateTime(value: string | Date | null | undefined, fallback = "Not set") {
  if (!value) return fallback;
  const d = toDate(value);
  return isValid(d) ? format(d, "d MMM yyyy, h:mm a") : fallback;
}

export function formatRelative(value: string | Date | null | undefined) {
  if (!value) return "Unavailable";
  const d = toDate(value);
  return isValid(d) ? `${formatDistanceToNowStrict(d)} ago` : "Unavailable";
}

export function todayISO() {
  return format(new Date(), "yyyy-MM-dd");
}

/** Value for <input type="date"> from a date or timestamp. */
export function toDateInput(value: string | null | undefined) {
  if (!value) return "";
  const d = parseISO(value);
  return isValid(d) ? format(d, "yyyy-MM-dd") : "";
}
