"use client";

import { Children, cloneElement, isValidElement } from "react";
import { cn } from "@/lib/utils";
import type { ButtonProps } from "./Button.types";

export function Button({
  className,
  asChild = false,
  children,
  ...props
}: ButtonProps) {
  const classes = cn(
    "inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium",
    "bg-rose-600 text-white hover:bg-rose-700 focus:outline-none focus:ring-2 focus:ring-rose-500",
    "disabled:pointer-events-none disabled:opacity-50",
    className,
  );

  if (asChild && isValidElement(children)) {
    const child = Children.only(children);
    return cloneElement(child, {
      className: cn(child.props.className, classes),
      ...props,
    });
  }

  return (
    <button className={classes} {...props}>
      {children}
    </button>
  );
}
