import type { NextConfig } from "next";
import path from "path";
import os from "os";

/**
 * distDir keeps Next.js build output on the local SSD instead of the USB drive.
 * Turbopack is disabled via --no-turbopack in package.json dev script because
 * its embedded Rust DB cannot initialize on exFAT/FAT32 USB filesystems.
 */
const nextConfig: NextConfig = {
  distDir: path.join(os.tmpdir(), "gym-next-cache"),
};

export default nextConfig;
