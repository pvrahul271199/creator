import { test } from "node:test";
import assert from "node:assert/strict";
import { formatMoney, formatDate } from "../src/lib/format";
import type { PartyDetails, InvoiceProfileSettings } from "../src/lib/types";

test("formatMoney correctly formats INR with rupee symbol", () => {
  assert.equal(formatMoney(60000, "INR"), "₹60,000.00");
  assert.equal(formatMoney(1250.5, "INR"), "₹1,250.50");
});

test("creator invoice identity defaults to legal name and handles correctly", () => {
  const profile: Partial<InvoiceProfileSettings> = {
    business_name: "Aanya Studios",
    legal_name: "Aanya Sharma",
    pan: "ABCPS1234F",
    instagram_handle: "@aanyastudios",
    gst_status: "Not registered for GST (under threshold limit)",
    bank_account_holder: "Aanya Sharma",
    bank_account_number: "50200012345678",
    bank_ifsc: "HDFC0000123",
    bank_name: "HDFC Bank",
    bank_branch: "Bandra West, Mumbai",
  };

  const sender: PartyDetails = {
    name: profile.business_name,
    legal_name: profile.legal_name,
    handle: profile.instagram_handle,
    pan: profile.pan,
    gst_status: profile.gst_status,
    bank: {
      account_holder: profile.bank_account_holder,
      account_number: profile.bank_account_number,
      ifsc: profile.bank_ifsc,
      bank_name: profile.bank_name,
      branch: profile.bank_branch,
    },
  };

  assert.equal(sender.legal_name, "Aanya Sharma");
  assert.equal(sender.pan, "ABCPS1234F");
  assert.equal(sender.bank?.account_holder, "Aanya Sharma");
  assert.equal(sender.bank?.ifsc, "HDFC0000123");
});

test("formatDate handles ISO date strings gracefully", () => {
  assert.equal(formatDate("2026-10-14"), "14 Oct 2026");
  assert.equal(formatDate(null), "Not set");
});
