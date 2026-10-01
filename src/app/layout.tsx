import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Aboki Riders",
  description: "A fast multiplayer Nigerian street-racing game."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
