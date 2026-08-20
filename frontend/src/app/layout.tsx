import type { Metadata } from "next";
import { DM_Sans, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";

const dmSans = DM_Sans({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const jetBrains = JetBrains_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ServiceFlow — Complaint routing API",
  description:
    "Multi-tenant REST API for intelligent complaint routing—TF-IDF similarity, department or agent targeting, and dashboard operations.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${dmSans.variable} ${jetBrains.variable} font-sans antialiased`}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
