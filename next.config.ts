import type { NextConfig } from "next";
import path from "path";
import os from "os";

/**
 * Next.js config — works on both Vercel and the local KINGSTON USB drive.
 *
 * Local USB: distDir on SSD (tmpdir), webpack watcher disabled.
 * Vercel:    default distDir (.next), Turbopack builds normally.
 */
const isVercel = !!process.env.VERCEL;

const nextConfig: NextConfig = {
  // On Vercel use default .next dir; locally use SSD tmpdir (USB is too slow)
  ...(isVercel ? {} : { distDir: path.join(os.tmpdir(), "gym-next-cache") }),

  reactStrictMode: false,
  devIndicators: false,

  // Required in Next.js 16 when a webpack config exists
  turbopack: {},

  webpack: (config, { dev }) => {
    if (dev) {
      // Disable file watcher on USB drive (phantom FS events cause HMR loops)
      config.watchOptions = {
        ignored: /.*/,
      };
    }
    return config;
  },
};

export default nextConfig;
