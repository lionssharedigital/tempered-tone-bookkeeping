import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["pdfjs-dist", "better-sqlite3"],
  experimental: {
    // Building with multiple workers loads the better-sqlite3 native addon
    // concurrently in separate processes, which segfaults under Docker
    // Desktop's resource-constrained build VM. Serializing page-data
    // collection avoids that at a small build-time cost for an app this
    // size.
    cpus: 1,
  },
};

export default nextConfig;
