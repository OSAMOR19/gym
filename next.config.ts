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
