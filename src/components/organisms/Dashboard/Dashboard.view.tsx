"use client";

import Link from "next/link";
import { Card } from "@/components/atoms/Card/Card";
import { Button } from "@/components/atoms/Button/Button";
import type { DashboardProps } from "./Dashboard.types";

export function DashboardView({ className }: DashboardProps) {
  return (
    <div className={className}>
      <h1 className="mb-6 text-3xl font-bold text-zinc-100">
        PreSett Dashboard
      </h1>

      <section className="mb-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card title="Status">
          <p>Gentle-AI configuration manager is ready.</p>
          <p className="mt-2 text-sm text-zinc-500">
            Agent detection and sync status will appear here.
          </p>
        </Card>

        <Card title="Models">
          <p className="mb-4">Assign models to SDD phases and agents.</p>
          <Link href="/models">
            <Button>Manage Models</Button>
          </Link>
        </Card>

        <Card title="Profiles">
          <p className="mb-4">Create and switch OpenCode SDD profiles.</p>
          <Link href="/profiles">
            <Button>Manage Profiles</Button>
          </Link>
        </Card>

        <Card title="Backups">
          <p className="mb-4">View and restore Gentle-AI backups.</p>
          <Link href="/backups">
            <Button>View Backups</Button>
          </Link>
        </Card>
      </section>
    </div>
  );
}
