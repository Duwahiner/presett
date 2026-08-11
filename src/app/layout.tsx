import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { DashboardLayout } from "@/components/organisms/DashboardLayout/DashboardLayout";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono-jb",
  display: "swap",
});

export const metadata: Metadata = {
  title: "PreSett",
  description: "Visual configuration manager for Gentle-AI",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable}`}>
      <body className="font-sans antialiased">
        <DashboardLayout>{children}</DashboardLayout>
      </body>
    </html>
  );
}
