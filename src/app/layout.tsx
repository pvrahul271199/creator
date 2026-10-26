import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Sidebar } from "@/components/sidebar";
import { ThemeProvider } from "@/components/theme-provider";

export const metadata: Metadata = {
  title: "Boardroom — Creator CRM",
  description: "A minimal creator CRM with brand deals, invoicing, and campaign analytics.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full bg-[var(--background)] text-[var(--foreground)] antialiased font-sans">
        <ThemeProvider>
          <div className="flex flex-col lg:flex-row w-full min-h-screen">
            <Sidebar />
            <div className="flex-1 min-w-0 flex flex-col">{children}</div>
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
