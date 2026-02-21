import type { Metadata } from "next";
import { Navbar } from "@/components/Navbar";
import "./globals.css";

export const metadata: Metadata = {
  title: "NBA Trade Support",
  description: "IDSS for real and fantasy managers to manage teams and target players",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="app-dark">
      <body className="min-h-screen bg-[#0E1117]">
        <Navbar />
        {children}
      </body>
    </html>
  );
}
