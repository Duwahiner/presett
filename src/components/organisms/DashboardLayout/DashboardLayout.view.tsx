"use client";

import Link from "next/link";
import type { DashboardLayoutProps } from "./DashboardLayout.types";

const navItems = [
  { label: "Dashboard", href: "/" },
  { label: "Models", href: "/models" },
  { label: "Profiles", href: "/profiles" },
  { label: "Backups", href: "/backups" },
];

export function DashboardLayoutView({ children }: DashboardLayoutProps) {
  return (
    <div className="flex min-h-screen flex-col bg-zinc-950 text-zinc-100">
      <header className="border-b border-zinc-800 bg-zinc-900">
        <nav className="mx-auto flex max-w-6xl items-center gap-6 px-6 py-4">
          <span className="text-xl font-bold text-rose-500">PreSett</span>
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-sm font-medium text-zinc-300 hover:text-white"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-8">
        {children}
      </main>
      <footer className="border-t border-zinc-800 bg-zinc-900 px-6 py-4 text-sm text-zinc-500">
        PreSett — Gentle-AI configuration manager
      </footer>
    </div>
  );
}
