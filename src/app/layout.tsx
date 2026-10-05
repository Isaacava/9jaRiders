import type { Metadata, Viewport } from "next";
import "./globals.css";
import PwaRegister from "@/components/PwaRegister";

export const metadata: Metadata = {
  title: "Aboki Riders",
  description: "A fast multiplayer Nigerian street-racing game.",
  manifest: "/manifest.webmanifest",
  applicationName: "Aboki Riders",
  appleWebApp: { capable: true, title: "Aboki Riders", statusBarStyle: "black-translucent" },
  icons: { icon: "/icons/icon-192.png", apple: "/icons/apple-touch-icon.png" }
};

export const viewport: Viewport = { themeColor: "#f28c28", width: "device-width", initialScale: 1, viewportFit: "cover" };

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        {children}
        <PwaRegister />
      </body>
    </html>
  );
}
