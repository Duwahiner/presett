import { describe, it, expect, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { createElement } from "react";
import {
  AuditModeProvider,
  AuditNotificationProvider,
  useAuditMode,
  useAuditNotifications,
} from "../auditContext";
import { AUDIT_FIXTURE_NOTIFICATIONS } from "../fixtures";

describe("visual-audit", () => {
  describe("IS_VISUAL_AUDIT_MODE", () => {
    it("is false when PRESETT_VISUAL_AUDIT env is unset", async () => {
      // The module is evaluated at import time; with env unset, it should be false.
      // We test the module's exported constant.
      const mod = await import("../index");
      expect(mod.IS_VISUAL_AUDIT_MODE).toBe(false);
    });
  });

  describe("AuditModeProvider + useAuditMode", () => {
    it("provides false when isAuditMode is false", () => {
      const wrapper = ({ children }: { children: React.ReactNode }) =>
        createElement(AuditModeProvider, { isAuditMode: false, children });
      const { result } = renderHook(() => useAuditMode(), { wrapper });
      expect(result.current).toBe(false);
    });

    it("provides true when isAuditMode is true", () => {
      const wrapper = ({ children }: { children: React.ReactNode }) =>
        createElement(AuditModeProvider, { isAuditMode: true, children });
      const { result } = renderHook(() => useAuditMode(), { wrapper });
      expect(result.current).toBe(true);
    });
  });

  describe("AuditNotificationProvider + useAuditNotifications", () => {
    it("provides stable fixture notifications without React hook warnings", () => {
      const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
      const wrapper = ({ children }: { children: React.ReactNode }) =>
        createElement(AuditNotificationProvider, { children });

      try {
        const { result, rerender } = renderHook(() => useAuditNotifications(), { wrapper });
        const initialValue = result.current;

        expect(initialValue.notifications).toBe(AUDIT_FIXTURE_NOTIFICATIONS);
        expect(initialValue.unreadCount).toBe(0);
        expect(initialValue.push({ severity: "info", title: "Audit", message: "Ignored" })).toBe(
          "audit-noop",
        );
        expect(initialValue.resolve("id", "success", "Ignored")).toBeUndefined();
        expect(initialValue.dismiss("id")).toBeUndefined();
        expect(initialValue.markAllRead()).toBeUndefined();

        rerender();
        expect(result.current).toBe(initialValue);
        expect(consoleError).not.toHaveBeenCalled();
      } finally {
        consoleError.mockRestore();
      }
    });
  });

  describe("fixtures", () => {
    it("have stable timestamps across imports", async () => {
      const mod1 = await import("../fixtures");
      const mod2 = await import("../fixtures");
      expect(mod1.AUDIT_FIXTURE_TIMESTAMP).toBe(mod2.AUDIT_FIXTURE_TIMESTAMP);
      expect(mod1.AUDIT_FIXTURE_LAST_SYNC).toBe(mod2.AUDIT_FIXTURE_LAST_SYNC);
    });

    it("contain deterministic config data", async () => {
      const { AUDIT_FIXTURE_CONFIG } = await import("../fixtures");
      expect(AUDIT_FIXTURE_CONFIG.assignments.length).toBeGreaterThan(0);
      expect(AUDIT_FIXTURE_CONFIG.defaultAgent).toBeTruthy();
    });

    it("contain deterministic profiles", async () => {
      const { AUDIT_FIXTURE_PROFILES } = await import("../fixtures");
      expect(AUDIT_FIXTURE_PROFILES.profiles.length).toBeGreaterThan(0);
      expect(AUDIT_FIXTURE_PROFILES.profiles[0].active).toBe(true);
    });

    it("contain deterministic backups", async () => {
      const { AUDIT_FIXTURE_BACKUPS } = await import("../fixtures");
      expect(AUDIT_FIXTURE_BACKUPS.backups.length).toBeGreaterThan(0);
      expect(AUDIT_FIXTURE_BACKUPS.backups[0].pinned).toBe(true);
    });
  });
});
