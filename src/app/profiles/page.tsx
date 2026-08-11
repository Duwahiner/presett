import { Card } from "@/components/atoms/Card/Card";
import { ProfilesClient } from "@/components/organisms/ProfilesClient/ProfilesClient";

export const dynamic = "force-dynamic";

export default function ProfilesPage() {
  return (
    <div>
      <h1 className="mb-6 text-3xl font-bold text-zinc-100">SDD Profiles</h1>
      <Card title="OpenCode Profiles">
        <ProfilesClient />
      </Card>
    </div>
  );
}
