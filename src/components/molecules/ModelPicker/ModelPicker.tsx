"use client";

import { useMemo, useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
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

interface PickerFieldProps {
  label: string;
  value: string;
  options: string[];
  placeholder: string;
  disabled?: boolean;
        onChange: (value: string | null) => void;
}

function PickerField({
  label,
  value,
  options,
  placeholder,
  disabled,
  onChange,
}: PickerFieldProps) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </label>
      <Select.Root value={value || null} onValueChange={onChange} disabled={disabled}>
        <Select.Trigger
          aria-label={label}
          className={cn(
            "flex h-9 w-full items-center justify-between border-2 border-border bg-transparent px-3 py-1 text-sm transition-colors",
            "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
            "disabled:cursor-not-allowed disabled:opacity-50 light:border-black",
          )}
        >
          <Select.Value placeholder={placeholder} />
          <ChevronDown className="size-4 text-muted-foreground" />
        </Select.Trigger>
        <Select.Portal>
          <Select.Positioner className="z-50">
            <Select.Popup
               className={cn(
                 "max-h-60 min-w-[var(--anchor-width)] overflow-auto border-2 border-border bg-popover p-1 text-popover-foreground shadow-[4px_4px_0_0_var(--border)] scrollbar-brutal",
                 "focus-visible:outline-none light:border-black",
               )}
            >
              {options.map((option) => (
                <Select.Item
                  key={option}
                  value={option}
                  className={cn(
                    "relative flex w-full cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none",
                    "focus:bg-accent focus:text-accent-foreground",
                  )}
                >
                  <span className="absolute left-2 flex size-3.5 items-center justify-center">
                    <Select.ItemIndicator>
                      <Check className="size-3" />
                    </Select.ItemIndicator>
                  </span>
                  <Select.ItemText className="pl-6">{option}</Select.ItemText>
                </Select.Item>
              ))}
            </Select.Popup>
          </Select.Positioner>
        </Select.Portal>
      </Select.Root>
    </div>
  );
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
        <PickerField
          label={t("modelPicker_provider")}
          value={provider}
          options={providers}
          placeholder={t("modelPicker_provider")}
          disabled={disabled}
          onChange={(value) => {
            setProvider(value ?? "");
            setModel("");
            setVariant("");
          }}
        />
        <PickerField
          label={t("modelPicker_model")}
          value={model}
          options={models}
          placeholder={t("modelPicker_model")}
          disabled={disabled || !provider}
          onChange={(value) => {
            setModel(value ?? "");
            setVariant("");
          }}
        />
        <PickerField
          label={t("modelPicker_variant")}
          value={variant}
          options={variants}
          placeholder={t("modelPicker_variant")}
          disabled={disabled || !model}
          onChange={(value) => setVariant(value ?? "")}
        />
      </div>

      <button
        type="button"
        disabled={disabled || !isValid}
        onClick={() => onConfirm({ provider, model, variant })}
        className="flex cursor-pointer items-center justify-center gap-2 border-2 border-border bg-primary px-4 py-3 font-mono text-sm font-bold uppercase tracking-wide text-primary-foreground shadow-[4px_4px_0_0_var(--border)] transition-all hover:shadow-[4px_4px_0_0_var(--primary)] disabled:pointer-events-none disabled:opacity-50 light:!border-black light:!bg-white light:!text-black light:shadow-[4px_4px_0_0_#000000]"
      >
        {t("modelPicker_save")}
      </button>
    </div>
  );
}
