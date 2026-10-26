import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Every page is per-user and authenticated, so we use plain dynamic rendering.
  // Logos and PDFs are served through Supabase Storage signed URLs, not next/image.
  experimental: {
    serverActions: { bodySizeLimit: "3mb" },
  },
};

export default nextConfig;
