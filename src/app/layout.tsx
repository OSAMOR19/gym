import type { Metadata, Viewport } from "next";
import { Inter, Orbitron } from "next/font/google";
import { AuthProvider } from "../lib/auth";
import { ThemeProvider } from "../lib/theme";
import { ToastProvider } from "../components/Toast";
import "./globals.css";

// Runs before first paint: stamps the saved theme + accent onto <html> so
// there is no flash of the wrong theme. Keys mirror src/lib/theme.tsx.
const THEME_BOOT_SCRIPT = `try{var e=document.documentElement,t=localStorage.getItem('irontrack_theme'),a=localStorage.getItem('irontrack_accent');e.dataset.theme=t==='light'?'light':'dark';if(a&&/^(green|pink|blue|purple|orange)$/.test(a))e.dataset.accent=a;}catch(_){}`;

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const orbitron = Orbitron({
  variable: "--font-orbitron",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600", "700", "800", "900"],
});

// Mobile-first: cover the notch/home-indicator areas so fixed bars can pad
// with env(safe-area-inset-*); keep pinch-zoom available for accessibility.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0f0f0f",
};

export const metadata: Metadata = {
  title: "IronTrack — AI-Powered Workout Tracker",
  description:
    "Real-time AI pose detection that counts your reps, tracks form quality, and monitors time under tension. Built with MediaPipe Pose.",
  icons: {
    icon: [
      { url: "/icon.png?v=4", type: "image/png", sizes: "512x512" },
    ],
    // Full-square art — iOS masks its own rounded corners over it
    apple: [
      { url: "/apple-icon.png?v=4", sizes: "512x512" },
    ],
    shortcut: "/icon.png?v=4",
  },
  // Installed-app (PWA) behavior on iOS: full-screen standalone chrome
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "IronTrack",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // suppressHydrationWarning: the boot script may legitimately change
    // data-theme/data-accent before React hydrates.
    <html lang="en" data-theme="dark" suppressHydrationWarning>
      <body
        className={`${inter.variable} ${orbitron.variable} antialiased bg-app text-ink`}
      >
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT_SCRIPT }} />
        <ThemeProvider>
          <AuthProvider>
            <ToastProvider>
              {children}
            </ToastProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
