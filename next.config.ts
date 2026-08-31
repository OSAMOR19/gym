import type { NextConfig } from "next";
import path from "path";
import os from "os";

/**
 * Next.js config.
 *
 * The project used to live on a slow USB drive; those workarounds (build
 * output redirected to tmpdir, file watcher disabled) are now opt-in via
 * USB_DEV=1 instead of applying to every non-Vercel environment — otherwise
 * a Docker/VPS deploy would silently build into /tmp and lose its output on
 * reboot, and dev HMR would never pick up file changes.
 */
const isUsbDrive = process.env.USB_DEV === "1";

const nextConfig: NextConfig = {
  ...(isUsbDrive ? { distDir: path.join(os.tmpdir(), "gym-next-cache") } : {}),

  reactStrictMode: false,
  devIndicators: false,

  // Required in Next.js 16 when a webpack config exists
  turbopack: {},

  // Static media (program photos, exercise GIFs, food photos, brand marks)
  // ships from /public with revalidate-every-time defaults — on the GIF-heavy
  // screens that meant re-checking dozens of files per visit. These change
  // rarely and never per-user: cache for a day, serve stale for a week while
  // revalidating. Icons are versioned via ?v=, so they can cache long too.
  async headers() {
    const media = { key: "Cache-Control", value: "public, max-age=86400, stale-while-revalidate=604800" };
    return [
      { source: "/programs/:file*", headers: [media] },
      { source: "/foods/:file*", headers: [media] },
      { source: "/videosillustrations/:file*", headers: [media] },
      { source: "/images/:file*", headers: [media] },
      { source: "/brand/:file*", headers: [media] },
      { source: "/:icon(icon.*|apple-icon.*|icon-.*)", headers: [media] },
    ];
  },

  webpack: (config, { dev }) => {
    if (dev && isUsbDrive) {
      // Disable file watcher on USB drive (phantom FS events cause HMR loops)
      config.watchOptions = {
        ignored: /.*/,
      };
    }
    return config;
  },
};

export default nextConfig;
