"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/atoms/Button/Button";

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
    <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
      <select
        aria-label="Provider"
        className="rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100"
        value={provider}
        disabled={disabled}
        onChange={(e) => {
          setProvider(e.target.value);
          setModel("");
          setVariant("");
        }}
      >
        <option value="">Provider</option>
        {providers.map((p) => (
          <option key={p} value={p}>
            {p}
          </option>
        ))}
      </select>

      <select
        aria-label="Model"
        className="rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100"
        value={model}
        disabled={disabled || !provider}
        onChange={(e) => {
          setModel(e.target.value);
          setVariant("");
        }}
      >
        <option value="">Model</option>
        {models.map((m) => (
          <option key={m} value={m}>
            {m}
          </option>
        ))}
      </select>

      <select
        aria-label="Variant"
        className="rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100"
        value={variant}
        disabled={disabled || !model}
        onChange={(e) => setVariant(e.target.value)}
      >
        <option value="">Variant</option>
        {variants.map((v) => (
          <option key={v} value={v}>
            {v}
          </option>
        ))}
      </select>

      <Button
        disabled={disabled || !isValid}
        onClick={() => onConfirm({ provider, model, variant })}
      >
        Save
      </Button>
    </div>
  );
}
