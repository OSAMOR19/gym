import type { Metadata } from "next";
import { Inter, Orbitron } from "next/font/google";
import { AuthProvider } from "../lib/auth";
import "./globals.css";

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

export const metadata: Metadata = {
  title: "IronTrack AI — AI-Powered Workout Tracker",
  description:
    "Real-time AI pose detection that counts your reps, tracks form quality, and monitors time under tension. Built with MediaPipe Pose.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${inter.variable} ${orbitron.variable} antialiased bg-[#0f0f0f] text-white`}
      >
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
