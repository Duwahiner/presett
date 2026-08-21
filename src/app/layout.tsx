import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { ThemeProvider } from "@/lib/theme-provider";
import { DashboardLayout } from "@/components/organisms/DashboardLayout/DashboardLayout";
import { IS_VISUAL_AUDIT_MODE } from "@/lib/visual-audit";
import { AuditModeProvider } from "@/lib/visual-audit/audit-context";
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
  fallback: ["JetBrains Mono Fallback", "ui-monospace", "monospace"],
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
  const auditClass = IS_VISUAL_AUDIT_MODE ? "dark" : "";
  const existingClasses = `${inter.variable} ${jetbrainsMono.variable}`;

  return (
    <html
      lang="en"
      className={`${existingClasses} ${auditClass}`.trim()}
      suppressHydrationWarning
    >
      <body className="font-sans antialiased">
        <ThemeProvider forcedTheme={IS_VISUAL_AUDIT_MODE ? "dark" : undefined}>
          <AuditModeProvider isAuditMode={IS_VISUAL_AUDIT_MODE}>
            <DashboardLayout>{children}</DashboardLayout>
          </AuditModeProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
