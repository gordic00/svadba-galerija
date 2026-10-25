import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond, Geist } from "next/font/google";
import { COUPLE_NAMES } from "@/lib/site";
import "./globals.css";

const serif = Cormorant_Garamond({
  variable: "--font-cormorant",
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "600"],
});

const sans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin", "latin-ext"],
});

export const metadata: Metadata = {
  title: `${COUPLE_NAMES} · slike sa venčanja`,
  description: "Podelite sa nama slike i snimke sa venčanja.",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: "#f8f4ee",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="sr-Latn" className={`${serif.variable} ${sans.variable} antialiased`}>
      <body className="min-h-dvh font-sans">{children}</body>
    </html>
  );
}
