import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "Label OS",
  description: "A premium SaaS operating system for modern record labels."
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es">
      <body className="grid-noise min-h-screen bg-ink text-zinc-100 antialiased">{children}</body>
    </html>
  );
}
