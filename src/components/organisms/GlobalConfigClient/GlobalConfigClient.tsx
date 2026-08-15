"use client";

import { useEffect, useState } from "react";
import { Check, ChevronDown, Loader2, Settings2, Sparkles } from "lucide-react";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ErrorBanner } from "@/components/molecules/ErrorBanner/ErrorBanner";
import { getGlobalConfig, patchGlobalConfig } from "@/services/globalConfigApiService";
import { getCatalog, type ModelCatalog } from "@/services/modelsApiService";
import { setLocale, t } from "@/resources/resources";
import type { Locale } from "@/types/state";

type OpenCodeField = "agentKey" | "provider" | "model" | "variant";

export function resolveDisplayLocale(language: Locale | undefined, browserLanguage = typeof navigator === "undefined" ? "en" : navigator.language): Locale {
  return language ?? (browserLanguage.toLowerCase().startsWith("es") ? "es" : "en");
}

function FieldError({ id, message }: { id: string; message?: string }) {
  return message ? <p id={id} role="alert" className="text-xs text-destructive">{message}</p> : null;
}

function ConfigSelect({
  id,
  label,
  value,
  options,
  disabled,
  error,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  options: string[];
  disabled: boolean;
  error?: string;
  onChange: (value: string) => void;
}) {
  const errorId = `${id}-error`;
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</label>
      <Select.Root value={value || null} onValueChange={(next) => onChange(next ?? "")} disabled={disabled}>
        <Select.Trigger id={id} aria-invalid={Boolean(error)} aria-describedby={error ? errorId : undefined} className="flex h-9 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50">
          <Select.Value placeholder={label} />
          <ChevronDown className="size-4 text-muted-foreground" aria-hidden="true" />
        </Select.Trigger>
        <Select.Portal><Select.Positioner className="z-50"><Select.Popup className="max-h-60 min-w-[var(--anchor-width)] overflow-auto rounded-md border bg-popover p-1 text-popover-foreground shadow-md">
          {options.map((option) => <Select.Item key={option} value={option} className="flex cursor-pointer rounded-sm px-2 py-1.5 text-sm focus:bg-accent">{option}</Select.Item>)}
        </Select.Popup></Select.Positioner></Select.Portal>
      </Select.Root>
      <FieldError id={errorId} message={error} />
    </div>
  );
}

