"use client";

import { useEffect, useState } from "react";
import { Check, ChevronDown, Loader2, Settings2, Sparkles } from "lucide-react";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ErrorBanner } from "@/components/molecules/ErrorBanner/ErrorBanner";
import { getGlobalConfig, patchGlobalConfig } from "@/services/globalConfigApiService";
import { getCatalog, type ModelCatalog } from "@/services/modelsApiService";
import { setLocale, t } from "@/resources/resources";
import { useNotificationToasts } from "@/hooks/useNotificationToasts";
import type { Locale } from "@/types/state";
import { useAuditMode } from "@/lib/visual-audit/audit-context";
import { AUDIT_FIXTURE_GLOBAL_CONFIG, AUDIT_FIXTURE_CATALOG } from "@/lib/visual-audit/fixtures";

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
         <Select.Trigger id={id} aria-invalid={Boolean(error)} aria-describedby={error ? errorId : undefined} className="flex h-9 w-full items-center justify-between border-2 border-border bg-card px-3 py-1 text-sm transition-colors focus-visible:outline-none focus-visible:border-primary disabled:cursor-not-allowed disabled:opacity-50 light:border-black light:bg-white light:text-black light:focus-visible:border-primary">
           <Select.Value placeholder={label} />
           <ChevronDown className="size-4 text-muted-foreground" aria-hidden="true" />
         </Select.Trigger>
         <Select.Portal><Select.Positioner className="z-50"><Select.Popup className="max-h-60 min-w-[var(--anchor-width)] overflow-auto border-2 border-border bg-popover p-1 text-popover-foreground shadow-[4px_4px_0_0_var(--border)] scrollbar-brutal light:border-black light:bg-white light:shadow-[4px_4px_0_0_#000000]">
          {options.map((option) => <Select.Item key={option} value={option} className="flex cursor-pointer px-2 py-1.5 text-sm focus:bg-accent">{option}</Select.Item>)}
        </Select.Popup></Select.Positioner></Select.Portal>
      </Select.Root>
      <FieldError id={errorId} message={error} />
    </div>
  );
}

