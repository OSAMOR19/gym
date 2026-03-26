import type { NextConfig } from "next";
import path from "path";
import os from "os";

/**
 * USB-drive-safe config for the KINGSTON external drive.
 *
 * exFAT / FAT32 filesystems fire phantom change events that make
 * webpack's HMR rebuild the app endlessly. The ONLY reliable fix is
 * to completely disable the file watcher.
 *
 * Trade-off: you must restart the dev server (`yarn dev`) after code changes.
 */
const nextConfig: NextConfig = {
  distDir: path.join(os.tmpdir(), "gym-next-cache"),
  reactStrictMode: false,
  devIndicators: false,

  webpack: (config, { dev }) => {
    if (dev) {
      // Ignore ALL files — fully disables watch mode on the USB drive
      config.watchOptions = {
        ignored: /.*/,    // regex matching everything → no files watched
      };
    }
    return config;
  },
};

export default nextConfig;
