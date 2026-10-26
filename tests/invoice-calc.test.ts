import test from "node:test";
import assert from "node:assert/strict";
import {
  lineTotal,
  calculateInvoice,
  balanceDue,
  wouldOverpay,
  statusAfterPayments,
  effectiveStatus,
} from "../src/lib/invoice-calc";

test("lineTotal calculates exact multiplication with rounding", () => {
  // 1 * 100 = 100
  assert.equal(lineTotal(1, 100), 100);
  // 2.5 * 1000 = 2500
  assert.equal(lineTotal(2.5, 1000), 2500);
  // fractional rounding
  assert.equal(lineTotal(3, 33.33), 99.99);
});

test("calculateInvoice computes subtotal, percentage discount, and tax accurately", () => {
  const items = [
    { quantity: 2, unit_price: 50000 }, // 100,000
    { quantity: 1, unit_price: 25000 }, // 25,000
  ];
  // Subtotal = 125,000
  // Discount = 10% = 12,500
  // Taxable = 112,500
  // Tax = 18% of 112,500 = 20,250
  // Total = 132,750
  const totals = calculateInvoice(items, "percent", 10, 18);

  assert.equal(totals.subtotal, 125000);
  assert.equal(totals.discount_amount, 12500);
  assert.equal(totals.tax_amount, 20250);
  assert.equal(totals.total, 132750);
});

test("calculateInvoice handles fixed discount", () => {
  const items = [{ quantity: 1, unit_price: 10000 }];
  // Subtotal = 10,000
  // Fixed discount = 2,000
  // Taxable = 8,000
  // Tax = 0%
  // Total = 8,000
  const totals = calculateInvoice(items, "fixed", 2000, 0);

  assert.equal(totals.subtotal, 10000);
  assert.equal(totals.discount_amount, 2000);
  assert.equal(totals.tax_amount, 0);
  assert.equal(totals.total, 8000);
});

test("balanceDue calculates outstanding amount safely", () => {
  assert.equal(balanceDue(10000, 4000), 6000);
  assert.equal(balanceDue(10000, 10000), 0);
  assert.equal(balanceDue(10000, 12000), 0); // No negative balance
});

test("wouldOverpay warns when payment exceeds total", () => {
  assert.equal(wouldOverpay(10000, 6000, 4000), false); // Exactly 10k
  assert.equal(wouldOverpay(10000, 6000, 4001), true); // Exceeds
  assert.equal(wouldOverpay(10000, 6000, 3999), false); // Below
});

test("statusAfterPayments transitions between draft, partially_paid, and paid", () => {
  assert.equal(statusAfterPayments("draft", 10000, 5000), "draft");
  assert.equal(statusAfterPayments("cancelled", 10000, 5000), "cancelled");
  assert.equal(statusAfterPayments("issued", 10000, 0), "issued");
  assert.equal(statusAfterPayments("issued", 10000, 5000), "partially_paid");
  assert.equal(statusAfterPayments("issued", 10000, 10000), "paid");
  assert.equal(statusAfterPayments("partially_paid", 10000, 10000), "paid");
});

test("effectiveStatus derives overdue when due date has elapsed with balance", () => {
  const pastDate = "2026-01-01";
  const futureDate = "2026-12-31";
  const today = "2026-06-01";

  // Past due date with remaining balance -> overdue
  assert.equal(effectiveStatus("issued", 10000, 5000, pastDate, today), "overdue");
  assert.equal(effectiveStatus("partially_paid", 10000, 5000, pastDate, today), "overdue");

  // Future due date -> normal status
  assert.equal(effectiveStatus("issued", 10000, 0, futureDate, today), "issued");

  // Fully paid past due date is paid, not overdue
  assert.equal(effectiveStatus("paid", 10000, 10000, pastDate, today), "paid");

  // Draft past due date stays draft
  assert.equal(effectiveStatus("draft", 10000, 0, pastDate, today), "draft");
});
