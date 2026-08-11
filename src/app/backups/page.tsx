import { Card } from "@/components/atoms/Card/Card";
import { BackupsClient } from "@/components/organisms/BackupsClient/BackupsClient";

export const dynamic = "force-dynamic";

export default function BackupsPage() {
  return (
    <div>
      <h1 className="mb-6 text-3xl font-bold text-zinc-100">Backups</h1>
      <Card title="Gentle-AI Backups">
        <BackupsClient />
      </Card>
    </div>
  );
}
