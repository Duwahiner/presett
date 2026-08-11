import { Card } from "@/components/atoms/Card/Card";
import { ModelsClient } from "@/components/organisms/ModelsClient/ModelsClient";

export const dynamic = "force-dynamic";

export default function ModelsPage() {
  return (
    <div>
      <h1 className="mb-6 text-3xl font-bold text-zinc-100">Models</h1>
      <Card title="Model Assignments">
        <ModelsClient />
      </Card>
    </div>
  );
}
