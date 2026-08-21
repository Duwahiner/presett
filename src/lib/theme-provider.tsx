"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";
import type { ThemeProviderProps } from "next-themes";

interface AuditThemeProviderProps extends ThemeProviderProps {
  forcedTheme?: string;
}

export function ThemeProvider({ children, forcedTheme, ...props }: AuditThemeProviderProps) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme={forcedTheme ?? "system"}
      enableSystem={!forcedTheme}
      storageKey={forcedTheme ? undefined : "presett-theme"}
      forcedTheme={forcedTheme}
      {...props}
    >
      {children}
    </NextThemesProvider>
  );
}
