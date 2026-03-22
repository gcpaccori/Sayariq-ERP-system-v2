import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import FormEventsToastBridge from "@/components/form-events-toast-bridge";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ||
      (process.env.VERCEL_PROJECT_PRODUCTION_URL
        ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
        : "https://sayariq.com")
  ),
  title: {
    default: "SAYARIQ | Agroexportación Premium",
    template: "%s | SAYARIQ",
  },
  description:
    "Exportamos jengibre y cúrcuma frescos desde Pichanaki, Perú, con trazabilidad y operación ágil para mercados exigentes.",
  applicationName: "SAYARIQ",
  openGraph: {
    type: "website",
    siteName: "SAYARIQ",
    title: "SAYARIQ | Agroexportación Premium",
    description:
      "Fresco del origen peruano. Operación eficiente, trazabilidad y calidad para exportación.",
    images: [
      {
        url: "/og-sayariq.jpg",
        width: 1200,
        height: 630,
        alt: "SAYARIQ Agroexportación Premium",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "SAYARIQ | Agroexportación Premium",
    description:
      "Fresco del origen peruano. Operación eficiente, trazabilidad y calidad para exportación.",
    images: ["/og-sayariq.jpg"],
  },
  icons: {
    icon: [{ url: "/company-images/logo1-Photoroom.png" }],
    shortcut: ["/company-images/logo1-Photoroom.png"],
    apple: [{ url: "/company-images/logo1-Photoroom.png" }],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
        <FormEventsToastBridge />
      </body>
    </html>
  );
}