export function GlobalConfigClient() {
  const [language, setLanguage] = useState<Locale>("en");
  const [persona, setPersona] = useState("");
  const [agentKey, setAgentKey] = useState("");
  const [provider, setProvider] = useState("");
  const [model, setModel] = useState("");
  const [variant, setVariant] = useState("");
  const [agents, setAgents] = useState<string[]>([]);
  const [catalog, setCatalog] = useState<ModelCatalog>({});
  const [catalogUnavailable, setCatalogUnavailable] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<"gentle-ai" | "opencode" | null>(null);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<OpenCodeField, string>>>({});

  useEffect(() => {
    void Promise.allSettled([getGlobalConfig(), getCatalog()]).then(([configResult, catalogResult]) => {
      if (configResult.status === "fulfilled") {
        const data = configResult.value;
        const locale = resolveDisplayLocale(data.gentleAi.language);
        setLocale(locale);
        setLanguage(locale);
        setPersona(data.gentleAi.persona ?? "");
        setAgents(data.agents);
        const assignment = data.assignments.find((item) => item.agentKey === data.defaultAgent) ?? data.assignments[0];
        if (assignment) {
          setAgentKey(assignment.agentKey);
          setProvider(assignment.provider);
          setModel(assignment.model);
          setVariant(assignment.variant);
        }
      } else {
        setError(t("config_load_error"));
      }
      if (catalogResult.status === "fulfilled") {
        setCatalog(catalogResult.value.catalog);
      } else {
        setCatalogUnavailable(true);
      }
    }).finally(() => setLoading(false));
  }, []);

  async function saveGentle() {
    setError("");
    setSuccess("");
    setSaving("gentle-ai");
    try {
      await patchGlobalConfig({ domain: "gentle-ai", language, persona });
      setSuccess(t("config_gentle_saved"));
    } catch {
      setError(t("config_gentle_error"));
    } finally {
      setSaving(null);
    }
  }

  async function saveOpenCode() {
    const values: Record<OpenCodeField, string> = { agentKey, provider, model, variant };
    const errors = Object.fromEntries(Object.entries(values).filter(([, value]) => !value).map(([field]) => [field, t("config_field_required")])) as Partial<Record<OpenCodeField, string>>;
    setFieldErrors(errors);
    if (Object.keys(errors).length) {
      document.getElementById("config-agent")?.focus();
      return;
    }
    setError("");
    setSuccess("");
    setSaving("opencode");
    try {
      await patchGlobalConfig({ domain: "opencode", agentKey, model: `${provider}/${model}`, variant });
      setSuccess(t("config_opencode_saved"));
    } catch {
      setError(t("config_opencode_error"));
    } finally {
      setSaving(null);
    }
  }

  const gentleConfigured = Boolean(language);
  const providers = Object.keys(catalog);
  const models = Object.keys(catalog[provider] ?? {});
  const variants = catalog[provider]?.[model] ?? [];
  const openCodeConfigured = Boolean(agentKey && provider && model && variant);
  const isConfigured = gentleConfigured && openCodeConfigured;

  if (loading) return <Card><CardContent className="flex items-center gap-3 p-6 text-muted-foreground" role="status"><Loader2 className="size-4 animate-spin text-primary" aria-hidden="true" />{t("config_loading")}</CardContent></Card>;

  return (
    <main className="flex h-full flex-col">
      <header className="border-b border-border bg-card">
        <div className="flex items-start gap-3 px-8 py-6">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"><Settings2 className="size-5" aria-hidden="true" /></span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2"><h1 className="text-2xl font-semibold tracking-tight text-foreground">{t("config_title")}</h1><Badge variant={isConfigured ? "secondary" : "outline"} className={isConfigured ? "text-success" : "text-muted-foreground"}>{isConfigured && <Check className="size-3" aria-hidden="true" />}{t(isConfigured ? "config_status_ready" : "config_status_incomplete")}</Badge></div>
            <p className="mt-1 text-sm text-muted-foreground">{t("config_description")}</p>
          </div>
        </div>
      </header>

      <div className="flex-1 space-y-6 overflow-y-auto p-6">
        {error && <ErrorBanner title={t("errors_generic")} message={error} />}
        {catalogUnavailable && <ErrorBanner title={t("errors_generic")} message={t("config_catalog_error")} />}
        {success && <div role="status" className="flex items-center gap-2 rounded-lg border border-success/20 bg-success/10 px-4 py-3 text-sm text-success"><Check className="size-4" aria-hidden="true" />{success}</div>}

        <Card>
        <CardHeader className="flex-row items-start justify-between gap-4 space-y-0">
          <div className="flex gap-3"><span className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary"><Sparkles className="size-4" aria-hidden="true" /></span><div><CardTitle>{t("config_gentle_title")}</CardTitle><p className="mt-1 text-sm text-muted-foreground">{t("config_gentle_description")}</p></div></div>
          <Badge variant="outline" className="text-muted-foreground">{t("config_gentle_status")}</Badge>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5"><label htmlFor="config-language" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{t("config_language")}</label><Select.Root value={language} onValueChange={(value) => setLanguage((value ?? "en") as Locale)} disabled={saving !== null}><Select.Trigger id="config-language" className="flex h-9 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-1 text-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"><Select.Value /></Select.Trigger><Select.Portal><Select.Positioner className="z-50"><Select.Popup className="min-w-[var(--anchor-width)] rounded-md border bg-popover p-1 text-popover-foreground shadow-md"><Select.Item value="en" className="flex cursor-pointer rounded-sm px-2 py-1.5 text-sm focus:bg-accent">English</Select.Item><Select.Item value="es" className="flex cursor-pointer rounded-sm px-2 py-1.5 text-sm focus:bg-accent">Español</Select.Item></Select.Popup></Select.Positioner></Select.Portal></Select.Root></div>
          <div className="space-y-1.5"><label htmlFor="config-persona" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{t("config_persona")}</label><Input id="config-persona" value={persona} onChange={(event) => setPersona(event.target.value)} disabled={saving !== null} className="font-mono" /></div>
        </CardContent>
        <CardFooter><Button className="w-full sm:w-auto" onClick={saveGentle} disabled={saving !== null}>{saving === "gentle-ai" && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}{t("config_gentle_save")}</Button></CardFooter>
        </Card>

        <Card>
        <CardHeader className="flex-row items-start justify-between gap-4 space-y-0"><div className="flex gap-3"><span className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary"><Settings2 className="size-4" aria-hidden="true" /></span><div><CardTitle>{t("config_opencode_title")}</CardTitle><p className="mt-1 text-sm text-muted-foreground">{t("config_opencode_description")}</p></div></div><Badge variant={openCodeConfigured ? "secondary" : "outline"} className={openCodeConfigured ? "text-success" : "text-muted-foreground"}>{t(openCodeConfigured ? "config_status_ready" : "config_status_incomplete")}</Badge></CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <ConfigSelect id="config-agent" label={t("config_agent")} value={agentKey} options={agents} disabled={saving !== null} error={fieldErrors.agentKey} onChange={(value) => { setAgentKey(value); setFieldErrors((errors) => ({ ...errors, agentKey: undefined })); }} />
          <ConfigSelect id="config-provider" label={t("config_provider")} value={provider} options={providers} disabled={saving !== null || catalogUnavailable} error={fieldErrors.provider} onChange={(value) => { setProvider(value); setModel(""); setVariant(""); setFieldErrors((errors) => ({ ...errors, provider: undefined, model: undefined, variant: undefined })); }} />
          <ConfigSelect id="config-model" label={t("config_model")} value={model} options={models} disabled={saving !== null || catalogUnavailable || !provider} error={fieldErrors.model} onChange={(value) => { setModel(value); setVariant(""); setFieldErrors((errors) => ({ ...errors, model: undefined, variant: undefined })); }} />
          <ConfigSelect id="config-variant" label={t("config_variant")} value={variant} options={variants} disabled={saving !== null || catalogUnavailable || !model} error={fieldErrors.variant} onChange={(value) => { setVariant(value); setFieldErrors((errors) => ({ ...errors, variant: undefined })); }} />
        </CardContent>
        <CardFooter><Button className="w-full sm:w-auto" onClick={saveOpenCode} disabled={saving !== null || catalogUnavailable}>{saving === "opencode" && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}{t("config_opencode_save")}</Button></CardFooter>
        </Card>
      </div>
    </main>
  );
}
