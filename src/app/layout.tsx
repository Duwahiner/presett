import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { ThemeProvider } from "@/lib/themeProvider";
import { DashboardLayout } from "@/components/organisms/DashboardLayout/dashboardLayout";
import { IS_VISUAL_AUDIT_MODE } from "@/lib/visual-audit";
import { AuditModeProvider } from "@/lib/visual-audit/auditContext";
import { AUDIT_FIXTURE_GENTLE_AI_VERSION } from "@/lib/visual-audit/fixtures";
import { probeGentleAiVersion } from "@/services/processService";
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
  icons: {
    icon: "/icon.svg",
    apple: "/icon.svg",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const auditClass = IS_VISUAL_AUDIT_MODE ? "dark" : "";
  const existingClasses = `${inter.variable} ${jetbrainsMono.variable}`;
  const versionResult = IS_VISUAL_AUDIT_MODE ? null : await probeGentleAiVersion();
  const gentleAiVersion = IS_VISUAL_AUDIT_MODE
    ? AUDIT_FIXTURE_GENTLE_AI_VERSION
    : versionResult?.ok
      ? versionResult.value
      : undefined;

  return (
    <html
      lang="en"
      className={`${existingClasses} ${auditClass}`.trim()}
      suppressHydrationWarning
    >
      <body className="font-sans antialiased">
        <ThemeProvider forcedTheme={IS_VISUAL_AUDIT_MODE ? "dark" : undefined}>
          <AuditModeProvider isAuditMode={IS_VISUAL_AUDIT_MODE}>
            <DashboardLayout gentleAiVersion={gentleAiVersion}>{children}</DashboardLayout>
          </AuditModeProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
