import type { Metadata } from "next";
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
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
