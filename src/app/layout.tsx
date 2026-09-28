import type { Metadata } from "next";
import { Cinzel } from "next/font/google";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "./globals.css";

const cinzel = Cinzel({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-cinzel",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "AETHER-SAR // Autonomous Maritime Dark Fleet & Radar Intelligence",
    template: "%s · AETHER-SAR",
  },
  description:
    "Cross-referencing satellite Synthetic Aperture Radar with kinematic trajectory algorithms to unmask illegal oil transfers, transponder spoofing, and maritime embargo evasion.",
  applicationName: "AETHER-SAR",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable} ${cinzel.variable}`}>
      <body className="font-sans antialiased">
        <div className="noise-overlay" aria-hidden />
        {children}
      </body>
    </html>
  );
}
