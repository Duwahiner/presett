import { Search } from "lucide-react";
import { Badge } from "@/components/atoms/Badge/badge";
import { SearchClient } from "@/components/organisms/SearchClient/searchClient";
import { t } from "@/resources/resources";

export const dynamic = "force-dynamic";

export default function SearchPage() {
  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-border bg-card px-8 py-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <Search className="h-5 w-5 text-primary" aria-hidden="true" />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-semibold tracking-tight text-card-foreground">{t("search_title")}</h1>
              <Badge variant="success">{t("search_status_badge")}</Badge>
            </div>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{t("search_header_description")}</p>
          </div>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-6 scrollbar-brutal"><SearchClient /></div>
    </div>
  );
}
