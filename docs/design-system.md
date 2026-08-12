# PreSett Design System

This document defines the design system used across the PreSett application. All UI code must follow these rules.

## Overview

The design system is organized in layers:

1. **Tokens** — CSS custom properties in `src/app/globals.css`
2. **Primitives** — unstyled/styled components in `src/components/ui/`
3. **Atoms** — thin wrappers that map domain variant names to primitives
4. **Molecules / Organisms / Pages** — compose atoms and primitives; no raw HTML interactive elements

## Token System

Tokens are defined as OKLCH custom properties in `src/app/globals.css`. Always reference tokens with `var(--color-*)` or the Tailwind shorthand utilities (`bg-primary`, `text-muted-foreground`, etc.).

### Palette

| Token | Light | Dark | Usage |
|-------|-------|------|-------|
| `--color-background` | `oklch(1 0 0)` | `oklch(0.145 0 0)` | Page background |
| `--color-foreground` | `oklch(0.145 0 0)` | `oklch(0.985 0 0)` | Primary text |
| `--color-card` | `oklch(1 0 0)` | `oklch(0.205 0 0)` | Card backgrounds |
| `--color-card-foreground` | `oklch(0.145 0 0)` | `oklch(0.985 0 0)` | Card text |
| `--color-primary` | `oklch(0.55 0.22 25)` | `oklch(0.65 0.22 25)` | Primary actions |
| `--color-primary-foreground` | `oklch(0.985 0 0)` | `oklch(0.145 0 0)` | Text on primary |
| `--color-secondary` | `oklch(0.97 0 0)` | `oklch(0.269 0 0)` | Secondary surfaces |
| `--color-muted` | `oklch(0.97 0 0)` | `oklch(0.269 0 0)` | Muted backgrounds |
| `--color-muted-foreground` | `oklch(0.556 0 0)` | `oklch(0.708 0 0)` | Secondary text |
| `--color-accent` | `oklch(0.97 0 0)` | `oklch(0.269 0 0)` | Accent surfaces |
| `--color-destructive` | `oklch(0.577 0.245 27.325)` | `oklch(0.704 0.191 22.216)` | Errors / destructive actions |
| `--color-border` | `oklch(0.922 0 0)` | `oklch(0.269 0 0)` | Borders |
| `--color-input` | `oklch(0.922 0 0)` | `oklch(0.269 0 0)` | Input borders |
| `--color-success` | `oklch(0.6 0.15 145)` | `oklch(0.65 0.15 145)` | Success states |
| `--color-warning` | `oklch(0.7 0.15 85)` | `oklch(0.75 0.15 85)` | Warning states |
| `--color-info` | `oklch(0.6 0.15 245)` | `oklch(0.65 0.15 245)` | Info states |

### Typography

- **Sans**: Inter, loaded via `next/font/google` as `--font-inter`
- **Mono**: JetBrains Mono, loaded via `next/font/google` as `--font-mono-jb`
- Default body text uses the sans stack; code/mono values use the mono stack

### Spacing, Radii, and Shadows

| Token | Value | Usage |
|-------|-------|-------|
| `--radius-sm` | `calc(var(--radius) - 4px)` | Small corners |
| `--radius-md` | `calc(var(--radius) - 2px)` | Default corners |
| `--radius-lg` | `var(--radius)` | Large corners |
| `--radius-xl` | `calc(var(--radius) + 4px)` | Extra large corners |
| `--radius-2xl` | `calc(var(--radius) + 8px)` | Cards and tiles |
| `--radius-3xl` | `calc(var(--radius) + 12px)` | Shell containers |
| `--radius-4xl` | `calc(var(--radius) + 16px)` | Full panels |

Shadows use `shadow-foreground/5` and `shadow-md` from the token scale.

## Primitives

Primitives live in `src/components/ui/`. They are the only components allowed to render raw HTML interactive elements.

### Button

File: `src/components/ui/button.tsx`

- Variants: `default`, `outline`, `secondary`, `ghost`, `destructive`, `link`
- Sizes: `default`, `xs`, `sm`, `lg`, `icon`, `icon-xs`, `icon-sm`, `icon-lg`
- Supports `render` prop for polymorphic rendering (e.g. as `next/link`)

### Card

File: `src/components/ui/card.tsx`

- `Card`, `CardHeader`, `CardTitle`, `CardContent`, `CardFooter`
- Default classes: `rounded-xl border bg-card text-card-foreground shadow`

### Badge

File: `src/components/ui/badge.tsx`

- Variants: `default`, `secondary`, `destructive`, `outline`

### Input

File: `src/components/ui/input.tsx`

- Built on `@base-ui/react/input`
- Default classes include `border-input`, `focus-visible:ring-ring`

### Select

File: `src/components/ui/select.tsx`

- Re-exports `Select` from `@base-ui/react/select`
- Consumers style `Select.Trigger`, `Select.Popup`, and `Select.Item` with token classes

### Tooltip

File: `src/components/ui/tooltip.tsx`

- Namespaced as `Tooltip.Provider`, `Tooltip.Root`, `Tooltip.Trigger`, `Tooltip.Content`
- Styled popup with `bg-primary text-primary-foreground`

### Stat

File: `src/components/atoms/Stat/Stat.tsx`

- Composes `Card` primitives
- Props: `label`, `value`, `icon`, `trend?`, `className?`

## Rules

### 1. Primitives-only in views

No raw `<button>`, `<input>`, or `<select>` elements outside `src/components/ui/`.

Audit command:

```bash
grep -rn '<button\|<input\|<select' src/components/ src/app/ | grep -v 'src/components/ui/'
```

Expected output: empty.

### 2. No ad-hoc colors

Do not use raw Tailwind colors such as `zinc-*`, `rose-*`, `slate-*`, `orange-*`, or arbitrary hex values in view files. Use token utilities only:

- `bg-card`, `text-card-foreground`, `border-border`
- `bg-primary`, `text-primary-foreground`
- `bg-muted`, `text-muted-foreground`
- `bg-destructive`, `text-destructive-foreground`
- `bg-success`, `text-success`
- `bg-warning`, `text-warning`

### 3. No ad-hoc radii or shadows

Use the radius and shadow tokens:

- `rounded-md`, `rounded-lg`, `rounded-xl`, `rounded-2xl`, `rounded-3xl`
- `shadow-sm`, `shadow`, `shadow-md`

Avoid arbitrary radius values like `rounded-[10px]`.

### 4. All strings via `t()`

Every user-facing string must be defined in `src/resources/types.ts`, `src/resources/en.ts`, and `src/resources/es.ts`, and rendered with `t("key")`.

### 5. No barrel exports

Import primitives and atoms directly from their files, not from an index barrel.

## Theme System

The theme is managed by `next-themes` through `src/lib/theme-provider.tsx`.

- Attribute: `class`
- Storage key: `presett-theme`
- Default: `system` (respects OS preference)
- Toggle: `src/components/ui/theme-toggle.tsx` cycles between `light` and `dark`

Dark mode is applied via the `.dark` class on `<html>`, which switches the OKLCH token values in `globals.css`.

## Adding New Components

1. If it is a generic primitive, add it to `src/components/ui/`
2. If it maps domain variant names to primitive variants, add it to `src/components/atoms/`
3. If it uses interactive HTML, build it from a primitive — do not introduce new raw elements
4. Add i18n keys for all new strings
5. Run the audit command and ensure zero violations
