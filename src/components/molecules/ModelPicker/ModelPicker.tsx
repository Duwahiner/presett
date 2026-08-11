"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/atoms/Button/Button";
import { t } from "@/resources/resources";

export type ModelCatalog = Record<string, Record<string, string[]>>;

export interface ModelPickerProps {
  catalog: ModelCatalog;
  initialProvider?: string;
  initialModel?: string;
  initialVariant?: string;
  disabled?: boolean;
  onConfirm: (assignment: {
    provider: string;
    model: string;
    variant: string;
  }) => void;
}

export function ModelPicker({
  catalog,
  initialProvider = "",
  initialModel = "",
  initialVariant = "",
  disabled,
  onConfirm,
}: ModelPickerProps) {
  const [provider, setProvider] = useState(initialProvider);
  const [model, setModel] = useState(initialModel);
  const [variant, setVariant] = useState(initialVariant);

  const providers = useMemo(() => Object.keys(catalog), [catalog]);
  const models = useMemo(
    () => Object.keys(catalog[provider] ?? {}),
    [catalog, provider],
  );
  const variants = useMemo(
    () => catalog[provider]?.[model] ?? [],
    [catalog, provider, model],
  );

  const isValid = provider && model && variant;

  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="space-y-1.5">
          <label
            htmlFor="model-picker-provider"
            className="text-xs font-medium uppercase tracking-wider text-zinc-400"
          >
            {t("modelPicker_provider")}
          </label>
          <select
            id="model-picker-provider"
            aria-label={t("modelPicker_provider")}
            className="w-full rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 focus:border-rose-500/50 focus:outline-none focus:ring-1 focus:ring-rose-500/30 disabled:opacity-50"
            value={provider}
            disabled={disabled}
            onChange={(e) => {
              setProvider(e.target.value);
              setModel("");
              setVariant("");
            }}
          >
            <option value="">{t("modelPicker_provider")}</option>
            {providers.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <label
            htmlFor="model-picker-model"
            className="text-xs font-medium uppercase tracking-wider text-zinc-400"
          >
            {t("modelPicker_model")}
          </label>
          <select
            id="model-picker-model"
            aria-label={t("modelPicker_model")}
            className="w-full rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 focus:border-rose-500/50 focus:outline-none focus:ring-1 focus:ring-rose-500/30 disabled:opacity-50"
            value={model}
            disabled={disabled || !provider}
            onChange={(e) => {
              setModel(e.target.value);
              setVariant("");
            }}
          >
            <option value="">{t("modelPicker_model")}</option>
            {models.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <label
            htmlFor="model-picker-variant"
            className="text-xs font-medium uppercase tracking-wider text-zinc-400"
          >
            {t("modelPicker_variant")}
          </label>
          <select
            id="model-picker-variant"
            aria-label={t("modelPicker_variant")}
            className="w-full rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 focus:border-rose-500/50 focus:outline-none focus:ring-1 focus:ring-rose-500/30 disabled:opacity-50"
            value={variant}
            disabled={disabled || !model}
            onChange={(e) => setVariant(e.target.value)}
          >
            <option value="">{t("modelPicker_variant")}</option>
            {variants.map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>
        </div>
      </div>

      <Button
        className="w-full"
        disabled={disabled || !isValid}
        onClick={() => onConfirm({ provider, model, variant })}
      >
        {t("modelPicker_save")}
      </Button>
    </div>
  );
}
