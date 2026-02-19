import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import AppSidebar from "@/components/app-sidebar";

const _geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const _geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Sayariq ERP",
  description: "Sistema ERP para gestion cooperativa - Sayariq v2",
};

export const viewport: Viewport = {
  themeColor: "#ffffff",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body
        className={`${_geistSans.variable} ${_geistMono.variable} font-sans antialiased`}
      >
        <div className="flex min-h-screen">
          <AppSidebar />
          <main className="flex-1 min-w-0 pt-14 md:pt-0">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
