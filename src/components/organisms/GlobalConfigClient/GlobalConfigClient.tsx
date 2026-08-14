"use client";
import { useEffect, useState } from "react";
import { getGlobalConfig, patchGlobalConfig } from "@/services/globalConfigApiService";
import type { Locale } from "@/types/state";

export function resolveDisplayLocale(language: Locale | undefined, browserLanguage = typeof navigator === "undefined" ? "en" : navigator.language): Locale {
  return language ?? (browserLanguage.toLowerCase().startsWith("es") ? "es" : "en");
}

export function GlobalConfigClient() {
  const [language, setLanguage] = useState<Locale>("en");
  const [persona, setPersona] = useState("");
  const [agentKey, setAgentKey] = useState("");
  const [model, setModel] = useState("");
  const [variant, setVariant] = useState("");
  const [message, setMessage] = useState("");
  useEffect(() => { void getGlobalConfig().then((data) => { setLanguage(resolveDisplayLocale(data.gentleAi.language)); setPersona(data.gentleAi.persona ?? ""); const a = data.assignments.find((x) => x.agentKey === data.defaultAgent) ?? data.assignments[0]; if (a) { setAgentKey(a.agentKey); setModel(`${a.provider}/${a.model}`); setVariant(a.variant); } }).catch(() => setMessage("Unable to load configuration.")); }, []);
  async function saveGentle() { setMessage(""); try { await patchGlobalConfig({ domain: "gentle-ai", language, persona }); setMessage("Gentle-AI configuration saved."); } catch { setMessage("Unable to save Gentle-AI configuration."); } }
  async function saveOpenCode() { setMessage(""); try { await patchGlobalConfig({ domain: "opencode", agentKey, model, variant }); setMessage("OpenCode configuration saved."); } catch { setMessage("Unable to save OpenCode configuration."); } }
  return <div className="mx-auto max-w-3xl space-y-6 p-6"><header><h1 className="text-2xl font-semibold">Global configuration</h1><p className="text-muted-foreground">Manage Gentle-AI and OpenCode preferences independently.</p></header>{message && <p role="status">{message}</p>}<section className="space-y-3 rounded-xl border p-5"><h2 className="text-lg font-semibold">Gentle-AI</h2><label>Response language<select value={language} onChange={(e) => setLanguage(e.target.value as Locale)}><option value="en">English</option><option value="es">Español</option></select></label><label>Persona<input value={persona} onChange={(e) => setPersona(e.target.value)} /></label><button type="button" onClick={saveGentle}>Save Gentle-AI</button></section><section className="space-y-3 rounded-xl border p-5"><h2 className="text-lg font-semibold">OpenCode</h2><label>Agent<input value={agentKey} onChange={(e) => setAgentKey(e.target.value)} /></label><label>Model<input value={model} onChange={(e) => setModel(e.target.value)} /></label><label>Variant<input value={variant} onChange={(e) => setVariant(e.target.value)} /></label><button type="button" onClick={saveOpenCode}>Save OpenCode</button></section></div>;
}
