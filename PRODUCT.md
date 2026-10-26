# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Next.js (App Router), TypeScript strict, Tailwind CSS, shadcn/ui, Supabase (Postgres, Auth with Google OAuth, Storage), React Hook Form, Zod, Recharts, date-fns, Sonner. User-confirmed. No Prisma, no Redux, no separate backend.

## Users

A solo creator or influencer who runs brand deals, sends invoices and chases payments. Works from both phone and laptop. Not an agency, not a team; one person, one business.

## Product Purpose

Boardroom is a creator CRM. One collaboration connects the brand, contacts, tasks, invoices, payments and sponsored-post performance, so the creator enters things once and always knows what money is collected, what is owed, and what is due next. Success: a new user signs in with Google, logs a brand and a deal, issues an invoice, records a payment, and sees accurate numbers, with no mock data.

## Positioning

Brand-deal records, invoicing, payment ledger and sponsored-post evidence live in one place for a solo creator, with honest handling of missing data: unavailable metrics are shown as unavailable, never as zero, and every metric carries its source and date.

## Operating Context

Creators negotiate over DMs and email, deliver content on Instagram, send invoices as PDFs, and receive payments by bank transfer or UPI, often in INR. They check status from a phone between shoots and do admin on a laptop.

## Capabilities and Constraints

- Auth: Supabase Auth, Google OAuth only. No email/password. Protect routes server-side; profile row per user; onboarding on first login.
- Modules: Dashboard, Collaborations, Brands & Contacts, Tasks, Invoices, Payments, Settings.
- Money: `numeric` in Postgres, server-validated totals, per-user transactional invoice numbering, overpayment prevention, payments drive invoice status. Single currency per invoice. Currencies: INR (default), USD, EUR, GBP, AED.
- Invoices: editable builder with live preview, issue/cancel/duplicate, issued snapshot preserved, PDF download and print. Statuses derive from payments and due date. "Issued", never a fake "Sent", since no email is delivered.
- Security: RLS on every user table, no service-role key in the browser, cross-user ownership validation.
- Analytics: creator metric snapshots (manual entry), sponsored posts with manual metric snapshots, deterministic comparisons, campaign report PDF, advanced dashboard. Metrics computed only when required inputs exist.
- Coming soon (shown as such, not built): Instagram connection and synced insights (Meta API). Manual entry must work without it.
- Out of scope: email sending, payment processing, marketplace, team permissions, AI features, social publishing.
- Local verification via the Supabase CLI local stack (Docker is installed). User has no Supabase, Google Cloud or Meta accounts yet; setup docs must cover creating them.

## Brand Commitments

Product name: Boardroom. Replaces the earlier prototype "Workroom" (kept untouched in a separate folder as evidence only).

## Evidence on Hand

No real customer data, testimonials or sample records exist. Do not fabricate any. Earlier prototype at /Users/rahulpv/Downloads/workroom has reusable calculation logic and tests.

## Product Principles

- One collaboration is the spine; avoid duplicate entry.
- Cash received comes from payment records, never from invoice totals or deal values.
- Missing is not zero: show "Unavailable" or "Enter manually" and label the source.
- Financial documents are historical: issued invoices snapshot their details.
- Every visible control works; unfinished capability is labelled Coming soon.

## Accessibility & Inclusion

Keyboard operable, visible focus, WCAG AA contrast, comfortable touch targets on mobile, labels on all inputs.
