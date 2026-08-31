"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Badge } from "@/components/atoms/Badge/badge";
import { Card } from "@/components/ui/card";
import { t } from "@/resources/resources";
import { searchEntities } from "@/services/searchApiService";
import type { SearchEntityType, SearchResult } from "@/services/searchService";
import type { GroupedSearchResults } from "./searchClientTypes";

const GROUP_ORDER: SearchEntityType[] = ["agent", "model", "profile", "backup", "config"];
const GROUP_LABELS: Record<SearchEntityType, Parameters<typeof t>[0]> = {
  agent: "search_group_agent",
  model: "search_group_model",
  profile: "search_group_profile",
  backup: "search_group_backup",
  config: "search_group_config",
};

function groupResults(results: SearchResult[]): GroupedSearchResults {
  return results.reduce<GroupedSearchResults>((groups, result) => {
    groups[result.type] = [...(groups[result.type] ?? []), result];
    return groups;
  }, {});
}

function resultBadges(result: SearchResult) {
  return [result.active ? t("search_active") : null, result.pinned ? t("search_pinned") : null].filter((badge): badge is string => Boolean(badge));
}

export function SearchClient() {
  const searchParams = useSearchParams();
  const query = searchParams.get("q")?.trim() ?? "";
  const [results, setResults] = useState<SearchResult[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [searchedQuery, setSearchedQuery] = useState("");

  useEffect(() => {
    if (!query) return;

    let mounted = true;
    searchEntities(query, 20)
      .then((response) => {
        if (!mounted) return;
        setResults(response.results);
        setWarnings(response.warnings ?? []);
        setError(null);
      })
      .catch((cause) => {
        if (mounted) setError(cause instanceof Error ? cause.message : t("search_error_fallback"));
      })
      .finally(() => {
        if (mounted) setSearchedQuery(query);
      });

    return () => { mounted = false; };
  }, [query]);

  const grouped = useMemo(() => groupResults(results), [results]);
  const loading = Boolean(query) && searchedQuery !== query;
  const visibleResults = query ? results : [];
  const visibleWarnings = query ? warnings : [];

  return (
    <div className="space-y-6">
      {!query && <Card className="p-6"><h2 className="text-lg font-semibold">{t("search_empty_title")}</h2><p className="mt-2 text-sm text-muted-foreground">{t("search_empty_description")}</p></Card>}
      {loading && <div role="status" className="flex items-center gap-3 rounded-xl border border-border bg-card p-6 text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />{t("search_loading")}</div>}
      {error && <div role="alert" className="rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</div>}
      {visibleWarnings.length > 0 && <div role="status" className="rounded-xl border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-warning-foreground">{t("search_partial_warning", { sources: visibleWarnings.join(", ") })}</div>}
      {query && !loading && !error && visibleResults.length === 0 && <div role="status" className="rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground">{t("search_no_results", { query })}</div>}

      {GROUP_ORDER.map((type) => {
        const items = grouped[type] ?? [];
        if (items.length === 0) return null;
        return (
          <section key={type} aria-labelledby={`search-${type}`} className="space-y-3">
            <h2 id={`search-${type}`} className="text-lg font-semibold">{t(GROUP_LABELS[type])}</h2>
            <div className="grid gap-3">
              {items.map((result) => (
                <Link key={`${result.type}:${result.id}`} href={result.href} className="rounded-xl border border-border bg-card p-4 transition-colors hover:bg-muted/50 focus:outline-none focus:ring-2 focus:ring-ring">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-card-foreground">{result.label}</span>
                    <Badge variant="info">{t(GROUP_LABELS[result.type])}</Badge>
                    {resultBadges(result).map((badge) => <Badge key={badge} variant="success">{badge}</Badge>)}
                  </div>
                  {result.subtitle && <p className="mt-1 text-sm text-muted-foreground">{result.subtitle}</p>}
                </Link>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
