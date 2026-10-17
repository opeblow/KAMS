import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Kams — Storefront Studio",
  description: "Turn a business brief into a verified CreateOS Sandbox storefront preview.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased selection:bg-indigo-100 selection:text-indigo-900">
        {children}
      </body>
    </html>
  );
}
