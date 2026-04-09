import type { Metadata } from "next";
import { Instrument_Serif, DM_Sans, JetBrains_Mono } from "next/font/google";
import "./globals.css";

/**
 * Font pairing rationale:
 *
 * Instrument Serif — editorial, slightly literary display font. Adds personality
 *   to an otherwise minimal system. Used for headings, large UI text, and the
 *   ARIA logotype. Creates the "expensive tool" feeling we're after.
 *
 * DM Sans — clean, slightly rounded, excellent legibility at 12-15px in both
 *   light and dark. The workhorse for all UI text, labels, and body copy.
 *   Avoids the generic feel of Inter while staying just as readable.
 *
 * JetBrains Mono — technical and consistent. Used for code, IDs, timestamps,
 *   and anything monospaced. Fits the power-user aesthetic.
 */

const instrumentSerif = Instrument_Serif({
  variable: "--font-instrument-serif",
  subsets: ["latin"],
  weight: ["400"],           // Serif weight — 400 is all we need
  style: ["normal", "italic"],
});

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "ARIA",
  description: "Your personal AI operating system",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      data-theme="dark"
      className={`${instrumentSerif.variable} ${dmSans.variable} ${jetbrainsMono.variable} h-full`}
    >
      <body className="h-full">{children}</body>
    </html>
  );
}