export function GlobalConfigClient() {
  const isAuditMode = useAuditMode();
  const [language, setLanguage] = useState<Locale>("en");
  const [persona, setPersona] = useState("");
  const [agentKey, setAgentKey] = useState("");
  const [provider, setProvider] = useState("");
  const [model, setModel] = useState("");
  const [variant, setVariant] = useState("");
  const [agents, setAgents] = useState<string[]>([]);
  const [catalog, setCatalog] = useState<ModelCatalog>({});
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [catalogUnavailable, setCatalogUnavailable] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<"gentle-ai" | "opencode" | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<OpenCodeField, string>>>({});
  const { onError, onSuccess } = useNotificationToasts();

  useEffect(() => {
    if (isAuditMode) {
      // Short-circuit to fixtures
      const data = AUDIT_FIXTURE_GLOBAL_CONFIG;
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
      setCatalog(AUDIT_FIXTURE_CATALOG);
      setCatalogLoading(false);
      setLoading(false);
      return;
    }

    let mounted = true;

    async function loadConfig() {
      try {
        const data = await getGlobalConfig();
        if (!mounted) return;
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
      } catch {
        if (!mounted) return;
        onError(t("errors_generic"), t("config_load_error"));
      } finally {
        if (mounted) setLoading(false);
      }
    }

    async function loadCatalog() {
      if (mounted) {
        setCatalogLoading(true);
        setCatalogUnavailable(false);
      }
      try {
        const catalogResult = await getCatalog();
        if (!mounted) return;
        setCatalog(catalogResult.catalog);
      } catch {
        if (!mounted) return;
        setCatalogUnavailable(true);
        setCatalog({});
      } finally {
        if (mounted) setCatalogLoading(false);
      }
    }

    void loadConfig();
    void loadCatalog();

    return () => {
      mounted = false;
    };
  }, [isAuditMode]);

  async function saveGentle() {
    if (isAuditMode) return; // Deny writes in audit mode
    setSaving("gentle-ai");
    try {
      await patchGlobalConfig({ domain: "gentle-ai", persona });
      onSuccess(t("config_gentle_saved"));
    } catch {
      onError(t("errors_generic"), t("config_gentle_error"));
    } finally {
      setSaving(null);
    }
  }

  async function saveOpenCode() {
    if (isAuditMode) return; // Deny writes in audit mode
    const values: Record<OpenCodeField, string> = { agentKey, provider, model, variant };
    const errors = Object.fromEntries(Object.entries(values).filter(([, value]) => !value).map(([field]) => [field, t("config_field_required")])) as Partial<Record<OpenCodeField, string>>;
    setFieldErrors(errors);
    if (Object.keys(errors).length) {
      document.getElementById("config-agent")?.focus();
      return;
    }
    setSaving("opencode");
    try {
      await patchGlobalConfig({ domain: "opencode", agentKey, model: `${provider}/${model}`, variant });
      onSuccess(t("config_opencode_saved"));
    } catch {
      onError(t("errors_generic"), t("config_opencode_error"));
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

  if (loading) return <Card><CardContent className="flex min-h-[240px] items-center justify-center gap-3 p-6 text-muted-foreground" role="status"><Loader2 className="size-4 animate-spin text-primary" aria-hidden="true" />{t("config_loading")}</CardContent></Card>;

  return (
    <main className="flex h-full flex-col">
      <header>
        <div className="flex items-start gap-3 px-8 py-6">
          <span className="flex size-10 shrink-0 items-center justify-center bg-primary/15 text-primary"><Settings2 className="size-5" aria-hidden="true" /></span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2"><h1 className="text-2xl font-semibold tracking-tight text-foreground">{t("config_title")}</h1><Badge variant={isConfigured ? "secondary" : "outline"} className={isConfigured ? "text-success" : "text-muted-foreground"}>{isConfigured && <Check className="size-3" aria-hidden="true" />}{t(isConfigured ? "config_status_ready" : "config_status_incomplete")}</Badge></div>
            <p className="mt-1 text-sm text-muted-foreground">{t("config_description")}</p>
          </div>
        </div>
      </header>

      <div className="flex-1 space-y-6 overflow-y-auto p-6 scrollbar-brutal">
        {catalogUnavailable && <ErrorBanner title={t("errors_generic")} message={t("config_catalog_error")} />}

        <Card>
        <CardHeader className="flex-row items-start justify-between gap-4 space-y-0">
          <div className="flex gap-3"><span className="flex size-9 items-center justify-center bg-primary/15 text-primary"><Sparkles className="size-4" aria-hidden="true" /></span><div><CardTitle className="font-mono text-sm font-bold uppercase">{t("config_gentle_title")}</CardTitle><p className="mt-1 text-sm text-muted-foreground">{t("config_gentle_description")}</p></div></div>
          <Badge variant="outline" className="text-muted-foreground">{t("config_gentle_status")}</Badge>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5"><label htmlFor="config-persona" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{t("config_persona")}</label><Select.Root value={persona || "gentleman"} onValueChange={(value) => setPersona(value ?? "gentleman")} disabled={saving !== null}><Select.Trigger id="config-persona" className="flex h-9 w-full items-center justify-between border-2 border-border bg-card px-3 py-1 font-mono text-sm transition-colors focus-visible:outline-none focus-visible:border-primary disabled:cursor-not-allowed disabled:opacity-50 light:border-black light:bg-white light:text-black light:focus-visible:border-primary"><Select.Value /><ChevronDown className="size-4 text-muted-foreground" aria-hidden="true" /></Select.Trigger><Select.Portal><Select.Positioner className="z-50"><Select.Popup className="min-w-[var(--anchor-width)] border-2 border-border bg-popover p-1 text-popover-foreground shadow-[4px_4px_0_0_var(--border)] light:border-black light:bg-white light:shadow-[4px_4px_0_0_#000000]"><Select.Item value="gentleman" className="flex cursor-pointer px-2 py-1.5 font-mono text-sm focus:bg-accent">gentleman</Select.Item><Select.Item value="gentleman-neutral-artifacts" className="flex cursor-pointer px-2 py-1.5 font-mono text-sm focus:bg-accent">gentleman-neutral-artifacts</Select.Item><Select.Item value="neutral" className="flex cursor-pointer px-2 py-1.5 font-mono text-sm focus:bg-accent">neutral</Select.Item><Select.Item value="custom" className="flex cursor-pointer px-2 py-1.5 font-mono text-sm focus:bg-accent">custom</Select.Item></Select.Popup></Select.Positioner></Select.Portal></Select.Root></div>
        </CardContent>
        <CardFooter><button
          type="button"
          onClick={saveGentle}
          disabled={saving !== null}
          className="flex cursor-pointer items-center justify-center gap-2 border-2 border-border bg-primary px-4 py-2 font-mono text-sm font-bold uppercase tracking-wide text-primary-foreground shadow-[4px_4px_0_0_var(--border)] transition-all hover:shadow-[4px_4px_0_0_var(--primary)] disabled:pointer-events-none disabled:opacity-50 light:!border-black light:!bg-primary light:!text-white light:shadow-[4px_4px_0_0_#000000]"
        >
          {saving === "gentle-ai" && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
          {t("config_gentle_save")}
        </button></CardFooter>
        </Card>

        <Card>
        <CardHeader className="flex-row items-start justify-between gap-4 space-y-0"><div className="flex gap-3"><span className="flex size-9 items-center justify-center bg-primary/15 text-primary"><Settings2 className="size-4" aria-hidden="true" /></span><div><CardTitle className="font-mono text-sm font-bold uppercase">{t("config_opencode_title")}</CardTitle><p className="mt-1 text-sm text-muted-foreground">{t("config_opencode_description")}</p></div></div><Badge variant={openCodeConfigured ? "secondary" : "outline"} className={openCodeConfigured ? "text-success" : "text-muted-foreground"}>{t(openCodeConfigured ? "config_status_ready" : "config_status_incomplete")}</Badge></CardHeader>
        {catalogLoading && <CardContent className="pt-0"><div className="flex items-center justify-center gap-3 border-2 border-border bg-card p-4 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin text-primary" aria-hidden="true" /><span>{t("models_validationMessage")}</span></div></CardContent>}
        <CardContent className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <ConfigSelect id="config-agent" label={t("config_agent")} value={agentKey} options={agents} disabled={saving !== null} error={fieldErrors.agentKey} onChange={(value) => { setAgentKey(value); setFieldErrors((errors) => ({ ...errors, agentKey: undefined })); }} />
          <ConfigSelect id="config-provider" label={t("config_provider")} value={provider} options={providers} disabled={saving !== null || catalogLoading || catalogUnavailable} error={fieldErrors.provider} onChange={(value) => { setProvider(value); setModel(""); setVariant(""); setFieldErrors((errors) => ({ ...errors, provider: undefined, model: undefined, variant: undefined })); }} />
          <ConfigSelect id="config-model" label={t("config_model")} value={model} options={models} disabled={saving !== null || catalogLoading || catalogUnavailable || !provider} error={fieldErrors.model} onChange={(value) => { setModel(value); setVariant(""); setFieldErrors((errors) => ({ ...errors, model: undefined, variant: undefined })); }} />
          <ConfigSelect id="config-variant" label={t("config_variant")} value={variant} options={variants} disabled={saving !== null || catalogLoading || catalogUnavailable || !model} error={fieldErrors.variant} onChange={(value) => { setVariant(value); setFieldErrors((errors) => ({ ...errors, variant: undefined })); }} />
        </CardContent>
        <CardFooter><button
          type="button"
          onClick={saveOpenCode}
          disabled={saving !== null || catalogLoading || catalogUnavailable}
          className="flex cursor-pointer items-center justify-center gap-2 border-2 border-border bg-primary px-4 py-2 font-mono text-sm font-bold uppercase tracking-wide text-primary-foreground shadow-[4px_4px_0_0_var(--border)] transition-all hover:shadow-[4px_4px_0_0_var(--primary)] disabled:pointer-events-none disabled:opacity-50 light:!border-black light:!bg-primary light:!text-white light:shadow-[4px_4px_0_0_#000000]"
        >
          {saving === "opencode" && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
          {t("config_opencode_save")}
        </button></CardFooter>
        </Card>
      </div>
    </main>
  );
}
