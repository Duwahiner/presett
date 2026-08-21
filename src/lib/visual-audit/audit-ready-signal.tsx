"use client";

import { useEffect } from "react";

/**
 * AuditReadySignal — Emits `data-audit-ready="true"` on `document.documentElement`
 * when the `loading` prop transitions from `true` to `false`.
 *
 * This signals the Playwright harness that the page has settled and is safe
 * to capture.
 */
export function AuditReadySignal({ loading }: { loading: boolean }): null {
  useEffect(() => {
    if (!loading && typeof document !== "undefined") {
      document.documentElement.setAttribute("data-audit-ready", "true");
    }
    return () => {
      if (typeof document !== "undefined") {
        document.documentElement.removeAttribute("data-audit-ready");
      }
    };
  }, [loading]);

  return null;
}
