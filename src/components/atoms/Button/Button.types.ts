import type { ButtonHTMLAttributes } from "react";

export type ButtonVariant = "primary" | "ghost" | "danger";
export type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  render?: React.ReactElement;
}
