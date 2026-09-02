"use client";

import { Button as UIButton } from "@/components/ui/button";
import type { ButtonProps, ButtonVariant, ButtonSize } from "./buttonTypes";

export function mapButtonVariant(
  variant?: ButtonVariant,
): "default" | "ghost" | "destructive" {
  switch (variant) {
    case "danger":
      return "destructive";
    case "ghost":
      return "ghost";
    case "primary":
    default:
      return "default";
  }
}

export function mapButtonSize(
  size?: ButtonSize,
): "default" | "sm" | "lg" {
  switch (size) {
    case "sm":
      return "sm";
    case "lg":
      return "lg";
    case "md":
    default:
      return "default";
  }
}

export function Button({
  className,
  variant = "primary",
  size = "md",
  render,
  children,
  ...props
}: ButtonProps) {
  return (
    <UIButton
      variant={mapButtonVariant(variant)}
      size={mapButtonSize(size)}
      render={render}
      className={className}
      {...props}
    >
      {children}
    </UIButton>
  );
}
