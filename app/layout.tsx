import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Reyesound Label OS Demo",
  description: "Public localStorage demo for independent record label operations."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="grid-noise min-h-screen bg-ink text-zinc-100 antialiased">{children}</body>
    </html>
  );
}
