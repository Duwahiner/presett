"use client";

import { Toaster as SonnerToaster } from "sonner";
import { cn } from "@/lib/utils";

export function Toaster() {
  return (
    <SonnerToaster
      position="bottom-right"
      toastOptions={{
        className: cn(
          "rounded-xl border border-border bg-card text-card-foreground shadow-lg",
        ),
      }}
    />
  );
}
