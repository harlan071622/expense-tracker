import type { Metadata } from "next";
import Link from "next/link";
import { DM_Serif_Display, Space_Grotesk } from "next/font/google";
import "./globals.css";

const sans = Space_Grotesk({
  variable: "--font-sans",
  subsets: ["latin"],
});

const display = DM_Serif_Display({
  variable: "--font-display",
  weight: "400",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Receipt Ledger",
  description: "OCR expense tracker with review and MongoDB persistence",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${sans.variable} ${display.variable}`}>
        <div className="site-shell">
          <header className="topbar">
            <Link href="/" className="brand">
              Receipt Ledger
            </Link>
            <nav className="topnav">
              <Link href="/">Dashboard</Link>
              <Link href="/new">New Expense</Link>
            </nav>
          </header>
          <main>{children}</main>
        </div>
      </body>
    </html>
  );
}
