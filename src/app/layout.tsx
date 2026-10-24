import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Warung Duniawi - Sembako & Kebutuhan Harian",
  description: "Pesan Sembako dan Kebutuhan Harian Online Cepat & Mudah",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id" className="h-full antialiased">
      <body className="min-h-full flex flex-col font-sans">{children}</body>
    </html>
  );
}

