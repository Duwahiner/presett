"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Loader2, Settings2, Sparkles } from "lucide-react";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ErrorBanner } from "@/components/molecules/ErrorBanner/ErrorBanner";
import { getGlobalConfig, patchGlobalConfig } from "@/services/globalConfigApiService";
import { setLocale, t } from "@/resources/resources";
import type { Locale } from "@/types/state";

type OpenCodeField = "agentKey" | "model" | "variant";

export function resolveDisplayLocale(language: Locale | undefined, browserLanguage = typeof navigator === "undefined" ? "en" : navigator.language): Locale {
  return language ?? (browserLanguage.toLowerCase().startsWith("es") ? "es" : "en");
}

function FieldError({ id, message }: { id: string; message?: string }) {
  return message ? <p id={id} role="alert" className="text-xs text-destructive">{message}</p> : null;
}

export function GlobalConfigClient() {
  const [language, setLanguage] = useState<Locale>("en");
  const [persona, setPersona] = useState("");
  const [agentKey, setAgentKey] = useState("");
  const [model, setModel] = useState("");
  const [variant, setVariant] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<"gentle-ai" | "opencode" | null>(null);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<OpenCodeField, string>>>({});
  const agentInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    void getGlobalConfig().then((data) => {
      const locale = resolveDisplayLocale(data.gentleAi.language);
      setLocale(locale);
      setLanguage(locale);
      setPersona(data.gentleAi.persona ?? "");
      const assignment = data.assignments.find((item) => item.agentKey === data.defaultAgent) ?? data.assignments[0];
      if (assignment) {
        setAgentKey(assignment.agentKey);
        setModel(`${assignment.provider}/${assignment.model}`);
        setVariant(assignment.variant);
      }
    }).catch(() => setError(t("config_load_error"))).finally(() => setLoading(false));
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
    const values: Record<OpenCodeField, string> = { agentKey, model, variant };
    const errors = Object.fromEntries(Object.entries(values).filter(([, value]) => !value).map(([field]) => [field, t("config_field_required")])) as Partial<Record<OpenCodeField, string>>;
    setFieldErrors(errors);
    if (Object.keys(errors).length) {
      agentInput.current?.focus();
      return;
    }
    setError("");
    setSuccess("");
    setSaving("opencode");
    try {
      await patchGlobalConfig({ domain: "opencode", agentKey, model, variant });
      setSuccess(t("config_opencode_saved"));
    } catch {
      setError(t("config_opencode_error"));
    } finally {
      setSaving(null);
    }
  }

  const gentleConfigured = Boolean(language);
  const openCodeConfigured = Boolean(agentKey && model && variant);
  const isConfigured = gentleConfigured && openCodeConfigured;

  if (loading) return <Card className="mx-auto max-w-3xl"><CardContent className="flex items-center gap-3 p-6 text-muted-foreground" role="status"><Loader2 className="size-4 animate-spin text-primary" aria-hidden="true" />{t("config_loading")}</CardContent></Card>;

  return (
    <main>
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-3xl items-start gap-3 px-5 py-5 sm:px-7">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"><Settings2 className="size-5" aria-hidden="true" /></span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2"><h1 className="text-2xl font-semibold tracking-tight text-foreground">{t("config_title")}</h1><Badge variant={isConfigured ? "secondary" : "outline"} className={isConfigured ? "text-success" : "text-muted-foreground"}>{isConfigured && <Check className="size-3" aria-hidden="true" />}{t(isConfigured ? "config_status_ready" : "config_status_incomplete")}</Badge></div>
            <p className="mt-1 text-sm text-muted-foreground">{t("config_description")}</p>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-3xl space-y-5 p-5 sm:p-7">
        {error && <ErrorBanner title={t("errors_generic")} message={error} />}
        {success && <div role="status" className="flex items-center gap-2 rounded-lg border border-success/20 bg-success/10 px-4 py-3 text-sm text-success"><Check className="size-4" aria-hidden="true" />{success}</div>}

        <Card>
        <CardHeader className="flex-row items-start justify-between gap-4 space-y-0">
          <div className="flex gap-3"><span className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary"><Sparkles className="size-4" aria-hidden="true" /></span><div><CardTitle>{t("config_gentle_title")}</CardTitle><p className="mt-1 text-sm text-muted-foreground">{t("config_gentle_description")}</p></div></div>
          <Badge variant="outline" className="text-muted-foreground">{t("config_gentle_status")}</Badge>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5"><label htmlFor="config-language" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{t("config_language")}</label><Select.Root value={language} onValueChange={(value) => setLanguage((value ?? "en") as Locale)} disabled={saving !== null}><Select.Trigger id="config-language" className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 text-sm font-mono focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"><Select.Value /></Select.Trigger><Select.Portal><Select.Positioner className="z-50"><Select.Popup className="min-w-[var(--anchor-width)] rounded-md border bg-popover p-1 text-popover-foreground shadow-md"><Select.Item value="en" className="flex cursor-pointer rounded-sm px-2 py-1.5 text-sm focus:bg-accent">English</Select.Item><Select.Item value="es" className="flex cursor-pointer rounded-sm px-2 py-1.5 text-sm focus:bg-accent">Español</Select.Item></Select.Popup></Select.Positioner></Select.Portal></Select.Root></div>
          <div className="space-y-1.5"><label htmlFor="config-persona" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{t("config_persona")}</label><Input id="config-persona" value={persona} onChange={(event) => setPersona(event.target.value)} disabled={saving !== null} className="h-10 font-mono" /></div>
        </CardContent>
        <CardFooter><Button variant="outline" className="border-primary/30 text-primary hover:bg-primary/10 hover:text-primary" onClick={saveGentle} disabled={saving !== null}>{saving === "gentle-ai" && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}{t("config_gentle_save")}</Button></CardFooter>
        </Card>

        <Card>
        <CardHeader className="flex-row items-start justify-between gap-4 space-y-0"><div className="flex gap-3"><span className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary"><Settings2 className="size-4" aria-hidden="true" /></span><div><CardTitle>{t("config_opencode_title")}</CardTitle><p className="mt-1 text-sm text-muted-foreground">{t("config_opencode_description")}</p></div></div><Badge variant={openCodeConfigured ? "secondary" : "outline"} className={openCodeConfigured ? "text-success" : "text-muted-foreground"}>{t(openCodeConfigured ? "config_status_ready" : "config_status_incomplete")}</Badge></CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-1.5"><label htmlFor="config-agent" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{t("config_agent")}</label><Input ref={agentInput} id="config-agent" value={agentKey} onChange={(event) => { setAgentKey(event.target.value); setFieldErrors((errors) => ({ ...errors, agentKey: undefined })); }} disabled={saving !== null} aria-invalid={Boolean(fieldErrors.agentKey)} aria-describedby={fieldErrors.agentKey ? "config-agent-error" : undefined} className="h-10 font-mono" /><FieldError id="config-agent-error" message={fieldErrors.agentKey} /></div>
          <div className="space-y-1.5"><label htmlFor="config-model" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{t("config_model")}</label><Input id="config-model" value={model} onChange={(event) => { setModel(event.target.value); setFieldErrors((errors) => ({ ...errors, model: undefined })); }} disabled={saving !== null} aria-invalid={Boolean(fieldErrors.model)} aria-describedby={fieldErrors.model ? "config-model-error" : undefined} className="h-10 font-mono" /><FieldError id="config-model-error" message={fieldErrors.model} /></div>
          <div className="space-y-1.5"><label htmlFor="config-variant" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{t("config_variant")}</label><Input id="config-variant" value={variant} onChange={(event) => { setVariant(event.target.value); setFieldErrors((errors) => ({ ...errors, variant: undefined })); }} disabled={saving !== null} aria-invalid={Boolean(fieldErrors.variant)} aria-describedby={fieldErrors.variant ? "config-variant-error" : undefined} className="h-10 font-mono" /><FieldError id="config-variant-error" message={fieldErrors.variant} /></div>
        </CardContent>
        <CardFooter><Button variant="outline" className="border-primary/30 text-primary hover:bg-primary/10 hover:text-primary" onClick={saveOpenCode} disabled={saving !== null}>{saving === "opencode" && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}{t("config_opencode_save")}</Button></CardFooter>
        </Card>
      </div>
    </main>
  );
}
