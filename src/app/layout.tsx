import type { Metadata } from "next";
import { DashboardLayout } from "@/components/organisms/DashboardLayout/DashboardLayout";
import "./globals.css";

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
    <html lang="en">
      <body className="antialiased">
        <DashboardLayout>{children}</DashboardLayout>
      </body>
    </html>
  );
}
